// config/roles.js
// Defines system roles and their permissions for RBAC enforcement.

const roles = {
    USER: 'user',
    MODERATOR: 'moderator',
    ADMIN: 'admin',
    SUPERADMIN: 'superadmin'
};

const permissions = {
    // ── Basic Permissions ─────────────────────────────────
    READ_PROFILE: 'READ_PROFILE',
    UPDATE_PROFILE: 'UPDATE_PROFILE',

    // ── Community / Blog ──────────────────────────────────
    CREATE_POST: 'CREATE_POST',
    UPDATE_OWN_POST: 'UPDATE_OWN_POST',
    DELETE_OWN_POST: 'DELETE_OWN_POST',
    MODERATE_POSTS: 'MODERATE_POSTS',   // Edit/delete ANY post
    MODERATE_USERS: 'MODERATE_USERS',   // Ban/unban users

    // ── Admin Permissions ─────────────────────────────────
    READ_USERS: 'READ_USERS',           // View user lists
    UPDATE_ROLE: 'UPDATE_ROLE',         // Change user roles (up to admin)
    VIEW_STATS: 'VIEW_STATS',           // View system stats
    
    // ── Superadmin Exclusives ─────────────────────────────
    MANAGE_ADMINS: 'MANAGE_ADMINS',     // Can demote/promote admins
    SYSTEM_CONFIG: 'SYSTEM_CONFIG'      // Manage critical system settings
};

const rolePermissions = {
    [roles.USER]: [
        permissions.READ_PROFILE,
        permissions.UPDATE_PROFILE,
        permissions.CREATE_POST,
        permissions.UPDATE_OWN_POST,
        permissions.DELETE_OWN_POST
    ],
    [roles.MODERATOR]: [
        permissions.READ_PROFILE,
        permissions.UPDATE_PROFILE,
        permissions.CREATE_POST,
        permissions.UPDATE_OWN_POST,
        permissions.DELETE_OWN_POST,
        permissions.MODERATE_POSTS,
        permissions.MODERATE_USERS
    ],
    [roles.ADMIN]: [
        permissions.READ_PROFILE,
        permissions.UPDATE_PROFILE,
        permissions.CREATE_POST,
        permissions.UPDATE_OWN_POST,
        permissions.DELETE_OWN_POST,
        permissions.MODERATE_POSTS,
        permissions.MODERATE_USERS,
        permissions.READ_USERS,
        permissions.UPDATE_ROLE,
        permissions.VIEW_STATS
    ],
    [roles.SUPERADMIN]: [
        // Superadmin typically gets all permissions natively, but we specify them here for explicitness
        permissions.READ_PROFILE,
        permissions.UPDATE_PROFILE,
        permissions.CREATE_POST,
        permissions.UPDATE_OWN_POST,
        permissions.DELETE_OWN_POST,
        permissions.MODERATE_POSTS,
        permissions.MODERATE_USERS,
        permissions.READ_USERS,
        permissions.UPDATE_ROLE,
        permissions.VIEW_STATS,
        permissions.MANAGE_ADMINS,
        permissions.SYSTEM_CONFIG
    ]
};

module.exports = {
    roles,
    permissions,
    rolePermissions
};
