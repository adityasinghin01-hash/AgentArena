// routes/v1/outcome.routes.js
// Outcome decomposition routes — takes user's goal, returns AI-generated agent slots.

const express = require('express');
const { body, validationResult } = require('express-validator');
const { protect } = require('../../middleware/authMiddleware');
const { decompose } = require('../../controllers/outcomeController');

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
const decomposeValidation = [
    body('outcomeText')
        .trim()
        .notEmpty()
        .withMessage('outcomeText is required')
        .isLength({ min: 10 })
        .withMessage('outcomeText must be at least 10 characters'),
];

// ── Routes ───────────────────────────────────────────────────

// POST /api/v1/outcome/decompose
router.post(
    '/decompose',
    protect(),
    decomposeValidation,
    handleValidationErrors,
    decompose
);

module.exports = router;
