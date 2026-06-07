/* ============================================================
   CATALYST — Newsletter Controller
   Handles newsletter subscriptions
   ============================================================ */

'use strict';

const { validationResult } = require('express-validator');

// In-memory store for demo. Replace with DB (MongoDB, PostgreSQL) in production.
const subscribers = new Set();

/**
 * POST /api/newsletter
 */
exports.subscribe = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      error:   'Validation failed',
      details: errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
  }

  const { email, name } = req.body;
  const normalizedEmail = email.toLowerCase().trim();

  if (subscribers.has(normalizedEmail)) {
    return res.status(409).json({
      error: 'This email address is already subscribed.',
    });
  }

  subscribers.add(normalizedEmail);
  console.log(`[Newsletter] New subscriber: ${normalizedEmail} (total: ${subscribers.size})`);

  // Email confirmation removed as part of mailing system removal

  return res.status(201).json({
    success: true,
    message: 'Successfully subscribed! Welcome to the Catalyst newsletter.',
  });
};

/**
 * GET /api/newsletter/count — Admin helper
 */
exports.count = (_req, res) => {
  res.json({ count: subscribers.size });
};
