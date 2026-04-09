// routes/v1/audition.routes.js
// Audition routes — run pipeline auditions with SSE, fetch results.

const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { protect } = require('../../middleware/authMiddleware');
const {
    run,
    getAudition,
    getAuditionsByPipeline,
} = require('../../controllers/auditionController');

const router = express.Router();

// ── Shared validation handler ────────────────────────────────
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array().map((e) => ({
                field: e.path,
                message: e.msg,
            })),
        });
    }
    return next();
};

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
    handleValidationErrors,
    run
);

// GET /api/v1/audition/pipeline/:pipelineId — all auditions for a pipeline
router.get(
    '/pipeline/:pipelineId',
    protect(),
    pipelineIdValidation,
    handleValidationErrors,
    getAuditionsByPipeline
);

// GET /api/v1/audition/:id — single audition
router.get(
    '/:id',
    protect(),
    auditionIdValidation,
    handleValidationErrors,
    getAudition
);

module.exports = router;
