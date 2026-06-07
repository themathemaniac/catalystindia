/* ============================================================
   CATALYST — Mailer Utility
   Nodemailer wrapper for transactional emails
   ============================================================ */

'use strict';

const nodemailer = require('nodemailer');

/* ── Transporter Setup ──────────────────────────────────────── */
let transporter;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.EMAIL_HOST || process.env.SMTP_HOST;
  const user = process.env.EMAIL_USER || process.env.SMTP_USER;
  const pass = process.env.EMAIL_PASS || process.env.SMTP_PASS;
  const port = parseInt(process.env.EMAIL_PORT || process.env.SMTP_PORT, 10) || 587;

  // Use Ethereal (fake SMTP) if no real host is provided and we are in development
  if (!host && process.env.NODE_ENV === 'development') {
    console.log('[Mailer] Using Ethereal fake SMTP for development.');
    transporter = nodemailer.createTransport({
      host:   'smtp.ethereal.email',
      port:   587,
      auth:   {
        user: process.env.ETHEREAL_USER || 'ethereal.user@ethereal.email',
        pass: process.env.ETHEREAL_PASS || 'ethereal_pass',
      },
    });
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === 'true' || port === 465,
    auth:   { user, pass },
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production',
    },
  });

  return transporter;
}

const FROM = `"${process.env.FROM_NAME || 'Catalyst'}" <${process.env.FROM_EMAIL || process.env.EMAIL_USER || process.env.SMTP_USER || 'noreply@catalyst.com'}>`;

/**
 * Send contact form notification to the internal team.
 */
exports.sendContactNotification = async ({ to, subject, html }) => {
  const info = await getTransporter().sendMail({
    from: FROM,
    to,
    subject,
    html,
  });
  console.log(`[Mailer] Contact notification sent. MsgId: ${info.messageId}`);
  if (info.messageId && nodemailer.getTestMessageUrl(info)) {
    console.log(`[Mailer] Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
  }
  return info;
};

/**
 * Send an auto-reply confirmation to the form submitter.
 */
exports.sendAutoReply = async ({ to, subject, html }) => {
  const info = await getTransporter().sendMail({
    from: FROM,
    to,
    subject,
    html,
  });
  console.log(`[Mailer] Auto-reply sent to ${to}. MsgId: ${info.messageId}`);
  return info;
};

/**
 * Send newsletter subscription confirmation.
 */
exports.sendNewsletterConfirmation = async ({ to, subject, name }) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0C0D11; color: #EDF1F7; padding: 32px; border-radius: 12px;">
      <h2 style="color: #60A5FA;">Welcome aboard, ${name}! 🎉</h2>
      <p style="color: #8E9DAF; line-height: 1.7;">
        You've successfully subscribed to the <strong style="color: #EDF1F7;">Catalyst Newsletter</strong>.
        Expect insights on digital strategy, web design trends, and business growth tips — delivered monthly.
      </p>
      <p style="color: #8E9DAF; line-height: 1.7;">
        If you ever want to unsubscribe, just reply with "unsubscribe" and we'll take care of it immediately.
      </p>
      <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid rgba(162,178,200,0.1); color: #4E5A70; font-size: 12px;">
        <strong style="color: #6E7E94;">Catalyst</strong> · Premium digital presence for ambitious businesses<br/>
        hello@catalyst.com · +1 (555) 123-4567
      </div>
    </div>
  `;

  const info = await getTransporter().sendMail({
    from: FROM,
    to,
    subject,
    html,
  });
  console.log(`[Mailer] Newsletter confirmation sent to ${to}.`);
  return info;
};
