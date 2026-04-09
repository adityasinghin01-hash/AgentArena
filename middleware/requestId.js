// middleware/requestId.js
// Generates a unique UUID for every incoming request.
// Attaches to req.id and sets X-Request-Id response header.
// Used by requestLogger (Morgan) and errorHandler for log correlation.

const { v4: uuidv4 } = require('uuid');

const requestId = (req, res, next) => {
    const id = req.headers['x-request-id'] || uuidv4();
    req.id = id;
    res.setHeader('X-Request-Id', id);
    next();
};

module.exports = requestId;
