/* ============================================================
   routes/chatbot.js — AI chatbot routes
   POST /api/chatbot/message        — process chat message
   GET  /api/chatbot/sessions       — list sessions (admin)
   GET  /api/chatbot/sessions/:id   — get session details (admin)
   GET  /api/chatbot/analytics      — conversion stats (admin)
   ============================================================ */

'use strict';

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { randomUUID: uuidv4 } = require('crypto');

const { chatWithGrok, extractLeadInfo } = require('../utils/grokAI');
const { requireAuth, requireAdmin }     = require('../middleware/auth');
const { chatLimiter }                   = require('../middleware/rateLimit');

const router = express.Router();
const prisma = new PrismaClient();

/* ── POST /message ───────────────────────────────────────── */
router.post('/message', chatLimiter, async (req, res) => {
  try {
    const { message, sessionId, sessionMessages = [] } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    if (message.length > 2000) {
      return res.status(400).json({ error: 'Message too long (max 2000 characters).' });
    }

    const activeSessionId = sessionId || uuidv4();

    // Build messages array for Grok
    const chatMessages = [
      ...sessionMessages.slice(-20), // Keep last 20 messages for context
      { role: 'user', content: message.trim() },
    ];

    // Get AI response
    const aiResponse = await chatWithGrok(chatMessages);

    // Build updated messages for storage
    const updatedMessages = [
      ...chatMessages,
      { role: 'assistant', content: aiResponse },
    ];

    // Try to extract lead info from the full conversation
    const leadInfo = extractLeadInfo(updatedMessages);
    let leadId     = null;

    // Save/update lead if email found
    if (leadInfo.email) {
      try {
        const existingLead = await prisma.lead.findFirst({
          where: { email: leadInfo.email },
        });

        if (existingLead) {
          await prisma.lead.update({
            where: { id: existingLead.id },
            data:  {
              ...(leadInfo.name    && { name:    leadInfo.name }),
              ...(leadInfo.phone   && { phone:   leadInfo.phone }),
              ...(leadInfo.company && { company: leadInfo.company }),
              ...(leadInfo.budget  && { budget:  leadInfo.budget }),
              ...(leadInfo.service && { service: leadInfo.service }),
            },
          });
          leadId = existingLead.id;
        } else {
          const newLead = await prisma.lead.create({
            data: {
              name:    leadInfo.name    || 'Chat Lead',
              email:   leadInfo.email,
              phone:   leadInfo.phone   || null,
              company: leadInfo.company || null,
              budget:  leadInfo.budget  || null,
              service: leadInfo.service || null,
              source:  'chatbot',
              status:  'new',
              score:   60,
            },
          });
          leadId = newLead.id;
        }
      } catch (leadErr) {
        console.error('[Chatbot] Lead upsert error:', leadErr.message);
      }
    }

    // Save / update chat session
    try {
      const existingSession = sessionId
        ? await prisma.chatSession.findUnique({ where: { id: sessionId } })
        : null;

      if (existingSession) {
        await prisma.chatSession.update({
          where: { id: sessionId },
          data:  {
            messages:  JSON.stringify(updatedMessages),
            converted: !!leadId,
            ...(leadId && { leadId }),
          },
        });
      } else {
        await prisma.chatSession.create({
          data: {
            id:        activeSessionId,
            messages:  JSON.stringify(updatedMessages),
            converted: !!leadId,
            ...(leadId && { leadId }),
          },
        });
      }
    } catch (sessionErr) {
      console.error('[Chatbot] Session save error:', sessionErr.message);
    }

    return res.json({
      reply:       aiResponse,
      sessionId:   activeSessionId,
      leadCaptured: !!leadId,
      leadId,
    });
  } catch (err) {
    console.error('[Chatbot/message]', err.message);
    return res.status(500).json({
      error: 'Chat service unavailable.',
      reply: "I'm having trouble connecting right now. Please email us at hello@catalystindia.online and we'll get back to you shortly!",
    });
  }
});

/* ── GET /sessions — List all sessions (admin) ───────────── */
router.get('/sessions', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, converted } = req.query;
    const skip  = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take  = parseInt(limit, 10);
    const where = {};

    if (converted !== undefined) where.converted = converted === 'true';

    const [sessions, total] = await Promise.all([
      prisma.chatSession.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { lead: { select: { id: true, name: true, email: true, status: true } } },
      }),
      prisma.chatSession.count({ where }),
    ]);

    const result = sessions.map(s => ({
      ...s,
      messageCount: (() => {
        try { return JSON.parse(s.messages).length; } catch { return 0; }
      })(),
      messages: undefined, // Don't send full messages in list view
    }));

    return res.json({
      sessions: result,
      pagination: {
        total,
        page:       parseInt(page, 10),
        limit:      take,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (err) {
    console.error('[Chatbot/sessions]', err.message);
    return res.status(500).json({ error: 'Failed to fetch sessions.' });
  }
});

/* ── GET /sessions/:id — Session details (admin) ──────────── */
router.get('/sessions/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const session = await prisma.chatSession.findUnique({
      where:   { id: req.params.id },
      include: { lead: true },
    });

    if (!session) return res.status(404).json({ error: 'Session not found.' });

    let messages = [];
    try { messages = JSON.parse(session.messages); } catch { /* empty */ }

    return res.json({ ...session, messages });
  } catch (err) {
    console.error('[Chatbot/session]', err.message);
    return res.status(500).json({ error: 'Failed to fetch session.' });
  }
});

/* ── GET /analytics — Conversion analytics (admin) ──────── */
router.get('/analytics', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [total, converted] = await Promise.all([
      prisma.chatSession.count(),
      prisma.chatSession.count({ where: { converted: true } }),
    ]);

    const conversionRate = total > 0 ? Math.round((converted / total) * 100) : 0;

    // Sessions per day (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentSessions = await prisma.chatSession.findMany({
      where:   { createdAt: { gte: sevenDaysAgo } },
      orderBy: { createdAt: 'asc' },
      select:  { createdAt: true, converted: true },
    });

    return res.json({
      totalSessions:   total,
      convertedLeads:  converted,
      conversionRate,
      recentSessions,
    });
  } catch (err) {
    console.error('[Chatbot/analytics]', err.message);
    return res.status(500).json({ error: 'Failed to fetch analytics.' });
  }
});

module.exports = router;
