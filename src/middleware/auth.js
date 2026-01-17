const requireAuth = (req, res, next) => {
  // Check if session exists
  if (!req.session) {
    console.log('Authentication failed: No session object');
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please log in again.'
    });
  }
  
  // Check if userId exists in session
  if (req.session.userId) {
    return next();
  }
  
  // Log for debugging (remove in production if needed)
  console.log('Authentication failed:', {
    hasSession: !!req.session,
    userId: req.session?.userId,
    sessionId: req.sessionID,
    sessionKeys: req.session ? Object.keys(req.session) : [],
    cookies: req.headers.cookie ? 'present' : 'missing'
  });
  
  return res.status(401).json({
    success: false,
    message: 'Authentication required. Please log in again.'
  });
};

module.exports = { requireAuth };
