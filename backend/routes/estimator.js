/* ============================================================
   routes/estimator.js — Project cost estimator route
   POST /api/estimator/calculate
   ============================================================ */

'use strict';

const express = require('express');
const router  = express.Router();

/* ── Pricing data (INR) ──────────────────────────────────── */
const SERVICE_PRICES = {
  'website-basic':          { label: 'Basic Website',          min: 25000,   max: 50000   },
  'website-advanced':       { label: 'Advanced Website',       min: 75000,   max: 150000  },
  'ai-chatbot':             { label: 'AI Chatbot',             min: 30000,   max: 80000   },
  'mobile-app':             { label: 'Mobile App',             min: 150000,  max: 400000  },
  'crm-integration':        { label: 'CRM Integration',        min: 40000,   max: 100000  },
  'whatsapp-bot':           { label: 'WhatsApp Bot',           min: 20000,   max: 60000   },
  'saas-mvp':               { label: 'SaaS MVP',               min: 200000,  max: 500000  },
  'ai-agent':               { label: 'AI Agent',               min: 50000,   max: 150000  },
  'api-integration':        { label: 'API Integration',        min: 15000,   max: 50000   },
  'business-automation':    { label: 'Business Automation',    min: 35000,   max: 100000  },
};

const FEATURE_PRICES = {
  'payment-gateway':        { label: 'Payment Gateway',        min: 10000,  max: 25000   },
  'admin-dashboard':        { label: 'Admin Dashboard',        min: 15000,  max: 40000   },
  'multi-language':         { label: 'Multi-Language Support', min: 10000,  max: 30000   },
  'analytics-integration':  { label: 'Analytics Integration',  min: 5000,   max: 15000   },
  'email-automation':       { label: 'Email Automation',       min: 8000,   max: 20000   },
  'seo-optimization':       { label: 'SEO Optimization',       min: 12000,  max: 35000   },
  'social-media-integration':{ label: 'Social Media Integration', min: 8000, max: 20000  },
  'user-authentication':    { label: 'User Auth System',       min: 10000,  max: 25000   },
  'file-upload':            { label: 'File Upload System',     min: 5000,   max: 15000   },
  'realtime-features':      { label: 'Real-Time Features',     min: 20000,  max: 60000   },
};

const COMPLEXITY_MULTIPLIER = {
  low:    1.0,
  medium: 1.4,
  high:   1.8,
};

const TIMELINE_ADJUSTMENT = {
  'rush-2weeks':    1.30,  // < 2 weeks: +30%
  'normal-4weeks':  1.00,  // 2–4 weeks: no change
  'comfortable-3m': 0.90,  // 1–3 months: -10%
};

/* Format currency */
function formatINR(amount) {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000)   return `₹${(amount / 1000).toFixed(0)}K`;
  return `₹${amount}`;
}

/* ── POST /calculate ─────────────────────────────────────── */
router.post('/calculate', (req, res) => {
  try {
    const {
      services  = [],
      features  = [],
      timeline  = 'normal-4weeks',
      complexity = 'medium',
    } = req.body;

    if (!Array.isArray(services) || services.length === 0) {
      return res.status(400).json({ error: 'At least one service must be selected.' });
    }

    const complexityMul = COMPLEXITY_MULTIPLIER[complexity] || 1.4;
    const timelineMul   = TIMELINE_ADJUSTMENT[timeline]     || 1.0;

    let totalMin = 0;
    let totalMax = 0;
    const breakdown = [];

    // Add service costs
    for (const serviceKey of services) {
      const pricing = SERVICE_PRICES[serviceKey];
      if (!pricing) continue;

      const adjMin = Math.round(pricing.min * complexityMul * timelineMul);
      const adjMax = Math.round(pricing.max * complexityMul * timelineMul);

      totalMin += adjMin;
      totalMax += adjMax;

      breakdown.push({
        type:  'service',
        key:   serviceKey,
        label: pricing.label,
        min:   adjMin,
        max:   adjMax,
        formatted: `${formatINR(adjMin)} – ${formatINR(adjMax)}`,
      });
    }

    // Add feature costs
    for (const featureKey of features) {
      const pricing = FEATURE_PRICES[featureKey];
      if (!pricing) continue;

      const adjMin = Math.round(pricing.min * complexityMul);
      const adjMax = Math.round(pricing.max * complexityMul);

      totalMin += adjMin;
      totalMax += adjMax;

      breakdown.push({
        type:  'feature',
        key:   featureKey,
        label: pricing.label,
        min:   adjMin,
        max:   adjMax,
        formatted: `${formatINR(adjMin)} – ${formatINR(adjMax)}`,
      });
    }

    // Timeline estimate
    const timelineMap = {
      'rush-2weeks':    '1–2 weeks',
      'normal-4weeks':  '3–5 weeks',
      'comfortable-3m': '6–12 weeks',
    };
    const timelineLabel = timelineMap[timeline] || '3–5 weeks';

    // Recommendation based on complexity
    let recommendation = '';
    if (totalMax <= 75000) {
      recommendation = 'Perfect for our Starter package! This is a lean, focused project we can deliver quickly with premium quality.';
    } else if (totalMax <= 250000) {
      recommendation = 'This fits our Growth package. We recommend a phased approach: launch core features first, then iterate based on feedback.';
    } else {
      recommendation = 'This is an Enterprise-level project. We\'ll create a detailed technical proposal with milestones, dedicated project manager, and SLA guarantees.';
    }

    // Rush fee note
    let note = null;
    if (timeline === 'rush-2weeks') {
      note = 'Rush delivery fee of 30% applied. Priority team assigned.';
    } else if (timeline === 'comfortable-3m') {
      note = '10% discount applied for relaxed timeline allowing thorough planning.';
    }

    return res.json({
      minCost:   totalMin,
      maxCost:   totalMax,
      formatted: `${formatINR(totalMin)} – ${formatINR(totalMax)}`,
      timeline:  timelineLabel,
      breakdown,
      recommendation,
      note,
      complexity,
      multipliers: { complexity: complexityMul, timeline: timelineMul },
    });
  } catch (err) {
    console.error('[Estimator/calculate]', err.message);
    return res.status(500).json({ error: 'Estimation failed. Please try again.' });
  }
});

module.exports = router;
