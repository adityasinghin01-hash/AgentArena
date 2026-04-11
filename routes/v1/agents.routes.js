// routes/v1/agents.routes.js
// Agent registry routes for the AgentArena marketplace.
// Mounted at /api/v1/agents in routes/v1/index.js.

const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const validateRequest = require('../../middleware/validateRequest');
const rateLimit = require('express-rate-limit');
const { protect: authMiddleware } = require('../../middleware/authMiddleware');
const { CATEGORIES, PRICING_TIERS } = require('../../models/Agent');
const {
    createAgent,
    listAgents,
    getAgent,
    getAgentsByCategory,
    updateAgent,
    deleteAgent,
    searchAgents,
} = require('../../controllers/agentController');

// ── Rate limiters ────────────────────────────────────────────
const agentReadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests. Please try again later.' },
});

const agentWriteLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests. Please try again later.' },
});

// ── Validation rules ─────────────────────────────────────────
const createAgentValidation = [
    body('name')
        .trim()
        .notEmpty().withMessage('Agent name is required.')
        .isLength({ min: 2, max: 100 }).withMessage('Agent name must be between 2 and 100 characters.'),
    body('description')
        .trim()
        .notEmpty().withMessage('Description is required.')
        .isLength({ min: 10, max: 500 }).withMessage('Description must be between 10 and 500 characters.'),
    body('category')
        .trim()
        .notEmpty().withMessage('Category is required.')
        .isIn(CATEGORIES).withMessage(`Category must be one of: ${CATEGORIES.join(', ')}`),
    body('systemPrompt')
        .trim()
        .notEmpty().withMessage('System prompt is required.')
        .isLength({ min: 10 }).withMessage('System prompt must be at least 10 characters.'),
    body('pricing')
        .optional()
        .trim()
        .isIn(PRICING_TIERS).withMessage(`Pricing must be one of: ${PRICING_TIERS.join(', ')}`),
    body('inputSchema')
        .optional(),
    body('outputSchema')
        .optional(),
];

const updateAgentValidation = [
    body('name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 }).withMessage('Agent name must be between 2 and 100 characters.'),
    body('description')
        .optional()
        .trim()
        .isLength({ min: 10, max: 500 }).withMessage('Description must be between 10 and 500 characters.'),
    body('category')
        .optional()
        .trim()
        .isIn(CATEGORIES).withMessage(`Category must be one of: ${CATEGORIES.join(', ')}`),
    body('systemPrompt')
        .optional()
        .trim()
        .isLength({ min: 10 }).withMessage('System prompt must be at least 10 characters.'),
    body('pricing')
        .optional()
        .trim()
        .isIn(PRICING_TIERS).withMessage(`Pricing must be one of: ${PRICING_TIERS.join(', ')}`),
    body('isActive')
        .optional()
        .isBoolean().withMessage('isActive must be a boolean.'),
];

const categoryParamValidation = [
    param('category')
        .trim()
        .isIn(CATEGORIES).withMessage(`Category must be one of: ${CATEGORIES.join(', ')}`),
];



// ── Public routes ────────────────────────────────────────────
// IMPORTANT: /search and /category/:category MUST come BEFORE /:id
router.get('/search', agentReadLimiter, searchAgents);
router.get('/category/:category', agentReadLimiter, categoryParamValidation, validateRequest, getAgentsByCategory);
router.get('/:id', agentReadLimiter, getAgent);
router.get('/', agentReadLimiter, listAgents);

// ── Protected routes ─────────────────────────────────────────
router.post('/', authMiddleware(), agentWriteLimiter, createAgentValidation, createAgent);
router.put('/:id', authMiddleware(), agentWriteLimiter, updateAgentValidation, updateAgent);
router.delete('/:id', authMiddleware(), agentWriteLimiter, deleteAgent);

module.exports = router;
