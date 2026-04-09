// config/config.js
// Exports all environment-based configuration values.
// In production, dotenv is NOT loaded — env vars come from Render dashboard.

if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config({ override: false });
}

const config = {
    PORT: process.env.PORT || 5001,
    NODE_ENV: process.env.NODE_ENV || 'development',
    BASE_URL: process.env.BASE_URL || 'http://localhost:5001',
    CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
    MONGO_URI: process.env.MONGO_URI,

    // CORS — comma-separated string parsed into array
    // Throws in production if not set — prevents accidental open-CORS deployments
    ALLOWED_ORIGINS: (() => {
        if (!process.env.ALLOWED_ORIGINS) {
            if (process.env.NODE_ENV === 'production') {
                throw new Error('ALLOWED_ORIGINS must be set in production');
            }
            return ['http://localhost:3000', 'http://localhost:5001'];
        }
        return process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim());
    })(),

    // JWT
    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
    ACCESS_TOKEN_EXPIRES: process.env.ACCESS_TOKEN_EXPIRES || '15m',
    REFRESH_TOKEN_EXPIRES: process.env.REFRESH_TOKEN_EXPIRES || '7d',

    // API Keys
    API_KEY_SALT: process.env.API_KEY_SALT,

    // Email — Brevo HTTP API
    BREVO_API_KEY: process.env.BREVO_API_KEY,
    BREVO_SENDER_EMAIL: process.env.BREVO_SENDER_EMAIL || 'aditya.singh.in01@gmail.com',
    BREVO_SENDER_NAME: process.env.BREVO_SENDER_NAME || 'Auth System',
    OWNER_EMAIL: process.env.OWNER_EMAIL || 'aditya.singh.in01@gmail.com',
    ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'aditya.singh.in01@gmail.com',

    // Google OAuth
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_WEB_CLIENT_ID: process.env.GOOGLE_WEB_CLIENT_ID,

    // reCAPTCHA
    RECAPTCHA_SECRET: process.env.RECAPTCHA_SECRET,

    // AI Providers (AgentArena)
    AI_PROVIDER: process.env.AI_PROVIDER || 'groq',
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    CLAUDE_API_KEY: process.env.CLAUDE_API_KEY,
    AI_TIMEOUT_MS: parseInt(process.env.AI_TIMEOUT_MS, 10) || 30000,
};

module.exports = config;
