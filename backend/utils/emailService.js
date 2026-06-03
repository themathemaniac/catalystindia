/* ============================================================
   utils/emailService.js — Nodemailer email helper
   ============================================================ */

'use strict';

const nodemailer = require('nodemailer');

let transporter = null;

/**
 * Lazily initialise the Nodemailer transport.
 * Returns null when EMAIL_USER is not configured.
 */
function getTransporter() {
  if (transporter) return transporter;

  const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS } = process.env;

  if (!EMAIL_USER || !EMAIL_PASS) {
    console.warn('[EmailService] EMAIL_USER / EMAIL_PASS not set — emails will only be logged.');
    return null;
  }

  transporter = nodemailer.createTransport({
    host:   EMAIL_HOST || 'smtp.gmail.com',
    port:   parseInt(EMAIL_PORT, 10) || 587,
    secure: parseInt(EMAIL_PORT, 10) === 465,
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
  });

  return transporter;
}

/**
 * Send a new-lead notification email to the admin.
 * @param {Object} lead
 */
async function sendLeadNotification(lead) {
  const from  = process.env.EMAIL_FROM    || 'Catalyst <hello@catalystindia.com>';
  const to    = process.env.NOTIFICATION_EMAIL || process.env.EMAIL_USER;
  const trans = getTransporter();

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
      <h2 style="color: #7c3aed; border-bottom: 2px solid #7c3aed; padding-bottom: 10px;">🎯 New Lead — Catalyst</h2>
      <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
        <tr><td style="padding: 8px; font-weight: bold; color: #374151; width: 140px;">Name</td><td style="padding: 8px; color: #6b7280;">${lead.name || '—'}</td></tr>
        <tr style="background: #f9fafb;"><td style="padding: 8px; font-weight: bold; color: #374151;">Email</td><td style="padding: 8px; color: #6b7280;">${lead.email || '—'}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold; color: #374151;">Phone</td><td style="padding: 8px; color: #6b7280;">${lead.phone || '—'}</td></tr>
        <tr style="background: #f9fafb;"><td style="padding: 8px; font-weight: bold; color: #374151;">Company</td><td style="padding: 8px; color: #6b7280;">${lead.company || '—'}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold; color: #374151;">Budget</td><td style="padding: 8px; color: #6b7280;">${lead.budget || '—'}</td></tr>
        <tr style="background: #f9fafb;"><td style="padding: 8px; font-weight: bold; color: #374151;">Service</td><td style="padding: 8px; color: #6b7280;">${lead.service || '—'}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold; color: #374151;">Source</td><td style="padding: 8px; color: #6b7280;">${lead.source || 'website'}</td></tr>
        <tr style="background: #f9fafb;"><td style="padding: 8px; font-weight: bold; color: #374151;">Message</td><td style="padding: 8px; color: #6b7280;">${lead.message || '—'}</td></tr>
      </table>
      <p style="margin-top: 20px; font-size: 12px; color: #9ca3af;">Received at ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</p>
    </div>
  `;

  const text = `New Lead from Catalyst\n\nName: ${lead.name || '—'}\nEmail: ${lead.email || '—'}\nPhone: ${lead.phone || '—'}\nCompany: ${lead.company || '—'}\nBudget: ${lead.budget || '—'}\nService: ${lead.service || '—'}\nSource: ${lead.source || 'website'}\nMessage: ${lead.message || '—'}`;

  if (!trans) {
    console.log('[EmailService] Lead notification (not sent — no SMTP configured):\n', text);
    return { success: true, simulated: true };
  }

  if (!to) {
    console.warn('[EmailService] No NOTIFICATION_EMAIL set — skipping send.');
    return { success: true, simulated: true };
  }

  try {
    const info = await trans.sendMail({
      from,
      to,
      subject: `🎯 New Lead: ${lead.name || 'Unknown'} — ${lead.service || 'General Enquiry'}`,
      text,
      html,
    });
    console.log('[EmailService] Lead notification sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('[EmailService] Failed to send lead notification:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send a confirmation email to the lead.
 * @param {Object} lead
 */
async function sendLeadConfirmation(lead) {
  if (!lead.email) return { success: false, error: 'No email address' };

  const from  = process.env.EMAIL_FROM || 'Catalyst <hello@catalystindia.com>';
  const trans = getTransporter();

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #7c3aed, #06b6d4); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Thanks for reaching out! 🚀</h1>
      </div>
      <p style="color: #374151; font-size: 16px;">Hi ${lead.name || 'there'},</p>
      <p style="color: #6b7280;">Thank you for your interest in Catalyst. We've received your enquiry and our team will get back to you within <strong>24 hours</strong>.</p>
      <p style="color: #6b7280;">Here's what happens next:</p>
      <ol style="color: #6b7280; line-height: 1.8;">
        <li>Our team reviews your requirements</li>
        <li>We prepare a custom proposal</li>
        <li>We schedule a free discovery call</li>
        <li>We kick off your project! 🎉</li>
      </ol>
      <p style="color: #6b7280;">In the meantime, feel free to browse our portfolio at <a href="https://catalystindia.com" style="color: #7c3aed;">catalystindia.com</a></p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
      <p style="color: #9ca3af; font-size: 12px;">Catalyst AI Agency | hello@catalystindia.com | India</p>
    </div>
  `;

  if (!trans) {
    console.log(`[EmailService] Confirmation not sent (no SMTP) for ${lead.email}`);
    return { success: true, simulated: true };
  }

  try {
    const info = await trans.sendMail({
      from,
      to:      lead.email,
      subject: `We received your enquiry — Catalyst AI Agency`,
      html,
      text: `Hi ${lead.name || 'there'},\n\nThank you for reaching out to Catalyst! Our team will get back to you within 24 hours.\n\nBest regards,\nCatalyst Team\nhello@catalystindia.com`,
    });
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('[EmailService] Confirmation email failed:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Generic send-mail helper.
 * @param {Object} options  — { to, subject, html, text }
 */
async function sendMail(options) {
  const from  = process.env.EMAIL_FROM || 'Catalyst <hello@catalystindia.com>';
  const trans = getTransporter();

  if (!trans) {
    console.log('[EmailService] sendMail skipped (no SMTP):', options.subject);
    return { success: true, simulated: true };
  }

  try {
    const info = await trans.sendMail({ from, ...options });
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('[EmailService] sendMail failed:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { sendLeadNotification, sendLeadConfirmation, sendMail };
