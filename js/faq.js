/* ============================================================
   CATALYST — faq.js
   FAQ accordion + search filter + category tabs
   ============================================================ */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  initFaqAccordion();
  initFaqSearch();
  initFaqTabs();
});

/* ── Accordion ──────────────────────────────────────────────── */
function initFaqAccordion() {
  const questions = document.querySelectorAll('.faq-question');
  if (!questions.length) return;

  questions.forEach(question => {
    question.addEventListener('click', () => {
      const item = question.closest('.faq-item');
      const isActive = item.classList.contains('active');

      // Close all open items (optional: single-open mode)
      // Uncomment below for single-open mode:
      // document.querySelectorAll('.faq-item.active').forEach(i => i.classList.remove('active'));

      item.classList.toggle('active', !isActive);
      question.setAttribute('aria-expanded', !isActive);
    });
  });

  // Open first item by default
  const firstItem = document.querySelector('.faq-item');
  if (firstItem) {
    firstItem.classList.add('active');
    const firstQ = firstItem.querySelector('.faq-question');
    if (firstQ) firstQ.setAttribute('aria-expanded', 'true');
  }
}

/* ── Search Filter ──────────────────────────────────────────── */
function initFaqSearch() {
  const searchInput = document.getElementById('faq-search');
  if (!searchInput) return;

  const noResults = document.getElementById('faq-no-results');

  searchInput.addEventListener('input', debounce(() => {
    const query = searchInput.value.trim().toLowerCase();
    const items = document.querySelectorAll('.faq-item');
    let visibleCount = 0;

    items.forEach(item => {
      const questionText = item.querySelector('.faq-question')?.textContent.toLowerCase() || '';
      const answerText   = item.querySelector('.faq-answer')?.textContent.toLowerCase() || '';
      const matches = !query || questionText.includes(query) || answerText.includes(query);

      item.style.display = matches ? '' : 'none';
      if (matches) visibleCount++;

      // Highlight matched text
      if (query && matches) {
        highlightText(item.querySelector('.faq-question span'), query);
      } else {
        clearHighlight(item.querySelector('.faq-question span'));
      }
    });

    // Category titles
    document.querySelectorAll('.faq-category-title').forEach(title => {
      const nextSiblings = [];
      let next = title.nextElementSibling;
      while (next && !next.classList.contains('faq-category-title')) {
        if (next.classList.contains('faq-item')) nextSiblings.push(next);
        next = next.nextElementSibling;
      }
      const anyVisible = nextSiblings.some(s => s.style.display !== 'none');
      title.style.display = anyVisible ? '' : 'none';
    });

    if (noResults) {
      noResults.classList.toggle('visible', visibleCount === 0);
    }
  }, 220));
}

function highlightText(el, query) {
  if (!el) return;
  const text = el.textContent;
  const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
  el.innerHTML = text.replace(regex, '<mark style="background:rgba(59,130,246,0.25);color:inherit;border-radius:2px;padding:0 2px;">$1</mark>');
}

function clearHighlight(el) {
  if (!el) return;
  el.textContent = el.textContent; // strips HTML
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/* ── Category Tabs ──────────────────────────────────────────── */
function initFaqTabs() {
  const tabs = document.querySelectorAll('.faq-tab');
  if (!tabs.length) return;

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const category = tab.dataset.category;
      const allItems  = document.querySelectorAll('.faq-item');
      const allTitles = document.querySelectorAll('.faq-category-title');

      allItems.forEach(item => {
        item.style.display = (category === 'all' || item.dataset.category === category) ? '' : 'none';
      });

      allTitles.forEach(title => {
        title.style.display = (category === 'all' || title.dataset.category === category) ? '' : 'none';
      });
    });
  });
}

/* ── Utility ────────────────────────────────────────────────── */
function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
