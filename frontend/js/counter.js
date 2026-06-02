/* ============================================================
   CATALYST — counter.js
   Animated number counter triggered by IntersectionObserver
   ============================================================ */

'use strict';

document.addEventListener('DOMContentLoaded', initCounters);

function initCounters() {
  const counters = document.querySelectorAll('[data-count]');
  if (!counters.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );

  counters.forEach(el => observer.observe(el));
}

/**
 * Animates a counter element from 0 to its data-count value.
 * Supports suffixes like '+', '%', 'k', 'x', 'M'
 * @param {HTMLElement} el
 */
function animateCounter(el) {
  const target   = parseFloat(el.dataset.count);
  const suffix   = el.dataset.suffix || '';
  const prefix   = el.dataset.prefix || '';
  const duration = parseInt(el.dataset.duration, 10) || 1800;
  const decimals = parseInt(el.dataset.decimals, 10) || 0;

  const startTime = performance.now();

  function update(currentTime) {
    const elapsed  = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Ease out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = eased * target;

    el.textContent = prefix + formatNumber(current, decimals) + suffix;

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      el.textContent = prefix + formatNumber(target, decimals) + suffix;
    }
  }

  requestAnimationFrame(update);
}

function formatNumber(num, decimals) {
  if (decimals > 0) return num.toFixed(decimals);
  return Math.floor(num).toLocaleString();
}
