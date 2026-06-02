/* ============================================================
   CATALYST — Rate Limiters
   Prevents API abuse using express-rate-limit
   ============================================================ */

'use strict';

const rateLimit = require('express-rate-limit');

const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX, 10) || 10;
const WINDOW_MS    = parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000; // 15 min

const baseOptions = {
  windowMs: WINDOW_MS,
  standardHeaders: true,  // Return rate limit info in `RateLimit-*` headers
  legacyHeaders:   false, // Disable `X-RateLimit-*` headers
  handler: (_req, res) => {
    res.status(429).json({
      error: 'Too many requests. Please wait a few minutes before trying again.',
    });
  },
};

/**
 * Rate limiter for the contact form API — stricter
 * 10 submissions per 15 minutes per IP
 */
exports.contactRateLimiter = rateLimit({
  ...baseOptions,
  max:     MAX_REQUESTS,
  message: 'Too many contact submissions from this IP. Please try again later.',
  keyGenerator: (req) => req.ip,
});

/**
 * Rate limiter for the newsletter API — slightly more lenient
 * 5 subscriptions per 15 minutes per IP
 */
exports.newsletterRateLimiter = rateLimit({
  ...baseOptions,
  max:     5,
  message: 'Too many subscription attempts. Please try again later.',
  keyGenerator: (req) => req.ip,
});
