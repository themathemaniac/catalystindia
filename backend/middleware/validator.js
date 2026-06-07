/* ============================================================
   CATALYST — Input Validators
   Uses express-validator to define field rules
   ============================================================ */

'use strict';

const { body } = require('express-validator');

/* ── Contact Form ───────────────────────────────────────────── */
exports.validateContact = [
  body('firstName')
    .trim()
    .notEmpty().withMessage('First name is required.')
    .isLength({ max: 64 }).withMessage('First name must be under 64 characters.')
    .escape(),

  body('lastName')
    .trim()
    .notEmpty().withMessage('Last name is required.')
    .isLength({ max: 64 }).withMessage('Last name must be under 64 characters.')
    .escape(),

  body('email')
    .trim()
    .notEmpty().withMessage('Email address is required.')
    .isEmail().withMessage('Please enter a valid email address.')
    .normalizeEmail()
    .isLength({ max: 254 }).withMessage('Email address is too long.'),

  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^[\d\s\-()+]{7,20}$/).withMessage('Please enter a valid phone number.')
    .escape(),

  body('company')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 128 }).withMessage('Company name must be under 128 characters.')
    .escape(),

  body('service')
    .trim()
    .notEmpty().withMessage('Please select a service.')
    .isIn([
      'fullstack', 'ai-automation', 'chatbots', 'saas', 'web', 'whatsapp', 'custom',
      'website', 'ecommerce', 'automation', 'branding', 'analytics', 'support'
    ]).withMessage('Invalid service selection.'),

  body('budget')
    .optional({ checkFalsy: true })
    .trim()
    .isIn(['<5k', '5-15k', '15-50k', '50k+', 'discuss'])
    .withMessage('Invalid budget selection.'),

  body('message')
    .trim()
    .notEmpty().withMessage('Message is required.')
    .isLength({ min: 20 }).withMessage('Message must be at least 20 characters.')
    .isLength({ max: 2000 }).withMessage('Message must be under 2000 characters.')
    .escape(),
];

/* ── Newsletter ─────────────────────────────────────────────── */
exports.validateNewsletter = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email address is required.')
    .isEmail().withMessage('Please enter a valid email address.')
    .normalizeEmail()
    .isLength({ max: 254 }).withMessage('Email address is too long.'),

  body('name')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 64 }).withMessage('Name must be under 64 characters.')
    .escape(),
];
