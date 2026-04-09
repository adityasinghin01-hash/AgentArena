// routes/v1/admin.routes.js
// Protected routes for RBAC administrative actions.

const express = require('express');
const router = express.Router();
const { protect: authMiddleware } = require('../../middleware/authMiddleware');
const { authorize } = require('../../middleware/rbacMiddleware');
const { permissions } = require('../../config/roles');
const adminController = require('../../controllers/adminController');

// All admin routes require authentication
router.use(authMiddleware());

// Block banned users from all admin routes
router.use((req, res, next) => {
    if (req.user && req.user.isBanned) {
        return res.status(403).json({
            success: false,
            message: 'Forbidden: Account banned'
        });
    }
    next();
});

// ── GET /api/v1/admin/users
router.get(
    '/users',
    authorize(permissions.READ_USERS),
    adminController.getAllUsers
);

// ── PUT /api/v1/admin/users/:id/role
router.put(
    '/users/:id/role',
    authorize(permissions.UPDATE_ROLE),
    adminController.updateUserRole
);

// ── PUT /api/v1/admin/users/:id/ban
router.put(
    '/users/:id/ban',
    authorize(permissions.MODERATE_USERS),
    adminController.toggleUserBan
);

// ── GET /api/v1/admin/stats
router.get(
    '/stats',
    authorize(permissions.VIEW_STATS),
    adminController.getSystemStats
);

module.exports = router;
