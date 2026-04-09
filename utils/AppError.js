// utils/AppError.js
// Lightweight error class with statusCode for the global errorHandler.
// errorHandler.js reads err.statusCode to determine HTTP response code.
// Usage: throw new AppError('Something went wrong', 400);

class AppError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
        this.name = 'AppError';
    }
}

module.exports = AppError;
