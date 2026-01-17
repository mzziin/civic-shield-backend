const requireAuth = (req, res, next) => {
  // Check if session exists and has userId
  if (req.session && req.session.userId) {
    return next();
  }
  
  // Log for debugging (remove in production if needed)
  console.log('Authentication failed:', {
    hasSession: !!req.session,
    userId: req.session?.userId,
    sessionId: req.sessionID
  });
  
  return res.status(401).json({
    success: false,
    message: 'Authentication required. Please log in again.'
  });
};

module.exports = { requireAuth };
