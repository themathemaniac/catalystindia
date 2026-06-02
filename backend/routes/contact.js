/* ============================================================
   CATALYST — Contact Route
   POST /api/contact
   ============================================================ */

'use strict';

const express           = require('express');
const router            = express.Router();
const { contactRateLimiter } = require('../middleware/rateLimiter');
const { validateContact }    = require('../middleware/validator');
const contactController      = require('../controllers/contactController');

router.post(
  '/',
  contactRateLimiter,
  validateContact,
  contactController.submit
);

module.exports = router;
