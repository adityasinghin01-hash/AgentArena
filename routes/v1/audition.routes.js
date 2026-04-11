// routes/v1/audition.routes.js
// Audition routes — run pipeline auditions with SSE, fetch results.

const express = require('express');
const { body, param } = require('express-validator');
const { protect } = require('../../middleware/authMiddleware');
const validateRequest = require('../../middleware/validateRequest');
const {
    run,
    getAudition,
    getAuditionsByPipeline,
    getUserAuditions,
    getAgentBattleHistory,
} = require('../../controllers/auditionController');

const router = express.Router();

// ── Validators ───────────────────────────────────────────────
const runAuditionValidation = [
    param('pipelineId')
        .isMongoId()
        .withMessage('Invalid pipeline ID'),
    body('userInput')
        .trim()
        .notEmpty()
        .withMessage('userInput is required')
        .isLength({ min: 5 })
        .withMessage('userInput must be at least 5 characters'),
];

const auditionIdValidation = [
    param('id')
        .isMongoId()
        .withMessage('Invalid audition ID'),
];

const pipelineIdValidation = [
    param('pipelineId')
        .isMongoId()
        .withMessage('Invalid pipeline ID'),
];

// ── Routes ───────────────────────────────────────────────────

// POST /api/v1/audition/run/:pipelineId — SSE stream
router.post(
    '/run/:pipelineId',
    protect(),
    runAuditionValidation,
    validateRequest,
    run
);

// GET /api/v1/audition/my — user's battle history (MUST be before /:id)
router.get(
    '/my',
    protect(),
    getUserAuditions
);

// GET /api/v1/audition/agent/:agentId — public agent battle history
router.get(
    '/agent/:agentId',
    getAgentBattleHistory
);

// GET /api/v1/audition/pipeline/:pipelineId — all auditions for a pipeline
router.get(
    '/pipeline/:pipelineId',
    protect(),
    pipelineIdValidation,
    validateRequest,
    getAuditionsByPipeline
);

// GET /api/v1/audition/:id — single audition
router.get(
    '/:id',
    protect(),
    auditionIdValidation,
    validateRequest,
    getAudition
);

module.exports = router;
