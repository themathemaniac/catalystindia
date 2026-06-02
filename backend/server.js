/* ============================================================
   CATALYST — Backend Server
   Express.js API + Static file serving
   ============================================================ */

'use strict';

require('dotenv').config();
const express    = require('express');
const helmet     = require('helmet');
const cors       = require('cors');
const morgan     = require('morgan');
const path       = require('path');

const contactRouter    = require('./routes/contact');
const newsletterRouter = require('./routes/newsletter');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Security Middleware ────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],
      styleSrc:    ["'self'", "'unsafe-inline'", 'fonts.googleapis.com', 'fonts.gstatic.com'],
      fontSrc:     ["'self'", 'fonts.gstatic.com'],
      imgSrc:      ["'self'", 'data:', 'blob:'],
      connectSrc:  ["'self'"],
    },
  },
}));

// ── CORS ──────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g., same-origin static files)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: Origin ${origin} not allowed.`));
    }
  },
  methods: ['GET', 'POST'],
  credentials: true,
}));

// ── Logging ───────────────────────────────────────────────────
const logFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(logFormat));

// ── Body Parsing ──────────────────────────────────────────────
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true, limit: '50kb' }));

// ── Static Files — serve frontend ────────────────────────────
const frontendDir = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendDir));

// ── API Routes ────────────────────────────────────────────────
app.use('/api/contact',    contactRouter);
app.use('/api/newsletter', newsletterRouter);

// ── Health Check ──────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status:  'ok',
    service: 'catalyst-backend',
    version: '1.0.0',
    uptime:  Math.floor(process.uptime()),
    time:    new Date().toISOString(),
  });
});

// ── SPA Fallback — serve index.html for unknown routes ────────
app.get('*', (_req, res) => {
  res.sendFile(path.join(frontendDir, 'index.html'));
});

// ── Global Error Handler ──────────────────────────────────────
app.use((err, _req, res, _next) => {
  const status  = err.status  || 500;
  const message = err.message || 'Internal Server Error';
  console.error(`[ERROR] ${status} — ${message}`);
  if (process.env.NODE_ENV !== 'production') console.error(err.stack);
  res.status(status).json({ error: message });
});

// ── Start Server ──────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Catalyst server running on http://localhost:${PORT}`);
  console.log(`   Frontend: http://localhost:${PORT}/`);
  console.log(`   API:      http://localhost:${PORT}/api`);
  console.log(`   Health:   http://localhost:${PORT}/api/health`);
  console.log(`   ENV:      ${process.env.NODE_ENV || 'development'}\n`);
});

module.exports = app;
