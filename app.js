// app.js
// Express app — middleware stack in exact order per ARCHITECTURE_MAP §6.
// Routes are mounted here. Error handler is last.

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const config = require('./config/config');
const { globalLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const { httpLogger } = require('./middleware/requestLogger');
const securityHeaders = require('./middleware/securityHeaders');

const app = express();
app.set('trust proxy', 1);

// ── 1. Security Headers ───────────────────────────────────
// TECH_DECISIONS §1.8: Explicit CSP config, not just defaults
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],   // Needed for verify/reset HTML pages
            styleSrc: ["'self'", "'unsafe-inline'"],     // Needed for inline styles in HTML pages
        },
    },
    crossOriginEmbedderPolicy: false,   // Not needed for API-only backend
}));

// ── 1b. Additional Security Headers ──────────────────────
// Supplements helmet with COEP, COOP, CORP, Permissions-Policy
app.use(securityHeaders);

// ── 2. CORS (whitelist only) ──────────────────────────────
// Fixes B-08: old version had cors() with zero config — allowed every origin
app.use(cors({
    origin: config.ALLOWED_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    maxAge: 86400, // Cache preflight for 24h
}));

// ── 3. Body Parser (with size limit) ─────────────────────
// Fixes B-21: old version had no body size limit — DoS vector
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

// ── 4. Input Sanitization ────────────────────────────────
// Fixes B-12: old version had zero sanitization — NoSQL injection possible
app.use(mongoSanitize());

// ── 4b. XSS Sanitization ────────────────────────────────
// Sanitizes user input in req.body, req.query, req.params
app.use(xss());

// ── 4c. HTTP Parameter Pollution ─────────────────────────
// Prevents duplicate query parameters (e.g., ?sort=name&sort=email)
app.use(hpp());

// ── 5. Request ID ────────────────────────────────────────
// Generates UUID per request for log correlation
const requestId = require('./middleware/requestId');
app.use(requestId);

// ── 6. Request Logger ────────────────────────────────────
// Structured request logging — includes request ID
app.use(httpLogger);

// ── 7. Global Rate Limiter ───────────────────────────────
app.use('/api', globalLimiter);

// ── 8. Routes ────────────────────────────────────────────
// Health check is unversioned — Render probes /api/health directly.
app.use('/api', require('./routes/health.routes'));

// All versioned routes under /api/v1/
app.use('/api/v1', require('./routes/v1'));

// ── 9. Global Error Handler (MUST be last) ───────────────
app.use(errorHandler);

module.exports = app;
