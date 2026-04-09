// models/User.js
// Full User schema per ARCHITECTURE_MAP §2.
// Includes: identity, verification, password reset, security, sessions.

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { roles } = require('../config/roles');

const userSchema = new mongoose.Schema(
    {
        // ── Identity ──────────────────────────────────────────
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },

        password: {
            type: String,
            required: function () {
                return this.provider === 'local';
            },
            select: false, // Task 23: Never leaked in queries unless explicitly requested
        },

        provider: {
            type: String,
            enum: ['local', 'google'],
            default: 'local',
        },

        name: {
            type: String,
            trim: true,
        },

        picture: {
            type: String, // Google profile picture URL
        },

        // ── Role & Moderation ─────────────────────────────────
        role: {
            type: String,
            enum: Object.values(roles), // ['user', 'moderator', 'admin', 'superadmin']
            default: roles.USER,
        },

        isBanned: {
            type: Boolean,
            default: false,
        },

        // ── Subscription ─────────────────────────────────────
        activeSubscription: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Subscription',
            default: null,
        },
        pendingSubscriptionCreation: {
            type: Boolean,
            default: true,
        },

        // ── Verification ──────────────────────────────────────
        isVerified: {
            type: Boolean,
            default: false,
        },

        verificationToken: {
            type: String, // Task 25: SHA-256 hash of the raw token (NEVER raw — fixes B-03)
        },

        verificationTokenExpiry: {
            type: Date,
        },

        // ── Password Reset ────────────────────────────────────
        resetToken: {
            type: String, // Task 25: SHA-256 hash of the raw token
        },

        resetTokenExpiry: {
            type: Date,
        },

        // ── OTP (for forgot-password flow) ───────────────────────
        otpCode: {
            type: String, // SHA-256 hash of the 6-digit code
        },

        otpExpiry: {
            type: Date,
        },

        // ── Security ──────────────────────────────────────────
        failedLoginAttempts: {
            type: Number,
            default: 0,
        },

        lockUntil: {
            type: Date, // Account locked until this timestamp
        },

        // ── Sessions ─────────────────────────────────────────
        // Task 24: Array of objects, not raw strings (fixes B-04/old structure)
        refreshTokens: [
            {
                tokenHash: {
                    type: String, // SHA-256 hash of the JWT refresh token
                    required: true,
                },
                createdAt: {
                    type: Date,
                    default: Date.now,
                },
                deviceInfo: {
                    type: String, // User-Agent string or 'unknown'
                    default: 'unknown',
                },
            },
        ],
    },
    {
        timestamps: true, // Adds createdAt and updatedAt
    }
);

// ── Pre-Save Hook ─────────────────────────────────────────
// Task 26: bcrypt 12 rounds, ONLY runs when password is modified.
// Fixes B-04: no double-hashing on second save since isModified check returns false.
userSchema.pre('save', async function () {
    if (!this.isModified('password')) {return;}
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
});

// ── Instance Methods ──────────────────────────────────────
// Task 27: Compare candidate password against stored hash.
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
