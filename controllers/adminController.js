// controllers/adminController.js
// Handles administrative actions protected by RBAC.

const User = require('../models/User');
const logger = require('../config/logger');
const { roles } = require('../config/roles');

/**
 * @route   GET /api/v1/admin/users
 * @desc    Get paginated list of all users
 * @access  Private (Requires READ_USERS permission)
 */
exports.getAllUsers = async (req, res, next) => {
    try {
        const rawPage = parseInt(req.query.page, 10);
        const rawLimit = parseInt(req.query.limit, 10);
        const MAX_PAGE = 1000;
        const page = Number.isFinite(rawPage) ? Math.min(Math.max(1, rawPage), MAX_PAGE) : 1;
        const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(100, rawLimit)) : 10;
        const skip = (page - 1) * limit;

        const users = await User.find()
            .select('-password -__v') // exclude sensitive/internal fields
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await User.countDocuments();

        res.status(200).json({
            success: true,
            count: users.length,
            total,
            page,
            totalPages: Math.ceil(total / limit),
            data: users
        });
    } catch (err) {
        logger.error('Error in getAllUsers:', err);
        next(err);
    }
};

/**
 * @route   PUT /api/v1/admin/users/:id/role
 * @desc    Change user role
 * @access  Private (Requires UPDATE_ROLE permission)
 */
exports.updateUserRole = async (req, res, next) => {
    try {
        const { role } = req.body;
        const targetUserId = req.params.id;

        // 1. Validate the requested role exists
        if (!Object.values(roles).includes(role)) {
            return res.status(400).json({ success: false, message: 'Invalid role specified' });
        }

        // 2. Prevent non-superadmins from granting or revoking superadmin status
        if (role === roles.SUPERADMIN && req.user.role !== roles.SUPERADMIN) {
            return res.status(403).json({ success: false, message: 'Only superadmins can grant superadmin privileges' });
        }

        const targetUser = await User.findById(targetUserId);
        if (!targetUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Protect existing superadmins from being demoted by regular admins
        if (targetUser.role === roles.SUPERADMIN && req.user.role !== roles.SUPERADMIN) {
            return res.status(403).json({ success: false, message: 'Cannot modify a superadmin account' });
        }

        // Prevent modifying oneself to avoid lockouts
        if (targetUser._id.toString() === req.user.id) {
            return res.status(400).json({ success: false, message: 'Cannot modify your own role' });
        }

        targetUser.role = role;
        await targetUser.save();

        logger.info(`Admin ${req.user.id} updated user ${targetUser._id} to role ${role}`);

        res.status(200).json({
            success: true,
            message: `User role updated to ${role}`,
            data: { id: targetUser._id, name: targetUser.name, role: targetUser.role }
        });
    } catch (err) {
        logger.error('Error in updateUserRole:', err);
        next(err);
    }
};

/**
 * @route   PUT /api/v1/admin/users/:id/ban
 * @desc    Ban or unban a user
 * @access  Private (Requires MODERATE_USERS permission)
 */
exports.toggleUserBan = async (req, res, next) => {
    try {
        const { isBanned } = req.body; // Expecting boolean

        if (typeof isBanned !== 'boolean') {
            return res.status(400).json({ success: false, message: 'isBanned must be a boolean' });
        }

        const targetUser = await User.findById(req.params.id);
        if (!targetUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Admins/Moderators cannot ban superadmins
        if (targetUser.role === roles.SUPERADMIN && req.user.role !== roles.SUPERADMIN) {
            return res.status(403).json({ success: false, message: 'Cannot ban a superadmin account' });
        }

        if (targetUser._id.toString() === req.user.id) {
            return res.status(400).json({ success: false, message: 'Cannot ban yourself' });
        }

        targetUser.isBanned = isBanned;
        await targetUser.save();

        logger.info(`Moderator ${req.user.id} ${isBanned ? 'banned' : 'unbanned'} user ${targetUser._id}`);

        res.status(200).json({
            success: true,
            message: `User successfully ${isBanned ? 'banned' : 'unbanned'}`,
            data: { id: targetUser._id, isBanned: targetUser.isBanned }
        });
    } catch (err) {
        logger.error('Error in toggleUserBan:', err);
        next(err);
    }
};

/**
 * @route   GET /api/v1/admin/stats
 * @desc    Get basic system statistics
 * @access  Private (Requires VIEW_STATS permission)
 */
exports.getSystemStats = async (req, res, next) => {
    try {
        const [totalUsers, verifiedUsers, bannedUsers] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ isVerified: true }),
            User.countDocuments({ isBanned: true })
        ]);

        // Count by role
        const roleDistribution = await User.aggregate([
            { $group: { _id: "$role", count: { $sum: 1 } } }
        ]);

        const formattedDistribution = {};
        roleDistribution.forEach(stat => {
            formattedDistribution[stat._id || 'user'] = stat.count;
        });

        res.status(200).json({
            success: true,
            data: {
                totalUsers,
                verifiedUsers,
                bannedUsers,
                roleDistribution: formattedDistribution
            }
        });
    } catch (err) {
        logger.error('Error in getSystemStats:', err);
        next(err);
    }
};
