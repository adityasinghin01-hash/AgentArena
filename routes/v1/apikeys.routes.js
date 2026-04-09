// routes/v1/apikeys.routes.js
// Routes for managing developer API keys.

const express = require('express');
const router = express.Router();
const apiKeyController = require('../../controllers/apiKeyController');
const { protect } = require('../../middleware/authMiddleware');

// SECURITY: All API key management routes require active JWT authentication 
// from a frontend session. API keys CANNOT be used to manage API keys.
router.use(protect());

router.post('/', apiKeyController.createKey);
router.get('/', apiKeyController.listKeys);
router.delete('/:id', apiKeyController.revokeKey);
router.post('/:id/rotate', apiKeyController.rotateKey);

module.exports = router;
