/* ============================================================
   routes/services.js — Services CRUD routes
   GET    /api/services         — list active services (public)
   GET    /api/services/all     — list all services (admin)
   GET    /api/services/:id     — get single service
   POST   /api/services         — create service (admin)
   PUT    /api/services/:id     — update service (admin)
   DELETE /api/services/:id     — delete service (admin)
   ============================================================ */

'use strict';

const express = require('express');
const { PrismaClient } = require('@prisma/client');

const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

/* ── GET / — List active services (public) ───────────────── */
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    const where = { active: true };
    if (category) where.category = category;

    const services = await prisma.service.findMany({
      where,
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });

    // Parse features JSON for each service
    const result = services.map(s => ({
      ...s,
      features: s.features ? (() => { try { return JSON.parse(s.features); } catch { return []; } })() : [],
    }));

    return res.json({ services: result });
  } catch (err) {
    console.error('[Services/list]', err.message);
    return res.status(500).json({ error: 'Failed to fetch services.' });
  }
});

/* ── GET /all — All services including inactive (admin) ───── */
router.get('/all', requireAuth, requireAdmin, async (req, res) => {
  try {
    const services = await prisma.service.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });

    const result = services.map(s => ({
      ...s,
      features: s.features ? (() => { try { return JSON.parse(s.features); } catch { return []; } })() : [],
    }));

    return res.json({ services: result });
  } catch (err) {
    console.error('[Services/all]', err.message);
    return res.status(500).json({ error: 'Failed to fetch services.' });
  }
});

/* ── GET /:id — Get single service ──────────────────────── */
router.get('/:id', async (req, res) => {
  try {
    const service = await prisma.service.findUnique({ where: { id: req.params.id } });
    if (!service || !service.active) {
      return res.status(404).json({ error: 'Service not found.' });
    }

    return res.json({
      ...service,
      features: service.features ? (() => { try { return JSON.parse(service.features); } catch { return []; } })() : [],
    });
  } catch (err) {
    console.error('[Services/single]', err.message);
    return res.status(500).json({ error: 'Failed to fetch service.' });
  }
});

/* ── POST / — Create service (admin) ────────────────────── */
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { title, description, icon, price, features, category, order, active } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required.' });
    }

    const service = await prisma.service.create({
      data: {
        title,
        description,
        icon:     icon     || null,
        price:    price    || null,
        features: features ? JSON.stringify(features) : null,
        category: category || null,
        order:    order    ?? 0,
        active:   active   ?? true,
      },
    });

    return res.status(201).json({ success: true, service });
  } catch (err) {
    console.error('[Services/create]', err.message);
    return res.status(500).json({ error: 'Failed to create service.' });
  }
});

/* ── PUT /:id — Update service (admin) ───────────────────── */
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { title, description, icon, price, features, category, order, active } = req.body;
    const data = {};

    if (title       !== undefined) data.title       = title;
    if (description !== undefined) data.description = description;
    if (icon        !== undefined) data.icon        = icon;
    if (price       !== undefined) data.price       = price;
    if (features    !== undefined) data.features    = JSON.stringify(features);
    if (category    !== undefined) data.category    = category;
    if (order       !== undefined) data.order       = order;
    if (active      !== undefined) data.active      = active;

    const service = await prisma.service.update({
      where: { id: req.params.id },
      data,
    });

    return res.json({ success: true, service });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Service not found.' });
    console.error('[Services/update]', err.message);
    return res.status(500).json({ error: 'Failed to update service.' });
  }
});

/* ── DELETE /:id — Delete service (admin) ────────────────── */
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await prisma.service.delete({ where: { id: req.params.id } });
    return res.json({ success: true, message: 'Service deleted.' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Service not found.' });
    console.error('[Services/delete]', err.message);
    return res.status(500).json({ error: 'Failed to delete service.' });
  }
});

module.exports = router;
