// server.js
// Entry point — binds port FIRST, then connects DB, handles graceful shutdown.
// Exports readiness flag on app for deep health check.

const mongoose = require('mongoose');
const app = require('./app');
const config = require('./config/config');
const connectDB = require('./config/db');
const logger = require('./config/logger');
const { drainPendingUpdates } = require('./middleware/apiKeyMiddleware');
const { startWebhookRetryWorker, stopWebhookRetryWorker } = require('./services/webhookService');

// ── Readiness Flag ───────────────────────────────────────────
// Set to true only after DB connects. Used by /api/health/deep.
app.locals.isReady = false;

// ── Start Server ─────────────────────────────────────────────
// CRITICAL: Listen BEFORE DB connect — Render needs an open port within ~15s.
const server = app.listen(config.PORT, '0.0.0.0', async () => {
    logger.info(`🚀 Server running in ${config.NODE_ENV} mode on port ${config.PORT}`);

    // Connect to MongoDB AFTER port is open
    try {
        await connectDB();
        app.locals.isReady = true;

        // Start background workers that depend on DB
        startWebhookRetryWorker();

        logger.info('✅ Server is ready to accept requests');
    } catch (err) {
        logger.error('Failed to connect to MongoDB during startup', { error: err.message });
        // Don't exit — let the health check report degraded status
    }
});

// Keep-alive timeout: slightly higher than load balancer (Render uses 60s)
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

// ── Graceful Shutdown ────────────────────────────────────────
// 1. Stop accepting new connections
// 2. Wait for in-flight requests to drain (30s max)
// 3. Close MongoDB connection
// 4. Exit
let isShuttingDown = false;

const gracefulShutdown = async (signal) => {
    if (isShuttingDown) {return;} // Prevent double shutdown
    isShuttingDown = true;

    logger.info(`${signal} received. Starting graceful shutdown...`);

    // Mark as not ready — health check will return 503
    app.locals.isReady = false;

    // 1. Stop the webhook retry worker — no new retries scheduled
    stopWebhookRetryWorker();
    // 2. Wait for in-flight dispatches to settle
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 3. Stop accepting new HTTP connections and drain existing ones
    server.close(async () => {
        logger.info('HTTP server closed — all connections drained.');

        try {
            // 4. Flush any in-flight API key usage stat updates
            await drainPendingUpdates();
            logger.info('API key pending updates flushed.');
        } catch (err) {
            logger.error('Error draining API key updates', { error: err.message });
        }

        try {
            // 5. Close MongoDB connection last
            await mongoose.connection.close(false);
            logger.info('MongoDB connection closed.');
        } catch (err) {
            logger.error('Error closing MongoDB connection', { error: err.message });
        }

        process.exit(0);
    });

    // Force exit if drain takes too long (30s)
    setTimeout(() => {
        logger.error('Forced shutdown — connections did not drain within 30s.');
        process.exit(1);
    }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ── Unhandled Errors ─────────────────────────────────────────
process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection', { reason: reason?.message || reason });
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
    process.exit(1);
});
