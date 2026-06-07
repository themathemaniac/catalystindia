/* ============================================================
   CATALYST — Contact Controller
   Handles contact form submissions
   ============================================================ */

'use strict';

const { validationResult } = require('express-validator');
const mailer               = require('../utils/mailer');

/**
 * POST /api/contact
 * Validate → Sanitize → Send email → Respond
 */
exports.submit = async (req, res, next) => {
  // Validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      error:   'Validation failed',
      details: errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
  }

  const {
    firstName,
    lastName,
    email,
    phone,
    company,
    service,
    budget,
    message,
  } = req.body;

  const fullName = `${firstName} ${lastName}`.trim();

  try {
    // Send notification to team
    await mailer.sendContactNotification({
      to:      process.env.NOTIFICATION_EMAIL || process.env.TO_EMAIL || 'hello@catalyst.com',
      subject: `New Enquiry from ${fullName} — ${service || 'General'}`,
      html:    buildTeamEmailHTML({ fullName, email, phone, company, service, budget, message }),
    });

    // Send auto-reply to the submitter
    await mailer.sendAutoReply({
      to:      email,
      subject: 'We received your message — Catalyst',
      html:    buildAutoReplyHTML({ firstName }),
    });

    return res.status(200).json({
      success: true,
      message: 'Your message has been sent. We\'ll be in touch within 24 hours.',
    });
  } catch (err) {
    console.error('[ContactController] Email send error:', err.message);
    // Don't expose internal errors to client
    return res.status(500).json({
      error: 'Failed to send message. Please try again or email us directly at hello@catalyst.com',
    });
  }
};

/* ── Email Templates ────────────────────────────────────────── */

function buildTeamEmailHTML({ fullName, email, phone, company, service, budget, message }) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0C0D11; color: #EDF1F7; padding: 32px; border-radius: 12px;">
      <h2 style="color: #60A5FA; margin-bottom: 24px;">📬 New Contact Form Submission</h2>
      <table style="width: 100%; border-collapse: collapse;">
        ${row('Name',    fullName)}
        ${row('Email',   `<a href="mailto:${email}" style="color: #60A5FA;">${email}</a>`)}
        ${row('Phone',   phone   || 'Not provided')}
        ${row('Company', company || 'Not provided')}
        ${row('Service', service || 'Not specified')}
        ${row('Budget',  budget  || 'Not specified')}
      </table>
      <div style="margin-top: 24px; padding: 16px; background: rgba(59,130,246,0.08); border-left: 3px solid #3B82F6; border-radius: 6px;">
        <strong style="color: #C2D0DC;">Message:</strong>
        <p style="color: #8E9DAF; line-height: 1.7; margin-top: 8px;">${escapeHtml(message)}</p>
      </div>
      <p style="color: #4E5A70; font-size: 12px; margin-top: 24px;">Submitted at ${new Date().toUTCString()}</p>
    </div>
  `;
}

function buildAutoReplyHTML({ firstName }) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0C0D11; color: #EDF1F7; padding: 32px; border-radius: 12px;">
      <h2 style="color: #60A5FA;">Hi ${firstName}! We've received your message ✓</h2>
      <p style="color: #8E9DAF; line-height: 1.7;">Thank you for reaching out to Catalyst. We've received your enquiry and a member of our team will get back to you within <strong style="color: #EDF1F7;">24 business hours</strong>.</p>
      <p style="color: #8E9DAF; line-height: 1.7;">In the meantime, feel free to explore our <a href="https://catalyst.com/portfolio" style="color: #60A5FA;">portfolio</a> or check our <a href="https://catalyst.com/faq" style="color: #60A5FA;">FAQ</a>.</p>
      <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid rgba(162,178,200,0.1); color: #4E5A70; font-size: 12px;">
        <strong style="color: #6E7E94;">Catalyst</strong> · Premium digital presence for ambitious businesses<br/>
        hello@catalyst.com · +1 (555) 123-4567
      </div>
    </div>
  `;
}

function row(label, value) {
  return `
    <tr style="border-bottom: 1px solid rgba(162,178,200,0.08);">
      <td style="padding: 10px 0; color: #6E7E94; font-size: 13px; width: 120px;">${label}</td>
      <td style="padding: 10px 0; color: #EDF1F7; font-size: 14px;">${value}</td>
    </tr>
  `;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\n/g, '<br/>');
}
