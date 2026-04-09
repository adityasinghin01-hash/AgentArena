// routes/v1/verification.routes.js
// Verification routes — verify-email, resend-verification, check-verification-status.
// Mounted at /api/v1/ by the v1 router.

const express = require('express');
const router = express.Router();
const verificationController = require('../../controllers/verificationController');
const { authLimiter } = require('../../middleware/rateLimiter');

// GET /api/verify-email?token=<rawToken> — no per-route limiter (global only)
router.get('/verify-email', verificationController.verifyEmail);

// POST /api/resend-verification — authLimiter (prevents email spam)
router.post('/resend-verification', authLimiter, verificationController.resendVerification);

// GET /api/check-verification-status?email=<email> — no per-route limiter (global only)
router.get('/check-verification-status', verificationController.checkVerificationStatus);

module.exports = router;
