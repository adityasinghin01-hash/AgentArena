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
        .trim()
        .notEmpty()
        .withMessage('task is required')
        .isLength({ min: 5 })
        .withMessage('task must be at least 5 characters'),

    body('output')
        .trim()
        .notEmpty()
        .withMessage('output is required'),

    body('rubric')
        .trim()
        .notEmpty()
        .withMessage('rubric is required'),
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
