const express = require('express');
const router = express.Router();
const evacuationController = require('../controllers/evacuationController');
const { requireAuth } = require('../middleware/auth');

// Calculate evacuation routes
router.post('/calculate', requireAuth, evacuationController.calculateRoutes);

// Check if user is in danger zone
router.post('/check-danger', requireAuth, evacuationController.checkDangerStatus);

module.exports = router;
