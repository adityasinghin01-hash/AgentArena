// routes/v1/pipeline.routes.js
// Pipeline CRUD routes — create from slots, fetch by ID, list user's pipelines.

const express = require('express');
const { body, param } = require('express-validator');
const { protect } = require('../../middleware/authMiddleware');
const validateRequest = require('../../middleware/validateRequest');
const {
    createPipeline,
    getPipeline,
    getMyPipelines,
} = require('../../controllers/pipelineController');

const router = express.Router();

// ── Slot field normalizer ────────────────────────────────────
// The AI decomposer returns evaluation_criteria (snake_case)
// but our schema/validation uses evaluationCriteria (camelCase).
const normalizeSlotsMiddleware = (req, _res, next) => {
    if (Array.isArray(req.body.slots)) {
        req.body.slots = req.body.slots.map((slot) => ({
            ...slot,
            evaluationCriteria: slot.evaluationCriteria || slot.evaluation_criteria || '',
        }));
    }
    next();
};

// ── Validators ───────────────────────────────────────────────
const createPipelineValidation = [
    normalizeSlotsMiddleware,
    body('outcomeText')
        .trim()
        .notEmpty()
        .withMessage('outcomeText is required')
        .isLength({ min: 10 })
        .withMessage('outcomeText must be at least 10 characters'),

    body('slots')
        .isArray({ min: 1 })
        .withMessage('slots must be an array with at least 1 slot'),

    body('slots.*.name')
        .trim()
        .notEmpty()
        .withMessage('Each slot must have a name'),

    body('slots.*.task')
        .trim()
        .notEmpty()
        .withMessage('Each slot must have a task'),

    body('slots.*.evaluationCriteria')
        .optional({ values: 'falsy' })
        .trim(),

    body('slots.*.assignedAgents')
        .optional()
        .isArray()
        .withMessage('assignedAgents must be an array if provided'),

    body('slots.*.assignedAgents.*')
        .optional()
        .isMongoId()
        .withMessage('Each assignedAgent must be a valid ID'),
];

const pipelineIdValidation = [
    param('id')
        .isMongoId()
        .withMessage('Invalid pipeline ID'),
];

// ── Routes ───────────────────────────────────────────────────

// POST /api/v1/pipeline/create
router.post(
    '/create',
    protect(),
    createPipelineValidation,
    validateRequest,
    createPipeline
);

// GET /api/v1/pipeline/user/mine — must be BEFORE /:id to avoid "mine" matching as an id
router.get(
    '/user/mine',
    protect(),
    getMyPipelines
);

// GET /api/v1/pipeline/:id
router.get(
    '/:id',
    protect(),
    pipelineIdValidation,
    validateRequest,
    getPipeline
);

module.exports = router;
