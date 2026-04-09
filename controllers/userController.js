// controllers/userController.js
// Handles: getProfile, getDashboard.
// Per ARCHITECTURE_MAP §4: User Routes (Protected).
// Fixes B-06 (dashboard reads from DB document, not JWT payload).
// Fixes B-22 (profile logic in controller, not inline in routes).

// ── Get Profile ──────────────────────────────────────────
// ARCHITECTURE_MAP §4: User Routes
// GET /api/profile — protected by `protect` middleware
// req.user is a full Mongoose document fetched from DB by protect middleware.
const getProfile = async (req, res, next) => {
    try {
        const user = req.user; // Mongoose document — NOT JWT payload (fixes B-06, B-22)

        return res.status(200).json({
            success: true,
            user: {
                id: user._id,
                email: user.email,
                name: user.name || null,
                picture: user.picture || null,
                provider: user.provider,
                isVerified: user.isVerified,
                createdAt: user.createdAt,
            },
        });
    } catch (error) {
        next(error);
    }
};

// ── Get Dashboard ────────────────────────────────────────
// ARCHITECTURE_MAP §4: User Routes
// GET /api/dashboard — protected by `protect` middleware
// Fixes B-06: reads refreshTokens.length from the REAL DB document,
// not from JWT payload (which doesn't contain refreshTokens).
const getDashboard = async (req, res, next) => {
    try {
        const user = req.user; // Mongoose document from DB

        return res.status(200).json({
            success: true,
            email: user.email,
            isVerified: user.isVerified,
            activeSessions: user.refreshTokens.length, // Real count from DB (fixes B-06)
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { getProfile, getDashboard };
