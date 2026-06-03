/* ============================================================
   middleware/auth.js — JWT authentication middleware
   ============================================================ */

'use strict';

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'catalyst-fallback-secret';

/**
 * Verify Bearer JWT from Authorization header.
 * Attaches decoded payload to req.user.
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Provide a Bearer token.' });
  }

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please refresh your session.' });
    }
    return res.status(401).json({ error: 'Invalid token.' });
  }
}

/**
 * Require admin role. Must be used AFTER requireAuth.
 */
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  next();
}

/**
 * Combined requireAuth + requireAdmin middleware.
 */
function requireAuthAdmin(req, res, next) {
  requireAuth(req, res, (err) => {
    if (err) return;
    requireAdmin(req, res, next);
  });
}

module.exports = { requireAuth, requireAdmin, requireAuthAdmin };
