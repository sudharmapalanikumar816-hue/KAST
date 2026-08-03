const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'kambaa_kast_secret_key_2026_jwt_token_secure';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access denied. No authentication token provided.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid or expired token.' });
    }
    req.user = user;
    next();
  });
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ success: false, message: 'Unauthorized. Missing role.' });
    }

    const userRoleNormalized = req.user.role.toLowerCase().replace(/[\s-]+/g, '_');
    const normalizedAllowed = allowedRoles.map(r => r.toLowerCase().replace(/[\s-]+/g, '_'));

    // Admin & Program Owner have full administrative access to all admin routes
    if (userRoleNormalized === 'admin' || userRoleNormalized === 'program_owner') {
      return next();
    }

    if (normalizedAllowed.includes(userRoleNormalized)) {
      return next();
    }

    return res.status(403).json({ 
      success: false, 
      message: `Forbidden. Role '${req.user.role}' is not authorized to access this resource.` 
    });
  };
}

module.exports = { authenticateToken, requireRole, JWT_SECRET };
