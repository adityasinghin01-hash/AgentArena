// middleware/requestLogger.js
// Morgan HTTP request logger — pipes to central Winston logger.
// Includes request ID for log correlation.

const morgan = require('morgan');
const logger = require('../config/logger');

// ── Morgan → Winston bridge ──────────────────────────────
const stream = { write: (message) => logger.http(message.trim()) };

// Skip health check to reduce noise
const skip = (req) => req.originalUrl === '/api/health';

// Custom token: request ID from requestId middleware
morgan.token('request-id', (req) => req.id || '-');

const httpLogger = morgan(
    ':request-id :method :url :status :res[content-length] - :response-time ms [:remote-addr]',
    { stream, skip }
);

module.exports = { httpLogger };

