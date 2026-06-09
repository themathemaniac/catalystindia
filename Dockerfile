# ============================================================
#  CATALYST AI AGENCY — Dockerfile
#  Multi-stage production build
# ============================================================

# ── Stage 1: Dependencies ─────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

COPY backend/package*.json ./backend/
RUN cd backend && npm ci --only=production

# ── Stage 2: Prisma Generate ─────────────────────────────
FROM node:20-alpine AS prisma
WORKDIR /app

COPY backend/package*.json ./backend/
COPY backend/prisma ./backend/prisma/

RUN cd backend && npm ci && npx prisma generate

# ── Stage 3: Production ───────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S catalyst -u 1001

# Copy backend
COPY --from=deps /app/backend/node_modules ./backend/node_modules
COPY --from=prisma /app/backend/node_modules/.prisma ./backend/node_modules/.prisma
COPY backend/ ./backend/

# Copy frontend (static files served from root by Express)
COPY assets/ ./assets/
COPY css/ ./css/
COPY js/ ./js/
COPY pages/ ./pages/
COPY index.html robots.txt sitemap.xml vercel.json ./

# Create data directory for SQLite
RUN mkdir -p /app/backend/data && chown -R catalyst:nodejs /app

USER catalyst

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "backend/server.js"]
