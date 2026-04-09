// routes/v1/webhooks.routes.js
// Routes for webhook management — CRUD, delivery history, and test dispatch.

const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { protect } = require('../../middleware/authMiddleware');
const {
  createWebhook,
  listWebhooks,
  getWebhook,
  updateWebhook,
  deleteWebhook,
  getDeliveryHistory,
  testWebhook,
} = require('../../controllers/webhookController');

// ── Validation Rules ─────────────────────────────────────

const createValidation = [
  body('url')
    .notEmpty().withMessage('URL is required.')
    .isString().withMessage('URL must be a string.')
    .isURL({ protocols: ['https'], require_protocol: true, require_tld: true })
    .withMessage('Webhook URL must be a valid HTTPS URL with a domain.'),
  body('events')
    .isArray({ min: 1 }).withMessage('Events must be an array with at least one event.'),
  body('events.*')
    .isString().withMessage('Each event must be a string.'),
  body('description')
    .optional()
    .isString().withMessage('Description must be a string.')
    .isLength({ max: 255 }).withMessage('Description cannot exceed 255 characters.'),
];

const updateValidation = [
  body('url')
    .optional()
    .isString().withMessage('URL must be a string.')
    .isURL({ protocols: ['https'], require_protocol: true, require_tld: true })
    .withMessage('Webhook URL must be a valid HTTPS URL with a domain.'),
  body('events')
    .optional()
    .isArray({ min: 1 }).withMessage('Events must be an array with at least one event.'),
  body('events.*')
    .isString().withMessage('Each event must be a string.'),
  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be a boolean.'),
  body('description')
    .optional()
    .isString().withMessage('Description must be a string.')
    .isLength({ max: 255 }).withMessage('Description cannot exceed 255 characters.'),
];

const idValidation = [
  param('id')
    .isMongoId().withMessage('Invalid webhook ID.'),
];

// ── Middleware ────────────────────────────────────────────

// All webhook routes require JWT authentication
router.use(protect());

// ── Routes ───────────────────────────────────────────────

router.post('/',               createValidation,                                    createWebhook);
router.get('/',                                                                     listWebhooks);
router.get('/:id',             idValidation,                                        getWebhook);
router.patch('/:id',           [...idValidation, ...updateValidation],              updateWebhook);
router.delete('/:id',          idValidation,                                        deleteWebhook);
router.get('/:id/deliveries',  idValidation,                                        getDeliveryHistory);
router.post('/:id/test',       idValidation,                                        testWebhook);

module.exports = router;

