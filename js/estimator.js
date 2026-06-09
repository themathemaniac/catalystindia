/**
 * estimator.js — Catalyst AI Agency Project Cost Estimator
 * Multi-step wizard: Services → Timeline → Complexity → Results
 * Injects full HTML into #estimator-root
 */
(function () {
  'use strict';

  // ── SERVICE DATA ─────────────────────────────────────────────
  const SERVICES = [
    { id: 'web-basic',   name: 'Website Basic',       icon: '🌐', minPrice: 25000,  maxPrice: 50000  },
    { id: 'web-adv',     name: 'Website Advanced',    icon: '🚀', minPrice: 75000,  maxPrice: 150000 },
    { id: 'ai-chatbot',  name: 'AI Chatbot',          icon: '🤖', minPrice: 30000,  maxPrice: 80000  },
    { id: 'saas-mvp',    name: 'SaaS MVP',            icon: '⚡', minPrice: 200000, maxPrice: 500000 },
    { id: 'mobile-app',  name: 'Mobile App',          icon: '📱', minPrice: 150000, maxPrice: 400000 },
    { id: 'crm',         name: 'CRM Integration',     icon: '🔗', minPrice: 40000,  maxPrice: 100000 },
    { id: 'whatsapp',    name: 'WhatsApp Bot',        icon: '💬', minPrice: 20000,  maxPrice: 60000  },
    { id: 'ai-agent',    name: 'AI Agent',            icon: '🧠', minPrice: 50000,  maxPrice: 150000 },
    { id: 'api',         name: 'API Integration',     icon: '🔌', minPrice: 15000,  maxPrice: 50000  },
    { id: 'automation',  name: 'Business Automation', icon: '⚙️', minPrice: 35000,  maxPrice: 100000 },
  ];

  const TIMELINES = [
    { id: 'rush',     label: 'Rush',     icon: '⚡',  desc: '< 2 weeks',    modifier: 1.3,  modifierLabel: '+30% Rush Fee'  },
    { id: 'standard', label: 'Standard', icon: '📅',  desc: '2–4 weeks',    modifier: 1.0,  modifierLabel: 'Best Value'     },
    { id: 'relaxed',  label: 'Relaxed',  icon: '🌿',  desc: '1–3 months',   modifier: 0.9,  modifierLabel: '−10% Discount'  },
    { id: 'flexible', label: 'Flexible', icon: '🕊️', desc: '3+ months',    modifier: 0.85, modifierLabel: '−15% Discount'  },
  ];

  const COMPLEXITY = [
    { id: 'low',    label: 'Low',    icon: '🟢', desc: 'Simple features, no custom integrations',    multiplier: 1.0, badge: 'low'    },
    { id: 'medium', label: 'Medium', icon: '🟡', desc: 'Custom integrations, moderate complexity',   multiplier: 1.4, badge: 'medium' },
    { id: 'high',   label: 'High',   icon: '🔴', desc: 'Enterprise-grade, AI-heavy features',        multiplier: 1.8, badge: 'high'   },
  ];

  const STEPS = [
    { label: 'Services'   },
    { label: 'Timeline'   },
    { label: 'Complexity' },
    { label: 'Results'    },
  ];

  // ── STATE ────────────────────────────────────────────────────
  let state = {
    currentStep: 1,
    selectedServices: [],   // array of service ids
    selectedTimeline: 'standard',
    selectedComplexity: 'medium',
    result: null,
  };

  // ── DOM CACHE ────────────────────────────────────────────────
  let root = null;  // #estimator-root

  // ── FORMAT HELPERS ───────────────────────────────────────────
  /**
   * Format a number in Indian Rupee locale (e.g. ₹1,50,000)
   * @param {number} amount
   * @returns {string}
   */
  function formatINR(amount) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.round(amount));
  }

  /**
   * Short format for display in cards (e.g. ₹25K, ₹1.5L)
   * @param {number} amount
   * @returns {string}
   */
  function formatShort(amount) {
    if (amount >= 100000) {
      const l = amount / 100000;
      return '₹' + (Number.isInteger(l) ? l : l.toFixed(1)) + 'L';
    }
    if (amount >= 1000) {
      const k = amount / 1000;
      return '₹' + (Number.isInteger(k) ? k : k.toFixed(1)) + 'K';
    }
    return '₹' + amount;
  }

  // ── CALCULATION ──────────────────────────────────────────────
  /**
   * Calculate estimate from current state.
   * @returns {{ minTotal: number, maxTotal: number, breakdown: Array<{id,name,icon,min,max}> }}
   */
  function calculateEstimate() {
    const timeline   = TIMELINES.find(t => t.id === state.selectedTimeline)   || TIMELINES[1];
    const complexity = COMPLEXITY.find(c => c.id === state.selectedComplexity) || COMPLEXITY[1];

    const breakdown = state.selectedServices.map(sid => {
      const svc = SERVICES.find(s => s.id === sid);
      if (!svc) return null;
      return {
        id:   svc.id,
        name: svc.name,
        icon: svc.icon,
        min:  Math.round(svc.minPrice * complexity.multiplier * timeline.modifier),
        max:  Math.round(svc.maxPrice * complexity.multiplier * timeline.modifier),
      };
    }).filter(Boolean);

    const minTotal = breakdown.reduce((acc, b) => acc + b.min, 0);
    const maxTotal = breakdown.reduce((acc, b) => acc + b.max, 0);

    return { minTotal, maxTotal, breakdown, timeline, complexity };
  }

  // ── ANIMATED COUNTER ─────────────────────────────────────────
  /**
   * Animate a number from start to end using requestAnimationFrame.
   * @param {HTMLElement} el      — element whose textContent to update
   * @param {number}      start
   * @param {number}      end
   * @param {number}      duration — milliseconds
   * @param {Function}    formatFn — (value) => string
   */
  function animateCounter(el, start, end, duration, formatFn) {
    if (!el) return;
    const startTime = performance.now();
    function tick(now) {
      const elapsed  = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const value  = start + (end - start) * eased;
      el.textContent = formatFn(value);
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // ── LOADING OVERLAY ──────────────────────────────────────────
  function showLoading() {
    const overlay = root.querySelector('.estimator-loading');
    if (overlay) overlay.classList.remove('hidden');
  }

  function hideLoading() {
    const overlay = root.querySelector('.estimator-loading');
    if (overlay) overlay.classList.add('hidden');
  }

  // ── VALIDATION ERROR ─────────────────────────────────────────
  function showError(msg) {
    const errEl = root.querySelector('.estimator-error');
    if (!errEl) return;
    errEl.textContent = msg;
    errEl.classList.add('visible');
    setTimeout(() => errEl.classList.remove('visible'), 3000);
  }

  // ── STEP INDICATORS ─────────────────────────────────────────
  function renderStepIndicators() {
    const indicators = root.querySelectorAll('.step-indicator');
    indicators.forEach((ind, i) => {
      const stepNum = i + 1;
      ind.classList.remove('active', 'done');
      if (stepNum < state.currentStep)  ind.classList.add('done');
      if (stepNum === state.currentStep) ind.classList.add('active');
    });
  }

  // ── STEP PANELS ──────────────────────────────────────────────
  function goToStep(n) {
    state.currentStep = n;
    renderStepIndicators();

    // Hide all panels, show the target
    root.querySelectorAll('.step-panel').forEach(p => p.classList.remove('active'));
    const target = root.querySelector('[data-step="' + n + '"]');
    if (target) target.classList.add('active');

    // Back button
    const backBtn = root.querySelector('.btn-est-back');
    if (backBtn) {
      backBtn.disabled = (n === 1);
      backBtn.style.opacity = (n === 1) ? '0.3' : '1';
      backBtn.style.cursor  = (n === 1) ? 'not-allowed' : 'pointer';
    }

    // Next button label
    const nextBtn = root.querySelector('.btn-est-next');
    if (nextBtn) {
      if (n === STEPS.length) {
        nextBtn.style.display = 'none';
      } else {
        nextBtn.style.display = '';
        nextBtn.textContent = (n === STEPS.length - 1) ? 'Calculate →' : 'Next →';
      }
    }

    // If results step, render them
    if (n === 4) renderResults();
  }

  // ── RENDER STEP 1: SERVICES ──────────────────────────────────
  function renderStep1() {
    const panel = root.querySelector('[data-step="1"]');
    if (!panel) return;

    const grid = panel.querySelector('.service-grid');
    if (!grid) return;

    grid.innerHTML = SERVICES.map(svc => {
      const isSelected = state.selectedServices.includes(svc.id);
      return `
        <label class="service-card${isSelected ? ' selected' : ''}" data-id="${svc.id}">
          <input type="checkbox" name="service" value="${svc.id}"${isSelected ? ' checked' : ''}>
          <span class="check-badge" aria-hidden="true">✓</span>
          <span class="service-card-icon">${svc.icon}</span>
          <div class="service-card-name">${svc.name}</div>
          <div class="service-card-price">${formatShort(svc.minPrice)} – ${formatShort(svc.maxPrice)}</div>
        </label>
      `;
    }).join('');

    // Attach click listeners
    grid.querySelectorAll('.service-card').forEach(card => {
      card.addEventListener('click', function () {
        const checkbox = this.querySelector('input[type="checkbox"]');
        const id = this.dataset.id;
        if (!checkbox) return;

        checkbox.checked = !checkbox.checked;

        if (checkbox.checked) {
          if (!state.selectedServices.includes(id)) {
            state.selectedServices.push(id);
          }
          this.classList.add('selected');
        } else {
          state.selectedServices = state.selectedServices.filter(s => s !== id);
          this.classList.remove('selected');
        }
      });
    });
  }

  // ── RENDER STEP 2: TIMELINE ──────────────────────────────────
  function renderStep2() {
    const panel = root.querySelector('[data-step="2"]');
    if (!panel) return;

    const container = panel.querySelector('.timeline-options');
    if (!container) return;

    container.innerHTML = TIMELINES.map(tl => {
      const isSelected = state.selectedTimeline === tl.id;
      return `
        <label class="timeline-option${isSelected ? ' selected' : ''}" data-id="${tl.id}">
          <input type="radio" name="timeline" value="${tl.id}"${isSelected ? ' checked' : ''}>
          <span class="timeline-icon">${tl.icon}</span>
          <div class="timeline-label">${tl.label}</div>
          <div class="timeline-desc">${tl.desc}</div>
          <span class="timeline-modifier">${tl.modifierLabel}</span>
        </label>
      `;
    }).join('');

    container.querySelectorAll('.timeline-option').forEach(opt => {
      opt.addEventListener('click', function () {
        const id = this.dataset.id;
        state.selectedTimeline = id;

        container.querySelectorAll('.timeline-option').forEach(o => {
          o.classList.toggle('selected', o.dataset.id === id);
          const radio = o.querySelector('input[type="radio"]');
          if (radio) radio.checked = (o.dataset.id === id);
        });
      });
    });
  }

  // ── RENDER STEP 3: COMPLEXITY ────────────────────────────────
  function renderStep3() {
    const panel = root.querySelector('[data-step="3"]');
    if (!panel) return;

    const container = panel.querySelector('.complexity-options');
    if (!container) return;

    container.innerHTML = COMPLEXITY.map(cx => {
      const isSelected = state.selectedComplexity === cx.id;
      return `
        <label class="complexity-option${isSelected ? ' selected' : ''}" data-id="${cx.id}">
          <input type="radio" name="complexity" value="${cx.id}"${isSelected ? ' checked' : ''}>
          <span class="complexity-icon">${cx.icon}</span>
          <div class="complexity-label">${cx.label}</div>
          <div class="complexity-desc">${cx.desc}</div>
          <span class="complexity-badge ${cx.badge}">${cx.label} Complexity</span>
        </label>
      `;
    }).join('');

    container.querySelectorAll('.complexity-option').forEach(opt => {
      opt.addEventListener('click', function () {
        const id = this.dataset.id;
        state.selectedComplexity = id;

        container.querySelectorAll('.complexity-option').forEach(o => {
          o.classList.toggle('selected', o.dataset.id === id);
          const radio = o.querySelector('input[type="radio"]');
          if (radio) radio.checked = (o.dataset.id === id);
        });
      });
    });
  }

  // ── RENDER STEP 4: RESULTS ───────────────────────────────────
  function renderResults() {
    const panel = root.querySelector('[data-step="4"]');
    if (!panel) return;

    const estimate = calculateEstimate();
    state.result = estimate;

    // Populate breakdown table
    const tbody = panel.querySelector('#breakdown-tbody');
    if (tbody) {
      tbody.innerHTML = estimate.breakdown.map(b => `
        <tr>
          <td><span class="breakdown-icon">${b.icon}</span>${b.name}</td>
          <td>${formatINR(b.min)} – ${formatINR(b.max)}</td>
        </tr>
      `).join('');
    }

    // Modifiers row
    const modRow = panel.querySelector('#modifier-info');
    if (modRow) {
      const tl = estimate.timeline;
      const cx = estimate.complexity;
      modRow.textContent = `${cx.label} complexity (×${cx.multiplier}) · ${tl.label} timeline (${tl.modifierLabel})`;
    }

    // Animate main price display
    const minEl  = panel.querySelector('#result-min');
    const maxEl  = panel.querySelector('#result-max');
    const rangeEl = panel.querySelector('#result-range');

    if (minEl) {
      animateCounter(minEl, 0, estimate.minTotal, 1200, v => formatINR(v));
    }
    if (rangeEl) {
      setTimeout(() => {
        if (maxEl) animateCounter(maxEl, 0, estimate.maxTotal, 900, v => formatINR(v));
      }, 200);
    }

    // Try API call and update if successful
    calculateWithAPI(estimate).then(apiResult => {
      if (apiResult) {
        state.result = apiResult;
        // Re-animate with server-side result if different
        if (minEl) animateCounter(minEl, estimate.minTotal, apiResult.minTotal, 600, v => formatINR(v));
        if (maxEl) animateCounter(maxEl, estimate.maxTotal, apiResult.maxTotal, 600, v => formatINR(v));
      }
    }).catch(() => { /* silently use client-side result */ });
  }

  // ── API CALL ─────────────────────────────────────────────────
  /**
   * POST to /api/estimator/calculate. Falls back to client-side on failure.
   * @param {object} clientEstimate — pre-calculated estimate to use as fallback
   * @returns {Promise<object|null>}
   */
  async function calculateWithAPI(clientEstimate) {
    try {
      const payload = {
        services:   state.selectedServices,
        timeline:   state.selectedTimeline,
        complexity: state.selectedComplexity,
      };

      const response = await fetch('/api/estimator/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) return null;

      const data = await response.json();
      if (data && typeof data.minTotal === 'number' && typeof data.maxTotal === 'number') {
        return data;
      }
      return null;
    } catch {
      return null;
    }
  }

  // ── NAVIGATION ───────────────────────────────────────────────
  function nextStep() {
    const step = state.currentStep;

    // Validate step 1: at least one service selected
    if (step === 1) {
      if (state.selectedServices.length === 0) {
        showError('Please select at least one service to continue.');
        return;
      }
    }

    if (step < STEPS.length) {
      goToStep(step + 1);
      // Re-render the new step's interactive elements
      if (step + 1 === 2) renderStep2();
      if (step + 1 === 3) renderStep3();
    }
  }

  function prevStep() {
    if (state.currentStep > 1) {
      goToStep(state.currentStep - 1);
    }
  }

  // ── RESET ────────────────────────────────────────────────────
  function resetEstimator() {
    state = {
      currentStep: 1,
      selectedServices: [],
      selectedTimeline: 'standard',
      selectedComplexity: 'medium',
      result: null,
    };
    renderStep1();
    goToStep(1);
  }

  // ── GET QUOTE CTA ─────────────────────────────────────────────
  function handleGetQuote() {
    // Try to open chatbot first
    if (window.catalystChatbot && typeof window.catalystChatbot.open === 'function') {
      window.catalystChatbot.open();
      return;
    }
    // Fallback: scroll to contact section
    const contactSection = document.getElementById('contact')
      || document.querySelector('.contact-section')
      || document.querySelector('[data-section="contact"]');

    if (contactSection) {
      contactSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      // Last resort — navigate to contact anchor
      window.location.href = '#contact';
    }
  }

  // ── BUILD HTML ───────────────────────────────────────────────
  function buildHTML() {
    // Step indicators HTML
    const stepsHTML = STEPS.map((s, i) => `
      <div class="step-indicator${i === 0 ? ' active' : ''}" data-step="${i + 1}">
        <div class="step-dot"><span class="step-num">${i + 1}</span></div>
        <span class="step-label">${s.label}</span>
      </div>
    `).join('');

    return `
      <section class="estimator-section" id="estimator">
        <div class="estimator-container">

          <!-- Section Header -->
          <div class="estimator-header">
            <div class="estimator-badge">💰 Project Estimator</div>
            <h2 class="estimator-heading">Get an Instant <span>Cost Estimate</span></h2>
            <p class="estimator-subheading">
              Answer 3 quick questions and we'll give you a transparent ballpark figure —
              no signup required.
            </p>
          </div>

          <!-- Glass Card -->
          <div class="estimator-card" style="position:relative;">

            <!-- Loading Overlay -->
            <div class="estimator-loading hidden" aria-hidden="true">
              <div class="loading-dots">
                <span></span><span></span><span></span>
              </div>
              <div class="estimator-loading-text">Calculating your estimate…</div>
            </div>

            <!-- Step Progress -->
            <div class="estimator-steps" role="list" aria-label="Estimator steps">
              ${stepsHTML}
            </div>

            <!-- ── STEP 1: Services ── -->
            <div class="step-panel active" data-step="1" role="tabpanel">
              <h3 class="step-title">What do you need built?</h3>
              <p class="step-subtitle">Select all services that apply — you can choose more than one.</p>
              <div class="service-grid"></div>
            </div>

            <!-- ── STEP 2: Timeline ── -->
            <div class="step-panel" data-step="2" role="tabpanel">
              <h3 class="step-title">What's your timeline?</h3>
              <p class="step-subtitle">Rush timelines carry a fee; longer timelines earn a discount.</p>
              <div class="timeline-options"></div>
            </div>

            <!-- ── STEP 3: Complexity ── -->
            <div class="step-panel" data-step="3" role="tabpanel">
              <h3 class="step-title">How complex is your project?</h3>
              <p class="step-subtitle">Be honest — this affects the estimate accuracy.</p>
              <div class="complexity-options"></div>
            </div>

            <!-- ── STEP 4: Results ── -->
            <div class="step-panel" data-step="4" role="tabpanel">
              <div class="results-panel">
                <div class="result-price-label">Estimated Investment Range</div>
                <div class="result-price" id="result-min">₹0</div>
                <div class="result-price-range">to <span id="result-max">₹0</span></div>
                <div class="result-note" id="modifier-info"></div>

                <!-- Breakdown Table -->
                <table class="breakdown-table" aria-label="Cost breakdown by service">
                  <thead>
                    <tr>
                      <th>Service</th>
                      <th style="text-align:right;">Estimated Range</th>
                    </tr>
                  </thead>
                  <tbody id="breakdown-tbody"></tbody>
                </table>

                <!-- CTAs -->
                <div class="result-cta-row">
                  <button class="btn-quote-primary" id="btn-get-exact-quote" type="button">
                    💬 Get Exact Quote
                  </button>
                  <button class="btn-quote-secondary" id="btn-start-over" type="button">
                    🔄 Start Over
                  </button>
                </div>
              </div>
            </div>

            <!-- Validation Error -->
            <div class="estimator-error" role="alert" aria-live="assertive"></div>

            <!-- Navigator -->
            <div class="estimator-nav">
              <button class="btn-est-back" id="est-back" type="button" disabled>← Back</button>
              <button class="btn-est-next" id="est-next" type="button">Next →</button>
            </div>

          </div><!-- /.estimator-card -->
        </div><!-- /.estimator-container -->
      </section>
    `;
  }

  // ── ATTACH EVENTS ────────────────────────────────────────────
  function attachEvents() {
    // Navigation buttons
    const nextBtn = root.querySelector('#est-next');
    const backBtn = root.querySelector('#est-back');

    if (nextBtn) nextBtn.addEventListener('click', nextStep);
    if (backBtn) backBtn.addEventListener('click', prevStep);

    // Result CTAs
    root.addEventListener('click', function (e) {
      if (e.target.id === 'btn-get-exact-quote') handleGetQuote();
      if (e.target.id === 'btn-start-over')      resetEstimator();
    });

    // Keyboard: allow Enter to advance
    root.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') {
        nextStep();
      }
    });
  }

  // ── INIT ─────────────────────────────────────────────────────
  function init() {
    root = document.getElementById('estimator-root');
    if (!root) return; // silently exit if no mount point

    // Inject HTML
    root.innerHTML = buildHTML();

    // Initial render of step 1 cards
    renderStep1();

    // Set up navigation state
    goToStep(1);

    // Attach all event listeners
    attachEvents();
  }

  // ── PUBLIC API ───────────────────────────────────────────────
  window.estimatorInit = init;

  // ── AUTO-INIT on DOM Ready ───────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // DOM already ready (e.g. script loaded late)
    init();
  }

})();
