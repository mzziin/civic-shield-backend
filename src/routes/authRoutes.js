const express = require('express');
const router = express.Router();
const {
  sendOTPHandler,
  registerHandler,
  loginHandler,
  logoutHandler,
  getMeHandler
} = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

router.post('/send-otp', sendOTPHandler);
router.post('/register', registerHandler);
router.post('/login', loginHandler);
router.post('/logout', logoutHandler);
router.get('/me', requireAuth, getMeHandler);

module.exports = router;
