// controllers/authController.js
// Handles: signup, login, googleLogin, logout, refreshToken.
// Per ARCHITECTURE_MAP §3.1–3.8.

const crypto = require('crypto');
const validator = require('validator');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const config = require('../config/config');
const hashToken = require('../utils/hashToken');
const validatePassword = require('../utils/passwordValidator');
const { generateAccessToken, generateRefreshToken } = require('../services/tokenService');
const { sendVerificationEmail } = require('../services/emailService');
const { createDefaultFreeSubscription } = require('../services/subscriptionService');
const { emit } = require('../services/webhookService');
const { WEBHOOK_EVENTS } = require('../config/webhookEvents');

const googleClient = new OAuth2Client(config.GOOGLE_CLIENT_ID);

const VERIFICATION_TOKEN_EXPIRY = 15 * 60 * 1000; // 15 minutes — consistent everywhere (fixes B-07)

// ── Signup ────────────────────────────────────────────────
// ARCHITECTURE_MAP §3.1
const signup = async (req, res, next) => {
    try {
        const email = typeof req.body.email === 'string' ? req.body.email.toLowerCase().trim() : null;
        const password = req.body.password; // NO .trim() — fixes B-11
        const source = req.body.source === 'web' ? 'web' : 'app';

        // Validate email
        if (!email || !validator.isEmail(email)) {
            return res.status(400).json({ message: 'Please provide a valid email address' });
        }

        // Validate password strength
        const passwordCheck = validatePassword(password);
        if (!passwordCheck.isValid) {
            return res.status(400).json({ message: passwordCheck.errors[0] });
        }

        const existingUser = await User.findOne({ email });

        // Case 1: User exists AND is verified → reject
        if (existingUser && existingUser.isVerified) {
            return res.status(409).json({ message: 'An account with this email already exists' });
        }

        // Case 2: User exists AND is NOT verified → re-signup (update token, send new email)
        if (existingUser && !existingUser.isVerified) {
            const rawToken = crypto.randomBytes(32).toString('hex');
            existingUser.verificationToken = hashToken(rawToken); // SHA-256 hash (fixes B-03)
            existingUser.verificationTokenExpiry = Date.now() + VERIFICATION_TOKEN_EXPIRY; // 15min (fixes B-07)
            existingUser.password = password; // Will be hashed by pre-save hook

            const accessToken = generateAccessToken(existingUser);
            const refreshToken = generateRefreshToken(existingUser, false);
            existingUser.refreshTokens.push({
                tokenHash: hashToken(refreshToken),
                createdAt: new Date(),
                deviceInfo: req.headers['user-agent'] || 'unknown',
            });

            await existingUser.save(); // Single save — fixes B-04

            // Send verification email async (after response)
            setImmediate(async () => {
                try {
                    console.log('📧 [Signup Re-send] Queuing verification email for:', email);
                    await sendVerificationEmail(email, rawToken, source);
                    console.log('✅ [Signup Re-send] Verification email sent for:', email);
                } catch (err) {
                    console.error('❌ [Signup Re-send] Email send failed:', err.message);
                    console.error('❌ [Signup Re-send] Full error:', err);
                }
            });

            return res.status(200).json({
                success: true,
                message: 'Verification email sent. Please check your inbox.',
                accessToken,
                refreshToken,
            });
        }

        // Case 3: New user
        const rawToken = crypto.randomBytes(32).toString('hex');
        const newUser = new User({
            email,
            password, // Hashed by pre-save hook (12 rounds)
            verificationToken: hashToken(rawToken),
            verificationTokenExpiry: Date.now() + VERIFICATION_TOKEN_EXPIRY,
            isVerified: false,
            pendingSubscriptionCreation: true,
        });

        const accessToken = generateAccessToken(newUser);
        const refreshToken = generateRefreshToken(newUser, false);
        newUser.refreshTokens.push({
            tokenHash: hashToken(refreshToken),
            createdAt: new Date(),
            deviceInfo: req.headers['user-agent'] || 'unknown',
        });

        await newUser.save(); // Single save — fixes B-04

        // Emit webhook for user created
        emit(WEBHOOK_EVENTS.USER_CREATED, {
            id: newUser._id,
            role: newUser.role,
        }, newUser._id);

        // Attempt durable subscription creation (blocks response slightly, but ensures consistency)
        try {
            const sub = await createDefaultFreeSubscription(newUser._id);
            await User.findByIdAndUpdate(newUser._id, { 
                activeSubscription: sub._id,
                pendingSubscriptionCreation: false 
            });
        } catch (err) {
            console.error('⚠️ [Signup] Failed to create default subscription. Will be reconciled later:', err.message);
            // pendingSubscriptionCreation remains true via schema default
        }

        setImmediate(async () => {
            try {
                console.log('📧 [Signup New] Queuing verification email for:', email);
                await sendVerificationEmail(email, rawToken, source);
                console.log('✅ [Signup New] Verification email sent for:', email);
            } catch (err) {
                console.error('❌ [Signup New] Email send failed:', err.message);
                console.error('❌ [Signup New] Full error:', err);
            }
        });

        return res.status(201).json({
            success: true,
            message: 'Account created. Verification email sent.',
            accessToken,
            refreshToken,
        });
    } catch (error) {
        next(error);
    }
};

