/* ============================================================
   CATALYST — main.js
   Entry point: Init all modules, nav, smooth scroll, scroll-spy
   ============================================================ */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  initMobileMenu();
  initSmoothScroll();
  initScrollSpy();
  setActiveNavLink();
});

/* ── Sticky Header ──────────────────────────────────────────── */
function initHeader() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  const onScroll = () => {
    if (window.scrollY > 40) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // run once on load
}

/* ── Mobile Menu ────────────────────────────────────────────── */
function initMobileMenu() {
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobile-menu');
  if (!hamburger || !mobileMenu) return;

  hamburger.addEventListener('click', () => {
    const isOpen = hamburger.classList.toggle('open');
    mobileMenu.classList.toggle('open', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
    hamburger.setAttribute('aria-expanded', isOpen);
  });

  // Close on link click
  mobileMenu.querySelectorAll('.mobile-nav-link').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('open');
      mobileMenu.classList.remove('open');
      document.body.style.overflow = '';
    });
  });

  // Close on outside click
  mobileMenu.addEventListener('click', (e) => {
    if (e.target === mobileMenu) {
      hamburger.classList.remove('open');
      mobileMenu.classList.remove('open');
      document.body.style.overflow = '';
    }
  });

  // Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mobileMenu.classList.contains('open')) {
      hamburger.classList.remove('open');
      mobileMenu.classList.remove('open');
      document.body.style.overflow = '';
    }
  });
}

/* ── Smooth Scroll for anchor links ─────────────────────────── */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (href === '#') return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      const offset = 90;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
}

/* ── Scroll Spy: highlight active nav link ───────────────────── */
function initScrollSpy() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link[href*="#"]');
  if (!sections.length || !navLinks.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const id = entry.target.id;
        navLinks.forEach(link => {
          link.classList.toggle('active', link.getAttribute('href').includes(`#${id}`));
        });
      });
    },
    { rootMargin: '-40% 0px -55% 0px', threshold: 0 }
  );

  sections.forEach(s => observer.observe(s));
}

/* ── Mark current page nav link active ──────────────────────── */
function setActiveNavLink() {
  const path = window.location.pathname;
  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href');
    if (!href) return;
    const linkPath = new URL(href, window.location.href).pathname;
    if (linkPath === path || (path.endsWith('/') && linkPath.endsWith('index.html'))) {
      link.classList.add('active');
    }
  });
}

/* ── Ripple Effect on Buttons ───────────────────────────────── */
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn--primary');
  if (!btn) return;

  const ripple = document.createElement('span');
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height) * 2;
  const x = e.clientX - rect.left - size / 2;
  const y = e.clientY - rect.top - size / 2;

  ripple.style.cssText = `
    position: absolute;
    width: ${size}px;
    height: ${size}px;
    left: ${x}px;
    top: ${y}px;
    border-radius: 50%;
    background: rgba(255,255,255,0.15);
    pointer-events: none;
    transform: scale(0);
    animation: ripple 0.65s ease-out forwards;
  `;

  btn.style.position = 'relative';
  btn.style.overflow = 'hidden';
  btn.appendChild(ripple);
  setTimeout(() => ripple.remove(), 700);
});

/* ── Custom Popup Notification ──────────────────────────────── */
window.showCustomPopup = function(message) {
  let popupContainer = document.getElementById('custom-popup-container');
  if (!popupContainer) {
    popupContainer = document.createElement('div');
    popupContainer.id = 'custom-popup-container';
    document.body.appendChild(popupContainer);
  }

  const popup = document.createElement('div');
  popup.className = 'custom-popup-notification';
  
  popup.innerHTML = `
    <div class="custom-popup-content">
      <div class="custom-popup-icon">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div class="custom-popup-text">${message}</div>
      <button class="custom-popup-close" aria-label="Close popup">&times;</button>
    </div>
    <div class="custom-popup-progress"></div>
  `;

  popupContainer.appendChild(popup);

  const closeBtn = popup.querySelector('.custom-popup-close');
  const closePopup = () => {
    popup.classList.add('hiding');
    setTimeout(() => popup.remove(), 400); // Wait for animation
  };

  closeBtn.addEventListener('click', closePopup);

  // Auto-close after 5 seconds
  setTimeout(closePopup, 5000);
};

