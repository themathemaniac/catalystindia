/* ============================================================
   routes/auth.js — Authentication routes
   POST /api/auth/login
   POST /api/auth/register
   POST /api/auth/refresh
   POST /api/auth/logout
   GET  /api/auth/me
   ============================================================ */

'use strict';

const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const { requireAuth } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');

const router = express.Router();
const prisma = new PrismaClient();

const JWT_SECRET          = process.env.JWT_SECRET          || 'catalyst-fallback-secret';
const JWT_REFRESH_SECRET  = process.env.JWT_REFRESH_SECRET  || 'catalyst-refresh-fallback';
const JWT_EXPIRES_IN      = process.env.JWT_EXPIRES_IN      || '15m';
const JWT_REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

const COOKIE_OPTS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days
};

function generateTokens(user) {
  const payload = { id: user.id, email: user.email, role: user.role, name: user.name };

  const accessToken  = jwt.sign(payload, JWT_SECRET,         { expiresIn: JWT_EXPIRES_IN });
  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES });

  return { accessToken, refreshToken };
}

/* ── POST /login ─────────────────────────────────────────── */
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const { accessToken, refreshToken } = generateTokens(user);

    res.cookie('refreshToken', refreshToken, COOKIE_OPTS);

    return res.json({
      accessToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error('[Auth/login]', err.message);
    return res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

/* ── POST /register ──────────────────────────────────────── */
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    // First user becomes admin; subsequent users inherit the provided role or 'admin' default
    const userCount  = await prisma.user.count();
    const assignRole = userCount === 0 ? 'admin' : (role || 'admin');

    const hashed = await bcrypt.hash(password, 12);
    const user   = await prisma.user.create({
      data: {
        name:     name.trim(),
        email:    email.toLowerCase().trim(),
        password: hashed,
        role:     assignRole,
      },
    });

    const { accessToken, refreshToken } = generateTokens(user);
    res.cookie('refreshToken', refreshToken, COOKIE_OPTS);

    return res.status(201).json({
      accessToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error('[Auth/register]', err.message);
    return res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

/* ── POST /refresh ───────────────────────────────────────── */
router.post('/refresh', async (req, res) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!token) {
      return res.status(401).json({ error: 'Refresh token required.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired refresh token.' });
    }

    // Verify user still exists
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) {
      return res.status(401).json({ error: 'User no longer exists.' });
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);
    res.cookie('refreshToken', newRefreshToken, COOKIE_OPTS);

    return res.json({ accessToken });
  } catch (err) {
    console.error('[Auth/refresh]', err.message);
    return res.status(500).json({ error: 'Token refresh failed.' });
  }
});

/* ── POST /logout ────────────────────────────────────────── */
router.post('/logout', (req, res) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
  return res.json({ message: 'Logged out successfully.' });
});

/* ── GET /me ─────────────────────────────────────────────── */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where:  { id: req.user.id },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found.' });
    return res.json(user);
  } catch (err) {
    console.error('[Auth/me]', err.message);
    return res.status(500).json({ error: 'Failed to fetch user.' });
  }
});

module.exports = router;
