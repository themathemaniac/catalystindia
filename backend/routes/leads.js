/* ============================================================
   routes/leads.js — Lead management routes
   POST   /api/leads          — create lead (public)
   GET    /api/leads          — list leads (admin)
   GET    /api/leads/stats    — lead statistics (admin)
   PATCH  /api/leads/:id      — update lead (admin)
   DELETE /api/leads/:id      — delete lead (admin)
   ============================================================ */

'use strict';

const express = require('express');
const { PrismaClient } = require('@prisma/client');

const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

/* ── POST / — Create lead (public) ──────────────────────── */
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, company, budget, service, message, source } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    // Compute a simple score based on completeness
    let score = 50;
    if (name)    score += 5;
    if (phone)   score += 10;
    if (company) score += 10;
    if (budget)  score += 15;
    if (service) score += 10;
    if (message && message.length > 50) score += 10;
    score = Math.min(score, 100);

    const lead = await prisma.lead.create({
      data: {
        name:    (name    || 'Unknown').trim(),
        email:   email.toLowerCase().trim(),
        phone:   phone    || null,
        company: company  || null,
        budget:  budget   || null,
        service: service  || null,
        message: message  || null,
        source:  source   || 'website',
        status:  'new',
        score,
      },
    });

    // Emails removed as part of mailing system removal

    return res.status(201).json({ success: true, lead: { id: lead.id, score } });
  } catch (err) {
    console.error('[Leads/create]', err.message);
    return res.status(500).json({ error: 'Failed to save lead.' });
  }
});

/* ── GET / — List leads (admin) ──────────────────────────── */
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const {
      page   = 1,
      limit  = 20,
      search = '',
      status = '',
      source = '',
      sortBy = 'createdAt',
      order  = 'desc',
    } = req.query;

    const skip  = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take  = parseInt(limit, 10);
    const where = {};

    if (search) {
      where.OR = [
        { name:    { contains: search } },
        { email:   { contains: search } },
        { company: { contains: search } },
        { phone:   { contains: search } },
      ];
    }
    if (status) where.status = status;
    if (source) where.source = source;

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: order },
      }),
      prisma.lead.count({ where }),
    ]);

    return res.json({
      leads,
      pagination: {
        total,
        page:       parseInt(page, 10),
        limit:      take,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (err) {
    console.error('[Leads/list]', err.message);
    return res.status(500).json({ error: 'Failed to fetch leads.' });
  }
});

/* ── GET /stats — Lead statistics (admin) ────────────────── */
router.get('/stats', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [total, byStatus, bySource, recent] = await Promise.all([
      prisma.lead.count(),
      prisma.lead.groupBy({ by: ['status'], _count: { id: true } }),
      prisma.lead.groupBy({ by: ['source'], _count: { id: true } }),
      prisma.lead.findMany({ take: 5, orderBy: { createdAt: 'desc' } }),
    ]);

    const statusMap = {};
    byStatus.forEach(s => { statusMap[s.status] = s._count.id; });

    const sourceMap = {};
    bySource.forEach(s => { sourceMap[s.source] = s._count.id; });

    return res.json({
      total,
      byStatus: statusMap,
      bySource: sourceMap,
      recent,
    });
  } catch (err) {
    console.error('[Leads/stats]', err.message);
    return res.status(500).json({ error: 'Failed to fetch lead stats.' });
  }
});

/* ── PATCH /:id — Update lead (admin) ────────────────────── */
router.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { status, score, name, phone, company, budget, service, notes } = req.body;

    const data = {};
    if (status  !== undefined) data.status  = status;
    if (score   !== undefined) data.score   = parseInt(score, 10);
    if (name    !== undefined) data.name    = name;
    if (phone   !== undefined) data.phone   = phone;
    if (company !== undefined) data.company = company;
    if (budget  !== undefined) data.budget  = budget;
    if (service !== undefined) data.service = service;

    const lead = await prisma.lead.update({
      where: { id: req.params.id },
      data,
    });

    return res.json({ success: true, lead });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Lead not found.' });
    console.error('[Leads/update]', err.message);
    return res.status(500).json({ error: 'Failed to update lead.' });
  }
});

/* ── DELETE /:id — Delete lead (admin) ───────────────────── */
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await prisma.lead.delete({ where: { id: req.params.id } });
    return res.json({ success: true, message: 'Lead deleted.' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Lead not found.' });
    console.error('[Leads/delete]', err.message);
    return res.status(500).json({ error: 'Failed to delete lead.' });
  }
});

module.exports = router;
