// middleware/validateRequest.js
// Shared express-validator result handler.
// Import and use in any route file after validation chains:
//   const validateRequest = require('../../middleware/validateRequest');
//   router.post('/foo', [...validators], validateRequest, handler);

const { validationResult } = require('express-validator');

const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array().map((e) => ({
                field: e.path,
                message: e.msg,
            })),
        });
    }
    return next();
};

module.exports = validateRequest;
