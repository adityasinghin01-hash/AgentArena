// routes/v1/evaluate.routes.js
// Standalone evaluator route — scores any AI output against a rubric.

const express = require('express');
const { body } = require('express-validator');
const { protect } = require('../../middleware/authMiddleware');
const validateRequest = require('../../middleware/validateRequest');
const { evaluate } = require('../../controllers/evaluatorController');

const router = express.Router();

// ── Validators ───────────────────────────────────────────────
const evaluateValidation = [
    body('task')
        .isString()
        .bail()
        .trim()
        .notEmpty()
        .withMessage('task is required')
        .isLength({ min: 5, max: 2000 })
        .withMessage('task must be between 5 and 2000 characters'),

    // Output is NOT trimmed — exact text is preserved for accurate scoring
    body('output')
        .isString()
        .bail()
        .notEmpty()
        .withMessage('output is required')
        .isLength({ min: 1, max: 50000 })
        .withMessage('output must be between 1 and 50000 characters'),

    body('rubric')
        .isString()
        .bail()
        .trim()
        .notEmpty()
        .withMessage('rubric is required')
        .isLength({ min: 5, max: 5000 })
        .withMessage('rubric must be between 5 and 5000 characters'),
];

// ── Routes ───────────────────────────────────────────────────

// POST /api/v1/evaluate
router.post(
    '/',
    protect(),
    evaluateValidation,
    validateRequest,
    evaluate
);

module.exports = router;
