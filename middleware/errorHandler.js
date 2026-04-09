// middleware/errorHandler.js
// Global error handler — catches all unhandled errors, returns clean JSON
// with request ID correlation for production debugging.
// MUST be the last middleware in app.js (after routes).

const logger = require('../config/logger');

const errorHandler = (err, req, res, _next) => {
    // ── Determine status code ────────────────────────────────
    // Map known error types to proper HTTP codes so they don't leak as 500s
    let statusCode = err.statusCode || 500;

    if (err.name === 'ValidationError') {statusCode = 400;}       // Mongoose validation
    if (err.name === 'CastError') {statusCode = 400;}             // Mongoose bad ObjectId
    if (err.name === 'JsonWebTokenError') {statusCode = 401;}     // JWT malformed
    if (err.name === 'TokenExpiredError') {statusCode = 401;}     // JWT expired
    if (err.code === 11000) {statusCode = 409;}                   // MongoDB duplicate key

    // ── Determine user-facing message ────────────────────────
    // Never expose raw error messages for 500s in production
    let message = err.message || 'Internal Server Error';

    if (statusCode === 500 && process.env.NODE_ENV === 'production') {
        message = 'Internal Server Error';
    }

    if (err.code === 11000) {
        message = 'A record with that value already exists';
    }

    // ── Request ID ───────────────────────────────────────────
    // req.id will be set by requestId middleware (Phase 3).
    // Until then, falls back to undefined (omitted from response).
    const requestId = req.id || undefined;

    // ── Structured logging ───────────────────────────────────
    // Log full context for debugging — never in the response
    logger.error({
        message: err.message,
        statusCode,
        requestId,
        method: req.method,
        url: req.originalUrl,
        userAgent: req.get('user-agent'),
        userId: req.user?._id || req.user?.id || undefined,
        ip: req.ip,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    });

    // ── Response ─────────────────────────────────────────────
    // Clean JSON — no stack traces, no internal paths, no module names
    const response = {
        error: message,       // Flutter ApiError parses data['error']
        message,              // Backwards compatibility
    };

    // Include requestId only if it exists (added in Phase 3)
    if (requestId) {
        response.requestId = requestId;
    }

    // Include validation details in development only
    if (process.env.NODE_ENV !== 'production' && err.errors) {
        response.details = err.errors;
    }

    res.status(statusCode).json(response);
};

module.exports = errorHandler;
