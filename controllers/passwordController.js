// controllers/passwordController.js
// Handles: forgotPassword, resetPassword, renderResetPage.
// Per ARCHITECTURE_MAP §3.9–3.10.
// Fixes B-05 (enforce token expiry), B-03 (hash tokens), B-18 pattern (generic responses).

const crypto = require('crypto');
const validator = require('validator');
const config = require('../config/config');
const User = require('../models/User');
const hashToken = require('../utils/hashToken');
const validatePassword = require('../utils/passwordValidator');
const { sendPasswordResetEmail, sendOtpEmail } = require('../services/emailService');

const RESET_TOKEN_EXPIRY = 15 * 60 * 1000; // 15 minutes

// ── Forgot Password ──────────────────────────────────────
// ARCHITECTURE_MAP §3.9
// POST /api/forgot-password { email }
// Generic response regardless of user existence — prevents enumeration.
const forgotPassword = async (req, res, next) => {
    try {
        const email = req.body.email?.toLowerCase()?.trim();

        if (!email || !validator.isEmail(email)) {
            return res.status(400).json({ message: 'Please provide a valid email address' });
        }

        const user = await User.findOne({ email });

        // Generic response for non-existent users (no enumeration)
        if (!user) {
            return res.status(200).json({
                success: true,
                message: 'If an account exists with this email, a password reset link has been sent.',
            });
        }

        // Generate reset token
        const rawToken = crypto.randomBytes(32).toString('hex');
        user.resetToken = hashToken(rawToken); // SHA-256 hash (fixes B-03 pattern)
        user.resetTokenExpiry = Date.now() + RESET_TOKEN_EXPIRY;

        await user.save();

        // Send password reset email with deep link
        await sendPasswordResetEmail(email, rawToken);

        return res.status(200).json({
            success: true,
            message: 'If an account exists with this email, a password reset link has been sent.',
        });
    } catch (error) {
        next(error);
    }
};

// ── Reset Password ───────────────────────────────────────
// ARCHITECTURE_MAP §3.10
// POST /api/reset-password { token, newPassword }
const resetPassword = async (req, res, next) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({ message: 'Token and new password are required' });
        }

        // Hash the incoming token to compare with DB
        const hashedToken = hashToken(token);

        // Query with expiry check (fixes B-05)
        const user = await User.findOne({
            resetToken: hashedToken,
            resetTokenExpiry: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired reset token' });
        }

        // Validate new password strength
        const passwordCheck = validatePassword(newPassword);
        if (!passwordCheck.isValid) {
            return res.status(400).json({ message: passwordCheck.errors[0] });
        }

        // Update password (pre-save hook will hash it with bcrypt)
        user.password = newPassword;

        // Clear reset token fields
        user.resetToken = undefined;
        user.resetTokenExpiry = undefined;

        // Reset lockout (in case they were locked out)
        user.failedLoginAttempts = 0;
        user.lockUntil = undefined;

        // Clear ALL refresh tokens — force re-login on all devices
        user.refreshTokens = [];

        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Password reset successful. Please log in with your new password.',
        });
    } catch (error) {
        next(error);
    }
};

