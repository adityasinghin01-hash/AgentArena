// controllers/webhookController.js
// HTTP handlers for webhook CRUD and delivery history.

const { validationResult } = require('express-validator');
const Webhook = require('../models/Webhook');
const WebhookDelivery = require('../models/WebhookDelivery');
const { VALID_EVENTS } = require('../config/webhookEvents');
const { generateSecret, encryptSecret, dispatchWithRetry } = require('../services/webhookService');
const logger = require('../config/logger');

/**
 * @desc    Create a new webhook endpoint
 * @route   POST /api/v1/webhooks
 * @access  Private (JWT)
 */
exports.createWebhook = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const { url, events, description } = req.body;

    // Validate every event against the canonical set
    const invalidEvents = events.filter((e) => !VALID_EVENTS.has(e));
    if (invalidEvents.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid event(s): ${invalidEvents.join(', ')}`,
      });
    }

    const rawSecret = generateSecret();
    const encrypted = encryptSecret(rawSecret);

    const webhook = await Webhook.create({
      userId: req.user.id,
      url,
      events,
      encryptedSecret: encrypted,
      description: description || '',
    });

    logger.info('Webhook created', { webhookId: webhook._id, userId: req.user.id });

    res.status(201).json({
      success: true,
      message: 'Webhook created. Save the secret — it will not be shown again.',
      data: {
        webhook: {
          id: webhook._id,
          url: webhook.url,
          events: webhook.events,
          description: webhook.description,
          isActive: webhook.isActive,
          createdAt: webhook.createdAt,
        },
        rawSecret,
      },
    });
  } catch (error) {
    logger.error('Error creating webhook:', error);
    next(error);
  }
};

/**
 * @desc    List all webhooks for the authenticated user
 * @route   GET /api/v1/webhooks
 * @access  Private (JWT)
 */
exports.listWebhooks = async (req, res, next) => {
  try {
    const webhooks = await Webhook.find({ userId: req.user.id })
      .select('-encryptedSecret -__v')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: webhooks.length,
      data: webhooks,
    });
  } catch (error) {
    logger.error('Error listing webhooks:', error);
    next(error);
  }
};

/**
 * @desc    Get a single webhook by ID
 * @route   GET /api/v1/webhooks/:id
 * @access  Private (JWT)
 */
exports.getWebhook = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const webhook = await Webhook.findOne({
      _id: req.params.id,
      userId: req.user.id,
    }).select('-encryptedSecret -__v');

    if (!webhook) {
      return res.status(404).json({ success: false, message: 'Webhook not found.' });
    }

    res.status(200).json({ success: true, data: webhook });
  } catch (error) {
    logger.error('Error getting webhook:', error);
    next(error);
  }
};

/**
 * @desc    Update a webhook (url, events, description, isActive)
 * @route   PATCH /api/v1/webhooks/:id
 * @access  Private (JWT)
 */
exports.updateWebhook = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const webhook = await Webhook.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!webhook) {
      return res.status(404).json({ success: false, message: 'Webhook not found.' });
    }

    const { url, events, description, isActive } = req.body;

    // Validate events if provided
    if (events) {
      const invalidEvents = events.filter((e) => !VALID_EVENTS.has(e));
      if (invalidEvents.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid event(s): ${invalidEvents.join(', ')}`,
        });
      }
      webhook.events = events;
    }

    if (url !== undefined) {webhook.url = url;}
    if (description !== undefined) {webhook.description = description;}
    if (isActive !== undefined) {webhook.isActive = isActive;}

    await webhook.save();

    logger.info('Webhook updated', { webhookId: webhook._id, userId: req.user.id });

    // Strip encryptedSecret before responding
    const response = webhook.toObject();
    delete response.encryptedSecret;
    delete response.__v;

    res.status(200).json({ success: true, data: response });
  } catch (error) {
    logger.error('Error updating webhook:', error);
    next(error);
  }
};

/**
 * @desc    Delete a webhook (hard delete)
 * @route   DELETE /api/v1/webhooks/:id
 * @access  Private (JWT)
 */
exports.deleteWebhook = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const webhook = await Webhook.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!webhook) {
      return res.status(404).json({ success: false, message: 'Webhook not found.' });
    }

    // Best-effort cleanup of orphaned delivery records
    try {
      const { deletedCount } = await WebhookDelivery.deleteMany({ webhookId: webhook._id });
      logger.info('Webhook deleted', {
        webhookId: webhook._id,
        userId: req.user.id,
        deliveriesDeleted: deletedCount,
      });
    } catch (cleanupErr) {
      logger.error('Failed to clean up delivery records (webhook already deleted)', {
        webhookId: webhook._id,
        error: cleanupErr.message,
      });
    }

    res.status(200).json({ success: true, message: 'Webhook deleted successfully.' });
  } catch (error) {
    logger.error('Error deleting webhook:', error);
    next(error);
  }
};

/**
 * @desc    Get delivery history for a webhook
 * @route   GET /api/v1/webhooks/:id/deliveries
 * @access  Private (JWT)
 */
exports.getDeliveryHistory = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    // Ownership check
    const webhook = await Webhook.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!webhook) {
      return res.status(404).json({ success: false, message: 'Webhook not found.' });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const [deliveries, total] = await Promise.all([
      WebhookDelivery.find({ webhookId: webhook._id })
        .sort({ deliveredAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-__v'),
      WebhookDelivery.countDocuments({ webhookId: webhook._id }),
    ]);

    res.status(200).json({
      success: true,
      count: deliveries.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      data: deliveries,
    });
  } catch (error) {
    logger.error('Error getting delivery history:', error);
    next(error);
  }
};

/**
 * @desc    Send a test event to a webhook endpoint
 * @route   POST /api/v1/webhooks/:id/test
 * @access  Private (JWT)
 */
exports.testWebhook = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const webhook = await Webhook.findOne({
      _id: req.params.id,
      userId: req.user.id,
      isActive: true,
    });

    if (!webhook) {
      return res.status(404).json({ success: false, message: 'Webhook not found or inactive.' });
    }

    // Dispatch directly to this specific webhook — not via emit() which broadcasts to ALL user webhooks
    dispatchWithRetry(webhook, 'webhook.test', { message: 'Test delivery from Adv_Backend' }).catch((err) => {
      logger.error('Test webhook dispatch error', { webhookId: webhook._id, error: err.message });
    });

    logger.info('Webhook test triggered', { webhookId: webhook._id, userId: req.user.id });

    res.status(200).json({
      success: true,
      message: 'Test event dispatched. Check delivery history for results.',
    });
  } catch (error) {
    logger.error('Error testing webhook:', error);
    next(error);
  }
};
