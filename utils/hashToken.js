// utils/hashToken.js
// SHA-256 hashing for all token types: verification, reset, and refresh.
// One function, used everywhere — fixes B-03 (inconsistent hashing).
// ARCHITECTURE_MAP §5: Token Hashing Utility.

const crypto = require('crypto');

const hashToken = (token) => {
    return crypto.createHash('sha256').update(token).digest('hex');
};

module.exports = hashToken;