// ── Render Reset Password Page ───────────────────────────
// GET /api/reset-password?token=<rawToken>
// Returns a beautiful HTML page with button that deep links into app.
const renderResetPage = async (req, res, next) => {
    try {
        const { token } = req.query;

        const errorHtml = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Link Expired</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;background:linear-gradient(135deg,#f093fb,#f5576c);min-height:100vh;display:flex;align-items:center;justify-content:center}.card{background:white;border-radius:20px;padding:50px 40px;text-align:center;max-width:420px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.2)}.icon{font-size:64px;margin-bottom:20px}h1{color:#333;font-size:26px;margin-bottom:12px}p{color:#666;font-size:15px;line-height:1.6;margin-bottom:30px}.btn{background:linear-gradient(135deg,#f093fb,#f5576c);color:white;text-decoration:none;padding:16px 40px;border-radius:10px;font-size:16px;font-weight:600;display:inline-block}</style>
</head>
<body>
<div class="card">
  <div class="icon">❌</div>
  <h1>Link Expired</h1>
  <p>This password reset link is invalid or has expired. Please request a new one from the app.</p>
  <a href="${config.CLIENT_URL}/forgot-password" class="btn">Back to App →</a>
</div>
</body>
</html>`;

        if (!token) {return res.status(400).send(errorHtml);}

        const hashedToken = hashToken(token);
        const user = await User.findOne({
            resetToken: hashedToken,
            resetTokenExpiry: { $gt: Date.now() },
        });

        if (!user) {return res.status(400).send(errorHtml);}

        return res.status(200).send(`<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Reset Password</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;background:linear-gradient(135deg,#667eea,#764ba2);min-height:100vh;display:flex;align-items:center;justify-content:center}.card{background:white;border-radius:20px;padding:50px 40px;text-align:center;max-width:420px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.2)}.icon{font-size:64px;margin-bottom:20px}h1{color:#333;font-size:26px;margin-bottom:12px}p{color:#666;font-size:15px;line-height:1.6;margin-bottom:30px}.btn{background:linear-gradient(135deg,#667eea,#764ba2);color:white;text-decoration:none;padding:16px 40px;border-radius:10px;font-size:16px;font-weight:600;display:inline-block}</style>
</head>
<body>
<div class="card">
  <div class="icon">🔑</div>
  <h1>Reset Your Password</h1>
  <p>Your reset link is valid. Tap the button below to open the app and set your new password.</p>
  <a href="${config.CLIENT_URL}/reset-password?token=${token}" class="btn">Reset Password →</a>
</div>
</body>
</html>`);
    } catch (error) {
        next(error);
    }
};

// ── Send OTP ─────────────────────────────────────────────
// POST /api/send-otp { email }
const sendOtp = async (req, res, next) => {
    try {
        const email = req.body.email?.toLowerCase()?.trim();

        if (!email || !validator.isEmail(email)) {
            return res.status(400).json({ message: 'Please provide a valid email address' });
        }

        const user = await User.findOne({ email });

        // Generic response — prevents enumeration
        if (!user) {
            return res.status(200).json({
                success: true,
                message: 'If an account exists, a reset code has been sent.',
            });
        }

        // Generate 6-digit OTP
        const rawOtp = Math.floor(10000 + Math.random() * 90000).toString();
        user.otpCode = hashToken(rawOtp);
        user.otpExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes

        await user.save();

        try {
            await sendOtpEmail(email, rawOtp);
            console.log('✅ OTP email sent to:', email);
        } catch (err) {
            console.error('❌ OTP email failed:', err.message);
        }

        return res.status(200).json({
            success: true,
            message: 'If an account exists, a reset code has been sent.',
        });
    } catch (error) {
        next(error);
    }
};

// ── Verify OTP ────────────────────────────────────────────
// POST /api/verify-otp { email, otp }
// Returns a one-time resetToken the app uses to call POST /api/reset-password
const verifyOtp = async (req, res, next) => {
    try {
        const email = req.body.email?.toLowerCase()?.trim();
        const otp = req.body.otp?.trim();

        if (!email || !otp) {
            return res.status(400).json({ message: 'Email and OTP are required' });
        }

        const hashedOtp = hashToken(otp);

        const user = await User.findOne({
            email,
            otpCode: hashedOtp,
            otpExpiry: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired code. Please try again.' });
        }

        // OTP is valid — generate a short-lived reset token
        const rawToken = crypto.randomBytes(32).toString('hex');
        user.resetToken = hashToken(rawToken);
        user.resetTokenExpiry = Date.now() + 15 * 60 * 1000;

        // Clear OTP fields — single use only
        user.otpCode = undefined;
        user.otpExpiry = undefined;

        await user.save();

        return res.status(200).json({
            success: true,
            resetToken: rawToken,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { forgotPassword, resetPassword, renderResetPage, sendOtp, verifyOtp };