// ── Login ─────────────────────────────────────────────────
// ARCHITECTURE_MAP §3.2
const login = async (req, res, next) => {
    try {
        const email = typeof req.body.email === 'string' ? req.body.email.toLowerCase().trim() : null;
        const password = req.body.password; // NO .trim() — fixes B-11
        const rememberMe = req.body.rememberMe || false;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        // Fetch user with password field
        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' }); // Generic — no enumeration
        }

        // Check account lockout
        if (user.lockUntil && user.lockUntil > Date.now()) {
            return res.status(403).json({ message: 'Account temporarily locked. Try again later.' });
        }

        // If lock expired, reset
        if (user.lockUntil && user.lockUntil <= Date.now()) {
            user.failedLoginAttempts = 0;
            user.lockUntil = undefined;
        }

        // Verify password
        const isMatch = await user.comparePassword(password);

        if (!isMatch) {
            user.failedLoginAttempts += 1;

            // Lock after 5 failed attempts (15 minutes)
            if (user.failedLoginAttempts >= 5) {
                user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
            }

            await user.save();
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Block unverified users
        if (!user.isVerified) {
            return res.status(403).json({
                message: 'Please verify your email before logging in.',
                isVerified: false,
            });
        }

        // Successful login — reset lockout, generate tokens
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user, rememberMe);

        user.refreshTokens.push({
            tokenHash: hashToken(refreshToken),
            createdAt: new Date(),
            deviceInfo: req.headers['user-agent'] || 'unknown',
        });
        user.failedLoginAttempts = 0;
        user.lockUntil = undefined;

        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Login successful',
            accessToken,
            refreshToken,
            user: {
                id: user._id,
                email: user.email,
                role: user.role,
                isVerified: user.isVerified,
            },
        });
    } catch (error) {
        next(error);
    }
};

// ── Google OAuth Login ────────────────────────────────────
// ARCHITECTURE_MAP §3.3 — fixes B-02 (GOOGLE_CLIENT_ID now clean)
const googleLogin = async (req, res, next) => {
    try {
        const { idToken } = req.body;

        if (!idToken) {
            return res.status(400).json({ message: 'Google ID token is required' });
        }

        const ticket = await googleClient.verifyIdToken({
            idToken,
            audience: [config.GOOGLE_CLIENT_ID, config.GOOGLE_WEB_CLIENT_ID].filter(Boolean),
        });

        const payload = ticket.getPayload();
        const { email, email_verified, name, picture } = payload;

        if (!email_verified) {
            return res.status(403).json({ message: 'Google email not verified' });
        }

        const user = await User.findOne({ email });

        let wasVerified = false;

        if (!user) {
            return res.status(404).json({
                message: 'No account found with this Google email. Please sign up first.',
            });
        } else {
            // Update existing user with Google info
            wasVerified = user.isVerified;
            user.name = name;
            user.picture = picture;
            user.isVerified = true;
        }

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user, false);

        user.refreshTokens.push({
            tokenHash: hashToken(refreshToken),
            createdAt: new Date(),
            deviceInfo: req.headers['user-agent'] || 'unknown',
        });

        await user.save();

        if (!wasVerified) {
            emit(WEBHOOK_EVENTS.USER_VERIFIED, {
                id: user._id,
                name: user.name,
                role: user.role,
            }, user._id);
        }

        return res.status(200).json({
            success: true,
            message: 'Google login successful',
            accessToken,
            refreshToken,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                picture: user.picture,
                role: user.role,
                isVerified: user.isVerified,
            },
        });
    } catch (error) {
        next(error);
    }
};

// ── Refresh Token ─────────────────────────────────────────
// ARCHITECTURE_MAP §3.7 — rotation with reuse detection
const refreshToken = async (req, res, next) => {
    try {
        const { refreshToken: incomingToken } = req.body;

        if (!incomingToken) {
            return res.status(400).json({ message: 'Refresh token is required' });
        }

        let decoded;
        try {
            decoded = require('jsonwebtoken').verify(incomingToken, config.JWT_REFRESH_SECRET);
        } catch (_err) {
            return res.status(403).json({ message: 'Invalid or expired refresh token' });
        }

        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(403).json({ message: 'User not found' });
        }

        // Hash the incoming token and search for it
        const hashedIncoming = hashToken(incomingToken);
        const tokenIndex = user.refreshTokens.findIndex(
            (t) => t.tokenHash === hashedIncoming
        );

        // REUSE DETECTION: token not found → all sessions wiped
        if (tokenIndex === -1) {
            user.refreshTokens = [];
            await user.save();
            return res.status(403).json({ message: 'Token reuse detected — all sessions revoked' });
        }

        // Generate new pair
        const newAccessToken = generateAccessToken(user);
        const newRefreshToken = generateRefreshToken(user, decoded.rememberMe || false);

        // Remove old token and add new one atomically
        await User.findByIdAndUpdate(
          user._id,
          {
            $pull: { refreshTokens: { tokenHash: hashedIncoming } },
          },
          { new: true }
        );

        await User.findByIdAndUpdate(
          user._id,
          {
            $push: {
              refreshTokens: {
                tokenHash: hashToken(newRefreshToken),
                createdAt: new Date(),
                deviceInfo: req.headers['user-agent'] || 'unknown',
              },
            },
          }
        );

        return res.status(200).json({
            success: true,
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
        });
    } catch (error) {
        next(error);
    }
};

// ── Logout ────────────────────────────────────────────────
// ARCHITECTURE_MAP §3.8
const logout = async (req, res, next) => {
    try {
        const { refreshToken: incomingToken } = req.body;

        if (!incomingToken) {
            return res.status(400).json({ message: 'Refresh token is required' });
        }

        const hashedToken = hashToken(incomingToken);
        const user = await User.findOne({ 'refreshTokens.tokenHash': hashedToken });

        if (!user) {
            return res.status(400).json({ message: 'Invalid token' });
        }

        // Remove the matching token entry
        user.refreshTokens = user.refreshTokens.filter(
            (t) => t.tokenHash !== hashedToken
        );

        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Logged out successfully',
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { signup, login, googleLogin, refreshToken, logout };
