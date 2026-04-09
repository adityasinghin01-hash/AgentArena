// routes/v1/subscription.routes.js
// Routes for the subscription & plan system.

const express = require('express');
const router = express.Router();
const { protect: authMiddleware } = require('../../middleware/authMiddleware');
const subscriptionController = require('../../controllers/subscriptionController');

// ── GET /api/v1/subscriptions/plans — Public
router.get('/plans', subscriptionController.listPlans);

// ── All routes below require authentication ──────────────
router.use(authMiddleware());

// ── GET /api/v1/subscriptions/current — Private
router.get('/current', subscriptionController.getCurrentPlan);

// ── PUT /api/v1/subscriptions/change — Private
router.put('/change', subscriptionController.changePlan);

// ── GET /api/v1/subscriptions/usage — Private
router.get('/usage', subscriptionController.getUsageSummary);

module.exports = router;
