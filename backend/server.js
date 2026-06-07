/* ============================================================
   CATALYST — Backend Server v2.0
   Express.js API + Prisma ORM + Grok AI + JWT Auth
   ============================================================ */

'use strict';

require('dotenv').config();

const express      = require('express');
const helmet       = require('helmet');
const cors         = require('cors');
const morgan       = require('morgan');
const cookieParser = require('cookie-parser');
const path         = require('path');
const { PrismaClient } = require('@prisma/client');
const cron         = require('node-cron');

// ── Route Imports ─────────────────────────────────────────
const newsletterRouter = require('./routes/newsletter');
const authRouter       = require('./routes/auth');
const leadsRouter      = require('./routes/leads');
const chatbotRouter    = require('./routes/chatbot');
const adminRouter      = require('./routes/admin');
const servicesRouter   = require('./routes/services');
const portfolioRouter  = require('./routes/portfolio');
const estimatorRouter  = require('./routes/estimator');

// ── Rate Limiters ─────────────────────────────────────────
const { generalLimiter, apiLimiter } = require('./middleware/rateLimit');

const app    = express();
const PORT   = process.env.PORT || 3000;
const prisma = new PrismaClient();

// ── Security Middleware ────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],
      styleSrc:    ["'self'", "'unsafe-inline'", 'fonts.googleapis.com', 'fonts.gstatic.com'],
      fontSrc:     ["'self'", 'fonts.gstatic.com'],
      imgSrc:      ["'self'", 'data:', 'blob:', 'https:'],
      connectSrc:  ["'self'", 'https://api.x.ai'],
    },
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// ── CORS ──────────────────────────────────────────────────
const defaultOrigins = [
  'https://catalystindia.vercel.app',
  'http://localhost:3000'
];
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim().replace(/\/$/, '')) 
  : defaultOrigins;

app.use(cors({
  origin: (origin, callback) => {
    const safeOrigin = origin ? origin.replace(/\/$/, '') : null;
    // Allow requests with no origin (same-origin, Postman, server-to-server)
    if (!safeOrigin || allowedOrigins.includes(safeOrigin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: Origin ${origin} not allowed.`));
    }
  },
  methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// ── Logging ───────────────────────────────────────────────
const logFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(logFormat));

// ── Body Parsing ──────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());

// ── Static Files — serve frontend ─────────────────────────
const frontendDir = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendDir));

// ── API Routes ────────────────────────────────────────────
app.use('/api/newsletter', generalLimiter, newsletterRouter);
app.use('/api/auth',       authRouter);
app.use('/api/leads',      apiLimiter,     leadsRouter);
app.use('/api/chatbot',    chatbotRouter);
app.use('/api/admin',      apiLimiter,     adminRouter);
app.use('/api/services',   apiLimiter,     servicesRouter);
app.use('/api/portfolio',  apiLimiter,     portfolioRouter);
app.use('/api/estimator',  apiLimiter,     estimatorRouter);

// ── Health Check ──────────────────────────────────────────
app.get('/api/health', async (_req, res) => {
  let dbStatus = 'ok';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbStatus = 'error';
  }

  res.json({
    status:   'ok',
    service:  'catalyst-backend',
    version:  '2.0.0',
    uptime:   Math.floor(process.uptime()),
    time:     new Date().toISOString(),
    database: dbStatus,
  });
});

// ── SPA Fallback — serve index.html for unknown routes ────
app.get('*', (_req, res) => {
  res.sendFile(path.join(frontendDir, 'index.html'));
});

// ── Global Error Handler ──────────────────────────────────
app.use((err, _req, res, _next) => {
  const status  = err.status  || 500;
  const message = err.message || 'Internal Server Error';
  console.error(`[ERROR] ${status} — ${message}`);
  if (process.env.NODE_ENV !== 'production') console.error(err.stack);
  res.status(status).json({ error: message });
});

// ── Start Server ──────────────────────────────────────────
async function startServer() {
  try {
    // Verify database connection
    await prisma.$connect();
    console.log('✅ Database connected');

    app.listen(PORT, () => {
      console.log(`\n🚀 Catalyst server v2.0 running on http://localhost:${PORT}`);
      console.log(`   Frontend:  http://localhost:${PORT}/`);
      console.log(`   API:       http://localhost:${PORT}/api`);
      console.log(`   Health:    http://localhost:${PORT}/api/health`);
      console.log(`   ENV:       ${process.env.NODE_ENV || 'development'}`);
      console.log(`   Grok API:  ${process.env.GROK_API_KEY ? '✅ Configured' : '⚠️  Not configured (using fallback)'}\n`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT',  async () => { await prisma.$disconnect(); process.exit(0); });
process.on('SIGTERM', async () => { await prisma.$disconnect(); process.exit(0); });

startServer();

module.exports = app;
