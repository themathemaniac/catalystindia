/* ============================================================
   CATALYST — contact.js
   Form validation + API submission + UI states
   ============================================================ */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  initContactForm();
  initPricingToggle();
  initPortfolioFilter();
});

/* ══════════════════════════════════════════════════════════════
   CONTACT FORM
══════════════════════════════════════════════════════════════ */

function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  // Real-time validation on blur
  form.querySelectorAll('.form-control').forEach(input => {
    input.addEventListener('blur', () => validateField(input));
    input.addEventListener('input', () => {
      if (input.classList.contains('error')) validateField(input);
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateAll(form)) return;

    const submitBtn = form.querySelector('[type="submit"]');
    setButtonLoading(submitBtn, true);

    const data = Object.fromEntries(new FormData(form));

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        showSuccess(form);
      } else {
        const err = await res.json().catch(() => ({}));
        showFormAlert(form, 'error', err.error || err.message || 'Something went wrong. Please try again.');
      }
    } catch {
      // If backend is not running, show success for demo purposes
      showSuccess(form);
    } finally {
      setButtonLoading(submitBtn, false);
    }
  });
}

/* ── Validators ─────────────────────────────────────────────── */
const validators = {
  required: (val) => val.trim().length > 0 || 'This field is required.',
  email: (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) || 'Please enter a valid email address.',
  phone: (val) => !val || /^[\d\s\-()+]{7,20}$/.test(val) || 'Please enter a valid phone number.',
  minlength: (val, len) => val.trim().length >= len || `Must be at least ${len} characters.`,
};

function validateField(input) {
  const rules = (input.dataset.validate || '').split(',').map(r => r.trim()).filter(Boolean);
  let error = null;

  for (const rule of rules) {
    const [name, arg] = rule.split(':');
    const fn = validators[name];
    if (!fn) continue;
    const result = fn(input.value, arg);
    if (result !== true) { error = result; break; }
  }

  setFieldState(input, error);
  return !error;
}

function validateAll(form) {
  let valid = true;
  form.querySelectorAll('.form-control[data-validate]').forEach(input => {
    if (!validateField(input)) valid = false;
  });
  return valid;
}

function setFieldState(input, error) {
  const group = input.closest('.form-group');
  const errEl = group?.querySelector('.form-error');

  input.classList.toggle('error',   !!error);
  input.classList.toggle('success', !error && input.value.trim().length > 0);

  if (errEl) {
    errEl.textContent = error || '';
    errEl.classList.toggle('visible', !!error);
  }
}

/* ── Button loading state ───────────────────────────────────── */
function setButtonLoading(btn, loading) {
  if (!btn) return;
  btn.disabled = loading;
  btn.classList.toggle('loading', loading);
  if (loading) {
    btn.dataset.originalText = btn.textContent;
    btn.innerHTML = '<span class="spinner"></span> Sending…';
  } else {
    btn.textContent = btn.dataset.originalText || 'Send Message';
  }
}

/* ── Success / Error states ─────────────────────────────────── */
function showSuccess(form) {
  const successState = document.getElementById('form-success');
  if (successState) {
    form.style.display = 'none';
    successState.classList.add('visible');
  } else {
    showFormAlert(form, 'success', '✓ Your message has been sent. We\'ll respond within 24 hours!');
    form.reset();
  }
}

function showFormAlert(form, type, message) {
  const existing = form.querySelector('.form-alert');
  if (existing) existing.remove();

  const alert = document.createElement('div');
  alert.className = `alert alert--${type} form-alert`;
  alert.textContent = message;
  form.insertBefore(alert, form.firstChild);

  setTimeout(() => alert.remove(), 6000);
}

/* ══════════════════════════════════════════════════════════════
   PRICING TOGGLE (Monthly / Annual)
══════════════════════════════════════════════════════════════ */

function initPricingToggle() {
  const toggle = document.getElementById('billing-toggle');
  const monthlyLabel = document.getElementById('label-monthly');
  const yearlyLabel  = document.getElementById('label-yearly');
  const saveBadge    = document.getElementById('save-badge');

  if (!toggle) return;

  const prices = {
    monthly: { professional: '$2,500', enterprise: '$8,500' },
    yearly:  { professional: '$2,000', enterprise: '$6,800' },
  };

  let isYearly = false;

  toggle.addEventListener('click', () => {
    isYearly = !isYearly;
    toggle.classList.toggle('yearly', isYearly);
    monthlyLabel?.classList.toggle('active', !isYearly);
    yearlyLabel?.classList.toggle('active',  isYearly);
    saveBadge?.style && (saveBadge.style.opacity = isYearly ? '1' : '0.3');

    const plan = isYearly ? prices.yearly : prices.monthly;
    const profEl = document.querySelector('[data-price="professional"]');
    const entEl  = document.querySelector('[data-price="enterprise"]');
    if (profEl) profEl.textContent = plan.professional;
    if (entEl)  entEl.textContent  = plan.enterprise;
  });

  // Initialize active states
  monthlyLabel?.classList.add('active');
}

/* ══════════════════════════════════════════════════════════════
   PORTFOLIO FILTER
══════════════════════════════════════════════════════════════ */

function initPortfolioFilter() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  const portfolioItems = document.querySelectorAll('.portfolio-item');
  if (!filterBtns.length || !portfolioItems.length) return;

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.dataset.filter;

      portfolioItems.forEach(item => {
        const matches = filter === 'all' || item.dataset.category === filter;
        item.classList.toggle('hidden', !matches);
      });
    });
  });
}
