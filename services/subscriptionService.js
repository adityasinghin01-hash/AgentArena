// services/subscriptionService.js
// Core subscription business logic: default plan assignment, limit enforcement, usage tracking.

const Plan = require('../models/Plan');
const Subscription = require('../models/Subscription');
const logger = require('../config/logger');

/**
 * Creates a default free subscription for a newly registered user.
 * Called during signup (authController).
 * @param {string} userId - The MongoDB ObjectId of the new user.
 * @returns {Object} The created subscription document.
 */
const createDefaultFreeSubscription = async (userId) => {
    const freePlan = await Plan.findOne({ name: 'free', isActive: true });

    if (!freePlan) {
        logger.error('Free plan not found in database — cannot assign default subscription.');
        throw new Error('Free plan not configured. Please run the seed-plans script.');
    }

    // Check if user already has an active subscription (idempotent)
    const now = new Date();
    
    try {
        const subscription = await Subscription.findOneAndUpdate(
            { userId, status: 'active' },
            {
                $setOnInsert: {
                    userId,
                    planId: freePlan._id,
                    status: 'active',
                    currentPeriodStart: now,
                    currentPeriodEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days
                    cancelAtPeriodEnd: false,
                    usage: { apiCalls: 0, storage: 0 },
                }
            },
            { upsert: true, returnDocument: 'after' }
        );

        logger.info(`Default free subscription ensured for user ${userId}`);
        return subscription;
    } catch (err) {
        // If duplicate key error (11000) race condition occurs, return existing
        if (err.code === 11000) {
            logger.info(`User ${userId} already has an active subscription — returning existing.`);
            return await Subscription.findOne({ userId, status: 'active' });
        }
        throw err;
    }
};

/**
 * Checks if a user's usage is within their plan limit for a given key.
 * @param {string} userId - The user's MongoDB ObjectId.
 * @param {string} limitKey - The limit to check (e.g., 'apiCallsPerMonth').
 * @param {number} [amount=1] - The amount to reserve/increment.
 * @returns {{ allowed: boolean, currentUsage: number, limit: number }}
 */
const enforceLimit = async (userId, limitKey, amount = 1) => {
    const subscription = await Subscription.findOne({
        userId,
        status: 'active',
    }).populate('planId');

    if (!subscription || !subscription.planId) {
        return { allowed: false, currentUsage: 0, limit: 0, reason: 'No active subscription' };
    }

    const limit = subscription.planId.limits[limitKey];

    // -1 = unlimited
    if (limit === -1) {
        return { allowed: true, currentUsage: 0, limit: -1 };
    }

    const usageKeyMap = {
        apiCallsPerMonth: 'apiCalls',
        storageGB: 'storage',
    };

    const usageField = usageKeyMap[limitKey];
    if (!usageField) {
        return { allowed: false, currentUsage: 0, limit, reason: 'Unsupported rate-limited key' };
    }

    const maxAllowed = limitKey === 'storageGB' ? limit * 1024 : limit;
    const updateFields = `usage.${usageField}`;

    // Atomic conditional increment: only reserve if enough quota remains
    const updatedSub = await Subscription.findOneAndUpdate(
        {
            _id: subscription._id,
            status: 'active',
            [updateFields]: { $lte: maxAllowed - amount }
        },
        { $inc: { [updateFields]: amount } },
        { returnDocument: 'after' }
    );

    if (updatedSub) {
        return {
            allowed: true,
            currentUsage: updatedSub.usage[usageField],
            limit,
            remaining: Math.max(0, maxAllowed - updatedSub.usage[usageField]),
        };
    } else {
        // The increment would exceed the limit — fetch current value to return exactly where they are at
        const currentSub = await Subscription.findById(subscription._id);
        const currentUsage = currentSub.usage[usageField];
        return {
            allowed: false,
            currentUsage,
            limit,
            remaining: Math.max(0, maxAllowed - currentUsage),
        };
    }
};

/**
 * Increments a usage counter for the user's active subscription.
 * @param {string} userId - The user's MongoDB ObjectId.
 * @param {string} usageKey - The usage field to increment (e.g., 'apiCalls', 'storage').
 * @param {number} [amount=1] - The amount to increment by.
 * @returns {Object|null} The updated subscription or null if not found.
 */
const trackUsage = async (userId, usageKey, amount = 1) => {
    const allowedKeys = ['apiCalls', 'storage'];
    if (!allowedKeys.includes(usageKey)) {
        throw new Error(`Invalid usageKey. Must be one of: ${allowedKeys.join(', ')}`);
    }
    if (!Number.isInteger(amount) || amount <= 0) {
        throw new Error('amount must be a positive integer greater than 0');
    }

    const updateField = `usage.${usageKey}`;

    const subscription = await Subscription.findOneAndUpdate(
        { userId, status: 'active' },
        { $inc: { [updateField]: amount } },
        { returnDocument: 'after' }
    );

    if (!subscription) {
        logger.warn(`trackUsage: No active subscription found for user ${userId}`);
        return null;
    }

    return subscription;
};

module.exports = {
    createDefaultFreeSubscription,
    enforceLimit,
    trackUsage,
};
