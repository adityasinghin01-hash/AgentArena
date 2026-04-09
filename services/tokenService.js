// services/tokenService.js
// JWT token generation — access tokens (15m) and refresh tokens (7d/30d).
// ARCHITECTURE_MAP §5: Token Architecture.
// Each token includes a random `jti` to guarantee uniqueness even within the same second.

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config/config');

const generateAccessToken = (user) => {
    return jwt.sign(
        {
            id: user._id,
            email: user.email,
            role: user.role, // Added role for RBAC
            isVerified: user.isVerified,
            jti: crypto.randomBytes(16).toString('hex'), // Ensures uniqueness
        },
        config.JWT_ACCESS_SECRET,
        { expiresIn: config.ACCESS_TOKEN_EXPIRES }
    );
};

const generateRefreshToken = (user, rememberMe = false) => {
    const expiresIn = rememberMe ? '30d' : config.REFRESH_TOKEN_EXPIRES;

    return jwt.sign(
        {
            id: user._id,
            email: user.email,
            role: user.role, // Added role for RBAC
            rememberMe,
            jti: crypto.randomBytes(16).toString('hex'), // Ensures uniqueness
        },
        config.JWT_REFRESH_SECRET,
        { expiresIn }
    );
};

module.exports = { generateAccessToken, generateRefreshToken };

