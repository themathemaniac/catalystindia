/* ============================================================
   CATALYST — Newsletter Route
   POST /api/newsletter
   ============================================================ */

'use strict';

const express              = require('express');
const router               = express.Router();
const { newsletterRateLimiter } = require('../middleware/rateLimiter');
const { validateNewsletter }    = require('../middleware/validator');
const newsletterController      = require('../controllers/newsletterController');

router.post(
  '/',
  newsletterRateLimiter,
  validateNewsletter,
  newsletterController.subscribe
);

module.exports = router;
