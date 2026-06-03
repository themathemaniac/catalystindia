/* ============================================================
   routes/admin.js — Admin dashboard & analytics routes
   GET  /api/admin/dashboard       — dashboard summary (admin)
   GET  /api/admin/analytics       — page analytics (admin)
   POST /api/admin/analytics/track — track event (public)
   ============================================================ */

'use strict';

const express = require('express');
const { PrismaClient } = require('@prisma/client');

const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

/* ── GET /dashboard ──────────────────────────────────────── */
router.get('/dashboard', requireAuth, requireAdmin, async (req, res) => {
  try {
    const now        = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const last7Days  = new Date(now);
    last7Days.setDate(last7Days.getDate() - 7);
    const last30Days = new Date(now);
    last30Days.setDate(last30Days.getDate() - 30);

    const [
      totalLeads,
      newLeads,
      newLeadsToday,
      totalProjects,
      totalBlogPosts,
      publishedPosts,
      totalServices,
      chatSessions,
      convertedSessions,
      recentLeads,
      leadsByStatus,
      pageViewsToday,
      pageViews7Days,
    ] = await Promise.all([
      prisma.lead.count(),
      prisma.lead.count({ where: { status: 'new' } }),
      prisma.lead.count({ where: { createdAt: { gte: startOfDay } } }),
      prisma.project.count(),
      prisma.blogPost.count(),
      prisma.blogPost.count({ where: { published: true } }),
      prisma.service.count({ where: { active: true } }),
      prisma.chatSession.count(),
      prisma.chatSession.count({ where: { converted: true } }),
      prisma.lead.findMany({
        take:    10,
        orderBy: { createdAt: 'desc' },
        select:  { id: true, name: true, email: true, status: true, score: true, source: true, service: true, createdAt: true },
      }),
      prisma.lead.groupBy({ by: ['status'], _count: { id: true } }),
      prisma.analytics.count({ where: { event: 'page_view', createdAt: { gte: startOfDay } } }),
      prisma.analytics.count({ where: { event: 'page_view', createdAt: { gte: last7Days } } }),
    ]);

    const conversionRate = chatSessions > 0
      ? Math.round((convertedSessions / chatSessions) * 100)
      : 0;

    const statusBreakdown = {};
    leadsByStatus.forEach(s => { statusBreakdown[s.status] = s._count.id; });

    return res.json({
      leads: {
        total:        totalLeads,
        new:          newLeads,
        today:        newLeadsToday,
        byStatus:     statusBreakdown,
      },
      projects:       totalProjects,
      blog: {
        total:        totalBlogPosts,
        published:    publishedPosts,
        drafts:       totalBlogPosts - publishedPosts,
      },
      services:       totalServices,
      chat: {
        sessions:     chatSessions,
        converted:    convertedSessions,
        conversionRate,
      },
      analytics: {
        pageViewsToday,
        pageViews7Days,
      },
      recentLeads,
    });
  } catch (err) {
    console.error('[Admin/dashboard]', err.message);
    return res.status(500).json({ error: 'Failed to load dashboard.' });
  }
});

/* ── GET /analytics — Page view analytics (admin) ─────────── */
router.get('/analytics', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { days = 30, page: pageFilter, event: eventFilter } = req.query;
    const since = new Date();
    since.setDate(since.getDate() - parseInt(days, 10));

    const where = { createdAt: { gte: since } };
    if (pageFilter)  where.page  = { contains: pageFilter };
    if (eventFilter) where.event = eventFilter;

    const [events, pageGroups, eventGroups, total] = await Promise.all([
      prisma.analytics.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take:    100,
      }),
      prisma.analytics.groupBy({
        by:    ['page'],
        where: { ...where, event: 'page_view' },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take:  10,
      }),
      prisma.analytics.groupBy({
        by:    ['event'],
        where,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      prisma.analytics.count({ where }),
    ]);

    const topPages   = pageGroups.map(p => ({ page: p.page, views: p._count.id }));
    const eventTypes = eventGroups.map(e => ({ event: e.event, count: e._count.id }));

    return res.json({ total, topPages, eventTypes, events });
  } catch (err) {
    console.error('[Admin/analytics]', err.message);
    return res.status(500).json({ error: 'Failed to fetch analytics.' });
  }
});

/* ── POST /analytics/track — Track page/event (public) ────── */
router.post('/analytics/track', async (req, res) => {
  try {
    const { page, event = 'page_view', metadata } = req.body;

    if (!page) return res.status(400).json({ error: 'Page is required.' });

    await prisma.analytics.create({
      data: {
        page:      page.slice(0, 255),
        event:     event.slice(0, 100),
        metadata:  metadata ? JSON.stringify(metadata).slice(0, 1000) : null,
        ip:        req.ip || null,
        userAgent: (req.headers['user-agent'] || '').slice(0, 500),
      },
    });

    return res.json({ success: true });
  } catch (err) {
    console.error('[Admin/track]', err.message);
    return res.status(500).json({ error: 'Failed to record event.' });
  }
});

module.exports = router;
