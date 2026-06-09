/* ============================================================
   CATALYST — animations.js
   Scroll-reveal (IntersectionObserver) + Particle Canvas
   ============================================================ */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  initScrollReveal();
  initParticleCanvas();
  initStaggerChildren();
});

/* ── Scroll Reveal ──────────────────────────────────────────── */
function initScrollReveal() {
  const revealEls = document.querySelectorAll(
    '.reveal, .reveal-left, .reveal-right, .reveal-scale'
  );
  if (!revealEls.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target); // only trigger once
        }
      });
    },
    { rootMargin: '0px 0px -60px 0px', threshold: 0.08 }
  );

  revealEls.forEach(el => observer.observe(el));
}

/* ── Auto-stagger grid children ─────────────────────────────── */
function initStaggerChildren() {
  const grids = document.querySelectorAll('[data-stagger]');
  grids.forEach(grid => {
    const children = grid.children;
    Array.from(children).forEach((child, i) => {
      child.classList.add('reveal');
      child.style.transitionDelay = `${i * 70}ms`;
    });
  });

  // Re-run scroll reveal after adding classes
  initScrollReveal();
}

/* ── Particle Canvas ────────────────────────────────────────── */
function initParticleCanvas() {
  const canvas = document.getElementById('particle-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let particles = [];
  let animId = null;
  let width, height;

  function resize() {
    width = canvas.width = canvas.offsetWidth;
    height = canvas.height = canvas.offsetHeight;
  }

  class Particle {
    constructor() {
      this.reset();
    }

    reset() {
      this.x  = Math.random() * width;
      this.y  = Math.random() * height;
      this.vx = (Math.random() - 0.5) * 0.35;
      this.vy = (Math.random() - 0.5) * 0.35;
      this.r  = Math.random() * 1.5 + 0.4;
      this.alpha = Math.random() * 0.5 + 0.08;
      // Subtle twinkle
      this.twinkleSpeed = Math.random() * 0.015 + 0.005;
      this.twinkleDir   = Math.random() > 0.5 ? 1 : -1;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;

      // Bounce off walls
      if (this.x < 0 || this.x > width)  this.vx *= -1;
      if (this.y < 0 || this.y > height) this.vy *= -1;

      // Twinkle
      this.alpha += this.twinkleSpeed * this.twinkleDir;
      if (this.alpha > 0.58 || this.alpha < 0.06) this.twinkleDir *= -1;
    }

    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(162, 178, 200, ${this.alpha})`;
      ctx.fill();
    }
  }

  function initParticles() {
    particles = [];
    const count = Math.min(90, Math.floor((width * height) / 9000));
    for (let i = 0; i < count; i++) {
      particles.push(new Particle());
    }
  }

  function drawConnections() {
    const maxDist = 130;
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx   = particles[i].x - particles[j].x;
        const dy   = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < maxDist) {
          const alpha = (1 - dist / maxDist) * 0.18;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(59, 130, 246, ${alpha})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
  }

  function animate() {
    ctx.clearRect(0, 0, width, height);
    particles.forEach(p => { p.update(); p.draw(); });
    drawConnections();
    animId = requestAnimationFrame(animate);
  }

  function stop() {
    if (animId) cancelAnimationFrame(animId);
  }

  // Init
  resize();
  initParticles();
  animate();

  // Resize handler
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      stop();
      resize();
      initParticles();
      animate();
    }, 200);
  });

  // Pause when tab is hidden
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else animate();
  });
}
