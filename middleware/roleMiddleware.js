const roleMiddleware = (allowedRoles) => {
    return (req, res, next) => {
      // Check if user exists and has a role
      if (!req.user || !req.user.role) {
        return res.status(401).json({
          message: 'Unauthorized access',
          error: 'No user role found'
        });
      }
  
      // Check if user's role is allowed
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          message: 'Forbidden',
          error: 'Insufficient permissions'
        });
      }
  
      next();
    };
  };
  
  module.exports = roleMiddleware;