const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { joinWaitlist, getWaitlist, exportWaitlist } = require('../../controllers/waitlistController');
const rateLimit = require('express-rate-limit');
const { protect: authMiddleware } = require('../../middleware/authMiddleware');
const { authorize } = require('../../middleware/rbacMiddleware');
const { permissions } = require('../../config/roles');

// Rate limiter — 5 requests per hour per IP
const waitlistLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Please try again later.' },
});

// Validation rules
const joinValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required.')
    .isLength({ max: 100 }).withMessage('Name must be under 100 characters.'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Please provide a valid email address.')
    .normalizeEmail({ gmail_remove_dots: false }),
];

// Public routes
router.post('/join', waitlistLimiter, joinValidation, joinWaitlist);

// Admin only routes
router.get('/', authMiddleware(), authorize(permissions.READ_USERS), getWaitlist);
router.get('/export', authMiddleware(), authorize(permissions.READ_USERS), exportWaitlist);

module.exports = router;
