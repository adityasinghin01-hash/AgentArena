// routes/v1/outcome.routes.js
// Outcome decomposition routes — takes user's goal, returns AI-generated agent slots.

const express = require('express');
const { body } = require('express-validator');
const { protect } = require('../../middleware/authMiddleware');
const validateRequest = require('../../middleware/validateRequest');
const { decompose } = require('../../controllers/outcomeController');

const router = express.Router();

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
    validateRequest,
    decompose
);

module.exports = router;
