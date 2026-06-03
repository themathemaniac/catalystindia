/* ============================================================
   middleware/rateLimit.js — Rate limiting configurations
   ============================================================ */

'use strict';

const rateLimit = require('express-rate-limit');

/** General API limiter — 100 req / 15 min */
const generalLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             100,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: 'Too many requests. Please try again later.' },
});

/** Auth endpoints — 10 req / 15 min */
const authLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             10,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: 'Too many authentication attempts. Please wait 15 minutes.' },
});

/** Chatbot — 30 req / min */
const chatLimiter = rateLimit({
  windowMs:        60 * 1000,
  max:             30,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: 'Too many chat messages. Please slow down.' },
});

/** Admin / data API — 200 req / 15 min */
const apiLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             200,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: 'API rate limit exceeded. Please try again later.' },
});

module.exports = { generalLimiter, authLimiter, chatLimiter, apiLimiter };
