const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { subscribe, unsubscribe, getSubscribers } = require('../../controllers/newsletterController');
const rateLimit = require('express-rate-limit');
const { protect: authMiddleware } = require('../../middleware/authMiddleware');
const { authorize } = require('../../middleware/rbacMiddleware');
const { permissions } = require('../../config/roles');

// Rate limiter — 5 requests per hour per IP
const newsletterLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Please try again later.' },
});

// Validation rules
const subscribeValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Please provide a valid email address.')
    .normalizeEmail({ gmail_remove_dots: false }),
];

// Public routes
router.post('/subscribe', newsletterLimiter, subscribeValidation, subscribe);
router.get('/unsubscribe', unsubscribe);

// Admin only routes
router.get('/subscribers', authMiddleware(), authorize(permissions.READ_USERS), getSubscribers);

module.exports = router;
