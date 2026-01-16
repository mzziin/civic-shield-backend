const express = require('express');
const router = express.Router();
const { updateLocationHandler } = require('../controllers/locationController');
const { requireAuth } = require('../middleware/auth');

router.post('/update', requireAuth, updateLocationHandler);

module.exports = router;
