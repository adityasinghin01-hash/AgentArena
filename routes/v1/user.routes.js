// routes/v1/user.routes.js
// User routes — profile, dashboard (protected).
// Mounted at /api/v1/ by the v1 router.

const express = require('express');
const router = express.Router();
const userController = require('../../controllers/userController');
const { protect } = require('../../middleware/authMiddleware');

// GET /api/profile — protected (requires valid access token)
router.get('/profile', protect(), userController.getProfile);

// GET /api/dashboard — protected (requires valid access token)
router.get('/dashboard', protect(), userController.getDashboard);

module.exports = router;
