const requireRole = (requiredRole) => {
    return (req, res, next) => {
      console.log('Current User:', req.user); 
  
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized. User not authenticated.' });
      }
  
      if (req.user.role !== requiredRole) {
        return res.status(403).json({
          error: `Forbidden. You need the "${requiredRole}" role to access this resource.`,
        });
      }
  
      next();
    };
  };
  
module.exports = requireRole;
