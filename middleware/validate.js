// middleware/validate.js

const { body, query, validationResult } = require('express-validator');

const validate = (schemas) => [
  ...schemas,
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }
    next();
  },
];

const emailField = (field = 'email') =>
  body(field)
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Please enter a valid email address.')
    .normalizeEmail({ gmail_remove_dots: false })
    .isLength({ max: 254 }).withMessage('Email is too long.');

const passwordField = (field = 'password') =>
  body(field)
    .notEmpty().withMessage('Password is required.')
    .isLength({ min: 8, max: 128 }).withMessage('Password must be between 8 and 128 characters.');

const nameField = (field = 'name') =>
  body(field)
    .trim()
    .notEmpty().withMessage('Name is required.')
    .isLength({ min: 2, max: 64 }).withMessage('Name must be between 2 and 64 characters.')
    .matches(/^[a-zA-Z\s'-]+$/).withMessage('Name contains invalid characters.');

const otpField = (field = 'otp') =>
  body(field)
    .trim()
    .notEmpty().withMessage('OTP is required.')
    .isLength({ min: 5, max: 5 }).withMessage('OTP must be exactly 5 digits.')
    .isNumeric().withMessage('OTP must contain only digits.');

const recaptchaField = (field = 'recaptchaToken') =>
  body(field)
    .trim()
    .notEmpty().withMessage('reCAPTCHA verification is required.');

const schemas = {
  signup: validate([nameField(), emailField(), passwordField(), recaptchaField()]),
  login: validate([emailField(), passwordField()]),
  forgotPassword: validate([emailField()]),
  verifyOtp: validate([emailField(), otpField()]),
  resetPassword: validate([
    body('token').trim().notEmpty().withMessage('Reset token is required.'),
    passwordField('newPassword'),
    body('confirmPassword').notEmpty().withMessage('Please confirm your password.'),
    body('newPassword').custom((value, { req }) => {
      if (value !== req.body.confirmPassword) {throw new Error('Passwords do not match.');}
      return true;
    }),
  ]),
  refreshToken: validate([
    body('refreshToken').trim().notEmpty().withMessage('Refresh token is required.'),
  ]),
  verifyEmailQuery: validate([
    query('token').trim().notEmpty().withMessage('Verification token is missing.'),
  ]),
};

module.exports = { validate, schemas };
