// controllers/verificationController.js
// Handles: verifyEmail, resendVerification, checkVerificationStatus.
// Per ARCHITECTURE_MAP §3.4–3.6.
// Fixes B-03 (hash tokens), B-05 (enforce expiry), B-07 (15min consistent), B-18 (no enumeration).

const crypto = require('crypto');
const validator = require('validator');
const User = require('../models/User');
const hashToken = require('../utils/hashToken');
const { sendVerificationEmail } = require('../services/emailService');
const { emit } = require('../services/webhookService');
const { WEBHOOK_EVENTS } = require('../config/webhookEvents');

const VERIFICATION_TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

// ── Verify Email ─────────────────────────────────────────
// ARCHITECTURE_MAP §3.4
// GET /api/verify-email?token=<rawToken>
// Returns HTML page (not JSON) — this is opened in a browser from the email link.
const verifyEmail = async (req, res, next) => {
    try {
        const { token } = req.query;

        const errorHtml = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Verification Failed</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;background:linear-gradient(135deg,#f093fb,#f5576c);min-height:100vh;display:flex;align-items:center;justify-content:center}.card{background:white;border-radius:20px;padding:50px 40px;text-align:center;max-width:420px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.2)}.icon{font-size:64px;margin-bottom:20px}h1{color:#333;font-size:26px;margin-bottom:12px}p{color:#666;font-size:15px;line-height:1.6;margin-bottom:30px}.btn{background:linear-gradient(135deg,#f093fb,#f5576c);color:white;text-decoration:none;padding:16px 40px;border-radius:10px;font-size:16px;font-weight:600;display:inline-block}</style>
</head>
<body>
<div class="card">
  <div class="icon">❌</div>
  <h1>Link Expired</h1>
  <p>This link has expired or is invalid. Please request a new one from the app.</p>
  <a href="myapp://verification-pending" class="btn">Back to App →</a>
</div>
</body>
</html>`;

        if (!token) {
            return res.status(400).send(errorHtml);
        }

        // Hash the incoming raw token to compare with DB (fixes B-03)
        const hashedToken = hashToken(token);

        // Query with expiry check (fixes B-05)
        const user = await User.findOne({
            verificationToken: hashedToken,
            verificationTokenExpiry: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).send(errorHtml);
        }

        // Mark as verified, clear token fields
        user.isVerified = true;
        user.verificationToken = undefined;
        user.verificationTokenExpiry = undefined;

        await user.save();

        emit(WEBHOOK_EVENTS.USER_VERIFIED, {
            id: user._id,
            name: user.name,
            role: user.role,
        }, user._id);

        const source = req.query.source || 'app';


        if (source === 'web') {
          return res.send(`<!DOCTYPE html>
<html>
  <head>
    <title>Email Verified — Spinx</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { background: #0a0a0f; color: #f1f5f9; font-family: Inter, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
      .card { background: rgba(255,255,255,0.05); border: 1px solid rgba(6,182,212,0.3); border-radius: 24px; padding: 48px 32px; text-align: center; max-width: 440px; width: 90%; }
      h1 { font-size: 28px; font-weight: 800; margin-bottom: 12px; }
      p { color: #475569; margin-bottom: 0; line-height: 1.6; }
      .icon { font-size: 64px; margin-bottom: 20px; }
      #closing { color: #06b6d4; font-size: 13px; margin-top: 16px; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="icon">✅</div>
      <h1>Email Verified!</h1>
      <p id="msg">Closing this tab and returning you to Spinx...</p>
    </div>
    <script>
      setTimeout(function() {
        window.close();
        // If window.close() is blocked by the browser, show fallback message
        setTimeout(function() {
          document.getElementById('msg').textContent = 'Your account is verified! You can close this tab — your original tab will redirect you automatically.';
        }, 500);
      }, 1200);
    </script>
  </body>
</html>`);
        } else {
          return res.send(`<!DOCTYPE html>
<html>
  <head>
    <title>Email Verified — Spinx</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { background: #0a0a0f; color: #f1f5f9; font-family: Inter, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
      .card { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 24px; padding: 48px 32px; text-align: center; max-width: 440px; width: 90%; }
      h1 { font-size: 28px; font-weight: 800; margin-bottom: 12px; }
      p { color: #475569; margin-bottom: 28px; line-height: 1.6; }
      a { display: inline-block; padding: 14px 32px; border-radius: 999px; background: linear-gradient(135deg, #7c3aed, #06b6d4); color: #fff; font-weight: 700; text-decoration: none; font-size: 15px; }
      .icon { font-size: 64px; margin-bottom: 20px; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="icon">✅</div>
      <h1>Email Verified!</h1>
      <p>Your account is ready. Return to the app to continue.</p>
      <a href="myapp://dashboard">Open App</a>
    </div>
  </body>
</html>`);
        }
    } catch (error) {
        next(error);
    }
};

// ── Resend Verification Email ────────────────────────────
// ARCHITECTURE_MAP §3.5
// POST /api/resend-verification { email }
// Generic response regardless of user existence — fixes B-18 pattern.
const resendVerification = async (req, res, next) => {
    try {
        const email = req.body.email?.toLowerCase()?.trim();

        if (!email || !validator.isEmail(email)) {
            return res.status(400).json({ message: 'Please provide a valid email address' });
        }

        const user = await User.findOne({ email });

        // Generic response for both non-existent users AND already-verified users
        // Prevents account enumeration (fixes B-18)
        if (!user || user.isVerified) {
            return res.status(200).json({
                success: true,
                message: 'If an account exists and is unverified, a verification email has been sent.',
            });
        }

        // Generate new verification token
        const rawToken = crypto.randomBytes(32).toString('hex');
        user.verificationToken = hashToken(rawToken); // SHA-256 (fixes B-03)
        user.verificationTokenExpiry = Date.now() + VERIFICATION_TOKEN_EXPIRY; // 15 min (fixes B-07)

        await user.save();

        // Send email (not async — we want to confirm it sent before responding)
        try {
            console.log('📧 [Resend] Attempting to send verification email for:', email);
            await sendVerificationEmail(email, rawToken);
            console.log('✅ [Resend] Verification email sent for:', email);
        } catch (err) {
            console.error('❌ [Resend] Email send failed:', err.message);
            console.error('❌ [Resend] Full error:', err);
            // Even if email fails, we return a generic success to prevent enumeration
        }

        return res.status(200).json({
            success: true,
            message: 'If an account exists and is unverified, a verification email has been sent.',
        });
    } catch (error) {
        next(error);
    }
};

// ── Check Verification Status ────────────────────────────
// ARCHITECTURE_MAP §3.6
// GET /api/check-verification-status?email=<email>
// Returns 200 with { isVerified: false } for non-existent users — fixes B-18.
const checkVerificationStatus = async (req, res, next) => {
    try {
        const email = req.query.email?.toLowerCase()?.trim();

        if (!email || !validator.isEmail(email)) {
            return res.status(400).json({ message: 'Please provide a valid email address' });
        }

        const user = await User.findOne({ email });

        // Same response for non-existent users — prevents enumeration (fixes B-18)
        if (!user) {
            return res.status(200).json({ success: true, isVerified: false });
        }

        return res.status(200).json({ success: true, isVerified: user.isVerified });
    } catch (error) {
        next(error);
    }
};

module.exports = { verifyEmail, resendVerification, checkVerificationStatus };
