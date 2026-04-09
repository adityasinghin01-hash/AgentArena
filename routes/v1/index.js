// routes/v1/index.js
// Central v1 API router — mounts all versioned route modules.
// Mounted at /api/v1 in app.js.
// Health check stays unversioned at /api/health (for Render probe).

const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const verificationRoutes = require('./verification.routes');
const passwordRoutes = require('./password.routes');
const userRoutes = require('./user.routes');
const contactRoutes = require('./contact.routes');
const newsletterRoutes = require('./newsletter.routes');
const waitlistRoutes = require('./waitlist.routes');
const blogRoutes = require('./blog.routes');
const adminRoutes = require('./admin.routes');
const subscriptionRoutes = require('./subscription.routes');
const apiKeyRoutes = require('./apikeys.routes');
const webhookRoutes = require('./webhooks.routes');
const agentRoutes = require('./agents.routes');
const outcomeRoutes = require('./outcome.routes');
const pipelineRoutes = require('./pipeline.routes');
const auditionRoutes = require('./audition.routes');

// ── Auth ─────────────────────────────────────────────────
router.use('/', authRoutes);

// ── Verification ─────────────────────────────────────────
router.use('/', verificationRoutes);

// ── Password ─────────────────────────────────────────────
router.use('/password', passwordRoutes);

// ── User (protected) ────────────────────────────────────
router.use('/', userRoutes);

// ── Contact ──────────────────────────────────────────────
router.use('/contact', contactRoutes);

// ── Newsletter ───────────────────────────────────────────
router.use('/newsletter', newsletterRoutes);

// ── Waitlist ─────────────────────────────────────────────
router.use('/waitlist', waitlistRoutes);

// ── Blog ─────────────────────────────────────────────────
router.use('/blog', blogRoutes);

// ── Admin ────────────────────────────────────────────────
router.use('/admin', adminRoutes);

// ── Subscriptions ────────────────────────────────────────
router.use('/subscriptions', subscriptionRoutes);

// ── API Keys ─────────────────────────────────────────────
router.use('/apikeys', apiKeyRoutes);

// ── Webhooks ─────────────────────────────────────────────
router.use('/webhooks', webhookRoutes);

// ── AgentArena: Agents ───────────────────────────────────
router.use('/agents', agentRoutes);

// ── AgentArena: Outcome Engine ───────────────────────────
router.use('/outcome', outcomeRoutes);

// ── AgentArena: Pipelines ────────────────────────────────
router.use('/pipeline', pipelineRoutes);

// ── AgentArena: Auditions ────────────────────────────────
router.use('/audition', auditionRoutes);

module.exports = router;
