/* ============================================================
   routes/portfolio.js — Portfolio items CRUD routes
   GET    /api/portfolio          — list items (public)
   GET    /api/portfolio/featured — featured items only (public)
   GET    /api/portfolio/:id      — get single item (public)
   POST   /api/portfolio          — create item (admin)
   PUT    /api/portfolio/:id      — update item (admin)
   DELETE /api/portfolio/:id      — delete item (admin)
   ============================================================ */

'use strict';

const express = require('express');
const { PrismaClient } = require('@prisma/client');

const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

/** Parse JSON strings safely */
function parseJSON(str) {
  if (!str) return null;
  try { return JSON.parse(str); } catch { return str; }
}

/* ── GET /featured — Featured portfolio items (public) ───── */
router.get('/featured', async (req, res) => {
  try {
    const items = await prisma.portfolioItem.findMany({
      where:   { featured: true },
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    });

    const result = items.map(i => ({
      ...i,
      metrics: parseJSON(i.metrics),
      tags:    parseJSON(i.tags),
    }));

    return res.json({ items: result });
  } catch (err) {
    console.error('[Portfolio/featured]', err.message);
    return res.status(500).json({ error: 'Failed to fetch featured items.' });
  }
});

/* ── GET / — List all portfolio items (public) ───────────── */
router.get('/', async (req, res) => {
  try {
    const { category, page = 1, limit = 20 } = req.query;
    const skip  = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take  = parseInt(limit, 10);
    const where = {};

    if (category) where.category = category;

    const [items, total] = await Promise.all([
      prisma.portfolioItem.findMany({
        where,
        skip,
        take,
        orderBy: [{ featured: 'desc' }, { order: 'asc' }, { createdAt: 'desc' }],
      }),
      prisma.portfolioItem.count({ where }),
    ]);

    const result = items.map(i => ({
      ...i,
      metrics: parseJSON(i.metrics),
      tags:    parseJSON(i.tags),
    }));

    return res.json({
      items: result,
      pagination: {
        total,
        page:       parseInt(page, 10),
        limit:      take,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (err) {
    console.error('[Portfolio/list]', err.message);
    return res.status(500).json({ error: 'Failed to fetch portfolio items.' });
  }
});

/* ── GET /:id — Single portfolio item (public) ───────────── */
router.get('/:id', async (req, res) => {
  try {
    const item = await prisma.portfolioItem.findUnique({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ error: 'Portfolio item not found.' });

    return res.json({
      ...item,
      metrics: parseJSON(item.metrics),
      tags:    parseJSON(item.tags),
    });
  } catch (err) {
    console.error('[Portfolio/single]', err.message);
    return res.status(500).json({ error: 'Failed to fetch item.' });
  }
});

/* ── POST / — Create portfolio item (admin) ──────────────── */
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { title, description, category, client, imageUrl, liveUrl, metrics, tags, featured, order } = req.body;

    if (!title) return res.status(400).json({ error: 'Title is required.' });

    const item = await prisma.portfolioItem.create({
      data: {
        title,
        description: description || null,
        category:    category    || null,
        client:      client      || null,
        imageUrl:    imageUrl    || null,
        liveUrl:     liveUrl     || null,
        metrics:     metrics     ? JSON.stringify(metrics) : null,
        tags:        tags        ? JSON.stringify(tags)    : null,
        featured:    featured    ?? false,
        order:       order       ?? 0,
      },
    });

    return res.status(201).json({
      success: true,
      item: { ...item, metrics: parseJSON(item.metrics), tags: parseJSON(item.tags) },
    });
  } catch (err) {
    console.error('[Portfolio/create]', err.message);
    return res.status(500).json({ error: 'Failed to create portfolio item.' });
  }
});

/* ── PUT /:id — Update portfolio item (admin) ────────────── */
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { title, description, category, client, imageUrl, liveUrl, metrics, tags, featured, order } = req.body;
    const data = {};

    if (title       !== undefined) data.title       = title;
    if (description !== undefined) data.description = description;
    if (category    !== undefined) data.category    = category;
    if (client      !== undefined) data.client      = client;
    if (imageUrl    !== undefined) data.imageUrl    = imageUrl;
    if (liveUrl     !== undefined) data.liveUrl     = liveUrl;
    if (metrics     !== undefined) data.metrics     = JSON.stringify(metrics);
    if (tags        !== undefined) data.tags        = JSON.stringify(tags);
    if (featured    !== undefined) data.featured    = featured;
    if (order       !== undefined) data.order       = order;

    const item = await prisma.portfolioItem.update({
      where: { id: req.params.id },
      data,
    });

    return res.json({
      success: true,
      item: { ...item, metrics: parseJSON(item.metrics), tags: parseJSON(item.tags) },
    });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Portfolio item not found.' });
    console.error('[Portfolio/update]', err.message);
    return res.status(500).json({ error: 'Failed to update portfolio item.' });
  }
});

/* ── DELETE /:id — Delete portfolio item (admin) ─────────── */
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await prisma.portfolioItem.delete({ where: { id: req.params.id } });
    return res.json({ success: true, message: 'Portfolio item deleted.' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Portfolio item not found.' });
    console.error('[Portfolio/delete]', err.message);
    return res.status(500).json({ error: 'Failed to delete portfolio item.' });
  }
});

module.exports = router;
