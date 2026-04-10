// routes/health.routes.js
// Health check endpoints — lightweight probe + deep diagnostic.
// Mounted at /api (unversioned) so Render can probe /api/health without versioning.

const express = require('express');
const mongoose = require('mongoose');
const os = require('os');
const router = express.Router();

// ── Version — single authoritative source ────────────────────
const appVersion = process.env.APP_VERSION || require('../package.json').version;

// ── Cached AI status ─────────────────────────────────────────
// Updated by /api/health/deep to avoid burning AI quota on every probe.
let cachedAiStatus = 'unknown';

// ── GET /api/health ──────────────────────────────────────
// Lightweight probe with AgentArena stats.
// Render probes this every 30s — keeps DB queries minimal.
// Uses cached AI status (never calls AI directly).
router.get('/health', async (req, res) => {
    let agentsCount = 0;
    let pipelinesCount = 0;

    try {
        // Lazy-require to avoid circular deps at module load
        const Agent = require('../models/Agent');
        const Pipeline = require('../models/Pipeline');

        [agentsCount, pipelinesCount] = await Promise.all([
            Agent.countDocuments({ isActive: true }),
            Pipeline.countDocuments(),
        ]);
    } catch (_err) {
        // DB not ready yet — return zeros
    }

    return res.status(200).json({
        status: 'ok',
        version: `AgentArena v${appVersion}`,
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        agentsCount,
        pipelinesCount,
        aiStatus: cachedAiStatus,
    });
});

// ── GET /api/health/deep ─────────────────────────────────
// Full diagnostic — checks MongoDB, memory, AI provider, readiness.
// Also updates the cached AI status for the shallow probe.
// Use for debugging, dashboards, and alerting.
// Returns 200 if all healthy, 503 if degraded.
router.get('/health/deep', async (req, res) => {
    const checks = {
        database: 'unknown',
        ai: 'unknown',
        memory: {},
        server: {},
    };
    let isHealthy = true;

    // ── MongoDB ──────────────────────────────────────────
    try {
        const dbStates = ['disconnected', 'connected', 'connecting', 'disconnecting'];
        const readyState = mongoose.connection.readyState;
        checks.database = dbStates[readyState] || 'unknown';

        if (readyState === 1 || readyState === 2) {
            checks.database = 'connected';
            // Ping is supplementary — readyState is the primary health signal
            try {
                if (readyState === 1 && mongoose.connection.db) {
                    const start = Date.now();
                    await mongoose.connection.db.admin().ping();
                    checks.databaseResponseMs = Date.now() - start;
                }
            } catch (pingErr) {
                // Ping failed but driver reports connected — still healthy
                checks.databasePingError = pingErr.message;
            }
        } else {
            isHealthy = false;
        }
    } catch (err) {
        checks.database = 'error';
        checks.databaseError = err.message;
        isHealthy = false;
    }

    // ── AI Provider (informational — does not affect overall health) ──
    try {
        const { callAI } = require('../services/claudeService');
        const start = Date.now();
        await callAI('Respond with OK', 'ping', 10);
        checks.ai = 'ok';
        checks.aiResponseMs = Date.now() - start;
        cachedAiStatus = 'ok';
    } catch (_err) {
        checks.ai = 'error';
        cachedAiStatus = 'error';
        // AI failure is non-critical — server is still healthy
    }

    // ── Memory ───────────────────────────────────────────
    const mem = process.memoryUsage();
    const totalMem = os.totalmem();
    checks.memory = {
        rss: `${Math.round(mem.rss / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(mem.heapTotal / 1024 / 1024)}MB`,
        external: `${Math.round(mem.external / 1024 / 1024)}MB`,
        systemTotal: `${Math.round(totalMem / 1024 / 1024)}MB`,
        rssPercent: `${((mem.rss / totalMem) * 100).toFixed(1)}%`,
    };

    // Flag if RSS exceeds 512MB (Render free tier limit)
    if (mem.rss > 512 * 1024 * 1024) {
        checks.memory.warning = 'RSS exceeds 512MB — approaching memory limit';
        isHealthy = false;
    }

    // ── Server Info ──────────────────────────────────────
    checks.server = {
        version: `AgentArena v${appVersion}`,
        nodeVersion: process.version,
        platform: process.platform,
        uptime: `${Math.floor(process.uptime())}s`,
        pid: process.pid,
        isReady: req.app.locals.isReady,
    };

    // Overall readiness check
    if (!req.app.locals.isReady) {
        isHealthy = false;
    }

    return res.status(isHealthy ? 200 : 503).json({
        status: isHealthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        checks,
    });
});

module.exports = router;
