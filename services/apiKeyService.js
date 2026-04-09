// services/apiKeyService.js
// Handles secure generation, plan enforcement, and atomic rotation of API keys.

const crypto = require('crypto');
const mongoose = require('mongoose');
const ApiKey = require('../models/ApiKey');
const Subscription = require('../models/Subscription');
const config = require('../config/config');

const KEY_PREFIX = 'sk_live_';

/**
 * Generate a new raw key, extract UI prefix, and create the HMAC SHA-256 hash.
 * Throws if API_KEY_SALT is not configured — prevents running with a default/empty salt.
 */
const generateKeyData = () => {
    // Fail fast if salt is missing — critical security requirement
    if (!config.API_KEY_SALT) {
        throw new Error('API_KEY_SALT is required. Cannot hash API keys without a configured salt.');
    }

    // Generate secure random bytes (e.g., 48 base64 characters, filtering non-alphanumerics)
    const rawSecret = crypto.randomBytes(36).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
    const rawKey = `${KEY_PREFIX}${rawSecret}`;
    
    // The prefix saved to DB is the first 8 characters after 'sk_live_'
    const prefixHash = rawSecret.substring(0, 8);
    const storedPrefix = `${KEY_PREFIX}${prefixHash}`;

    // HMAC SHA-256 Hash
    const keyHash = crypto
        .createHmac('sha256', config.API_KEY_SALT)
        .update(rawKey)
        .digest('hex');

    return { rawKey, storedPrefix, keyHash };
};

/**
 * Create a new API key while enforcing plan limitations.
 * Uses a MongoDB session/transaction to atomically check the count and create
 * the key, preventing concurrent over-allocation race conditions.
 */
exports.createApiKey = async (userId, name, scopes = ['api:read']) => {
    // Verify user plan and limits (outside transaction — read-only)
    const activeSub = await Subscription.findOne({ userId, status: 'active' }).populate('planId');
    if (!activeSub || !activeSub.planId) {
        const err = new Error('User does not have an active subscription');
        err.statusCode = 403;
        throw err;
    }

    const { maxApiKeys } = activeSub.planId.limits;

    // Generate keys securely (will throw if salt is missing)
    const { rawKey, storedPrefix, keyHash } = generateKeyData();

    // Atomic count-and-create inside a transaction to prevent race conditions
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        if (maxApiKeys !== -1) {
            const currentActiveKeys = await ApiKey.countDocuments({ userId, isActive: true }).session(session);
            if (currentActiveKeys >= maxApiKeys) {
                const err = new Error(`Plan limit reached: Maximum of ${maxApiKeys} API key(s) allowed on the ${activeSub.planId.displayName} plan.`);
                err.statusCode = 429;
                throw err;
            }
        }

        const [apiKeyDoc] = await ApiKey.create([{
            userId,
            name,
            keyHash,
            keyPrefix: storedPrefix,
            scopes,
        }], { session });

        await session.commitTransaction();
        return { rawKey, apiKeyDoc };
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};

/**
 * Replace an active API Key with a newly generated one atomically.
 */
exports.rotateApiKey = async (userId, oldKeyId) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const oldKey = await ApiKey.findOne({ _id: oldKeyId, userId, isActive: true }).session(session);
        
        if (!oldKey) {
            const err = new Error('API Key not found or already inactive');
            err.statusCode = 404;
            throw err;
        }

        // Deactivate old key
        oldKey.isActive = false;
        await oldKey.save({ session });

        // Generate and create identically configured replacement
        const { rawKey, storedPrefix, keyHash } = generateKeyData();

        const [newApiKeyDoc] = await ApiKey.create([{
            userId,
            name: `${oldKey.name} (Rotated)`,
            keyHash,
            keyPrefix: storedPrefix,
            scopes: oldKey.scopes,
        }], { session });

        await session.commitTransaction();
        return { rawKey, newApiKeyDoc };
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};
