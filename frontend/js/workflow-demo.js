(function () {
  'use strict';

  /* ─────────────────────────────────────────────
     NODES CONFIG
  ───────────────────────────────────────────── */
  const NODES = [
    { id: 'lead',     label: 'Lead Comes In',       icon: '👤', color: '#3B82F6' },
    { id: 'qualify',  label: 'AI Qualifies',         icon: '🤖', color: '#8B5CF6' },
    { id: 'proposal', label: 'Proposal Generated',   icon: '📋', color: '#3B82F6' },
    { id: 'crm',      label: 'CRM Updated',          icon: '🔗', color: '#10B981' },
    { id: 'followup', label: 'Follow-up Sent',       icon: '✉️', color: '#F59E0B' },
  ];

  /* ─────────────────────────────────────────────
     CONSTANTS
  ───────────────────────────────────────────── */
  const NODE_W         = 140;
  const NODE_H         = 80;
  const CANVAS_H       = 200;
  const NODE_RADIUS    = 12;
  const DOT_RADIUS     = 7;
  const SEGMENT_MS     = 2000;   // time (ms) for a dot to traverse one segment
  const SPAWN_INTERVAL = 2500;   // ms between new dot spawns
  const PULSE_MS       = 800;    // ms a node glows after receiving dot

  /* ─────────────────────────────────────────────
     COLORS
  ───────────────────────────────────────────── */
  const CLR = {
    nodeBg:         'rgba(30, 34, 48, 0.92)',
    nodeBorderIdle: 'rgba(78, 90, 112, 0.5)',
    nodeText:       '#EDF1F7',
    connectionLine: 'rgba(78, 90, 112, 0.3)',
    dot:            '#60A5FA',
  };

  /* ─────────────────────────────────────────────
     STATE
  ───────────────────────────────────────────── */
  let canvas, ctx, dpr, paused = false;
  let canvasWidth = 0;
  let nodePositions = []; // { x, y } centres

  // Active travelling dots: { segmentIndex, progress }
  // segmentIndex: 0 = between node[0]→node[1], etc.
  let dots = [];

  // Per-node glow state: 0 = idle, >0 = glowing (countdown ms)
  let nodeGlow = new Array(NODES.length).fill(0);

  let lastTime        = 0;
  let lastSpawnTime   = -Infinity;
  let rafId           = null;

  /* ─────────────────────────────────────────────
     LAYOUT
  ───────────────────────────────────────────── */
  function recalcLayout() {
    const cw = canvas.parentElement
      ? canvas.parentElement.clientWidth
      : window.innerWidth;

    canvasWidth = Math.max(cw, 360);

    canvas.style.width  = canvasWidth + 'px';
    canvas.style.height = CANVAS_H + 'px';

    canvas.width  = Math.round(canvasWidth * dpr);
    canvas.height = Math.round(CANVAS_H    * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const totalNodes = NODES.length;
    const nodeY      = CANVAS_H / 2;
    const padding    = Math.max(NODE_W / 2 + 12, canvasWidth * 0.06);
    const usable     = canvasWidth - padding * 2;
    const gap        = usable / (totalNodes - 1);

    nodePositions = NODES.map((_, i) => ({
      x: Math.round(padding + i * gap),
      y: nodeY,
    }));
  }

  /* ─────────────────────────────────────────────
     DRAW HELPERS
  ───────────────────────────────────────────── */

  /**
   * Rounded rectangle helper (polyfill for older browsers).
   */
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y,     x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h,     x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y,         x + r, y);
    ctx.closePath();
  }

  /**
   * drawNode — renders a single workflow node.
   * @param {number} x         - centre x
   * @param {number} y         - centre y
   * @param {Object} node      - { label, icon, color }
   * @param {number} glowAmt   - 0 (idle) to 1 (fully glowing)
   */
  function drawNode(x, y, node, glowAmt) {
    const nx = x - NODE_W / 2;
    const ny = y - NODE_H / 2;

    ctx.save();

    /* ── Outer glow when active ── */
    if (glowAmt > 0) {
      ctx.shadowColor = node.color;
      ctx.shadowBlur  = 30 * glowAmt;
    }

    /* ── Background ── */
    roundRect(ctx, nx, ny, NODE_W, NODE_H, NODE_RADIUS);
    ctx.fillStyle = CLR.nodeBg;
    ctx.fill();

    /* ── Border ── */
    roundRect(ctx, nx, ny, NODE_W, NODE_H, NODE_RADIUS);
    if (glowAmt > 0) {
      ctx.strokeStyle = node.color;
      ctx.lineWidth   = 1.5 + glowAmt * 1.5;
    } else {
      ctx.strokeStyle = CLR.nodeBorderIdle;
      ctx.lineWidth   = 1.5;
    }
    ctx.stroke();

    ctx.shadowBlur  = 0;
    ctx.shadowColor = 'transparent';

    /* ── Icon (line 1) ── */
    ctx.font        = '18px serif';
    ctx.textAlign   = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(node.icon, x, y - 14);

    /* ── Label (line 2) ── */
    ctx.font         = '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle    = CLR.nodeText;
    ctx.textBaseline = 'middle';

    // Word-wrap into max 2 lines if needed
    const words     = node.label.split(' ');
    const maxW      = NODE_W - 16;
    let lines       = [];
    let currentLine = '';

    for (const word of words) {
      const test = currentLine ? currentLine + ' ' + word : word;
      if (ctx.measureText(test).width > maxW && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = test;
      }
    }
    if (currentLine) lines.push(currentLine);
    lines = lines.slice(0, 2);

    const lineH    = 13;
    const startY   = y + 8 - ((lines.length - 1) * lineH) / 2;
    lines.forEach((line, li) => {
      ctx.fillText(line, x, startY + li * lineH);
    });

    ctx.restore();
  }

  /**
   * drawConnection — horizontal line with arrowhead.
   */
  function drawConnection(x1, x2, y) {
    const pad = NODE_W / 2 + 6;
    const sx  = x1 + pad;
    const ex  = x2 - pad;

    if (ex <= sx) return;

    ctx.save();

    /* ── Gradient line ── */
    const grad = ctx.createLinearGradient(sx, y, ex, y);
    grad.addColorStop(0,   'rgba(78, 90, 112, 0.15)');
    grad.addColorStop(0.5, 'rgba(96, 165, 250, 0.35)');
    grad.addColorStop(1,   'rgba(78, 90, 112, 0.15)');

    ctx.beginPath();
    ctx.moveTo(sx, y);
    ctx.lineTo(ex - 8, y);
    ctx.strokeStyle = grad;
    ctx.lineWidth   = 1.5;
    ctx.stroke();

    /* ── Arrowhead ── */
    ctx.beginPath();
    ctx.moveTo(ex,     y);
    ctx.lineTo(ex - 9, y - 5);
    ctx.lineTo(ex - 9, y + 5);
    ctx.closePath();
    ctx.fillStyle = 'rgba(96, 165, 250, 0.5)';
    ctx.fill();

    ctx.restore();
  }

  /**
   * drawDot — glowing travelling dot.
   */
  function drawDot(x, y) {
    ctx.save();

    /* Outer glow */
    ctx.shadowColor = CLR.dot;
    ctx.shadowBlur  = 18;

    ctx.beginPath();
    ctx.arc(x, y, DOT_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = CLR.dot;
    ctx.fill();

    /* Inner bright core */
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(x, y, DOT_RADIUS * 0.45, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.restore();
  }

  /* ─────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────── */
  function render() {
    ctx.clearRect(0, 0, canvasWidth, CANVAS_H);

    /* ── Connections ── */
    for (let i = 0; i < NODES.length - 1; i++) {
      drawConnection(nodePositions[i].x, nodePositions[i + 1].x, nodePositions[i].y);
    }

    /* ── Nodes ── */
    for (let i = 0; i < NODES.length; i++) {
      const glow = Math.max(0, Math.min(1, nodeGlow[i] / PULSE_MS));
      drawNode(nodePositions[i].x, nodePositions[i].y, NODES[i], glow);
    }

    /* ── Travelling dots ── */
    for (const dot of dots) {
      const seg = dot.segmentIndex;
      if (seg < 0 || seg >= NODES.length - 1) continue;

      const p1 = nodePositions[seg];
      const p2 = nodePositions[seg + 1];

      // Interpolate dot along the segment between node edge gaps
      const pad = NODE_W / 2 + 6 + DOT_RADIUS;
      const sx  = p1.x + pad;
      const ex  = p2.x - pad;
      const dx  = sx + (ex - sx) * dot.progress;

      drawDot(dx, p1.y);
    }
  }

  /* ─────────────────────────────────────────────
     UPDATE
  ───────────────────────────────────────────── */
  function update(dt, now) {
    /* Spawn new dot periodically */
    if (now - lastSpawnTime > SPAWN_INTERVAL) {
      dots.push({ segmentIndex: 0, progress: 0 });
      lastSpawnTime = now;
    }

    /* Advance dots */
    const progressPerMs = 1 / SEGMENT_MS;
    const deadDots      = [];

    for (const dot of dots) {
      dot.progress += progressPerMs * dt;

      if (dot.progress >= 1) {
        // Dot arrived at next node
        const arrivedNode = dot.segmentIndex + 1;
        if (arrivedNode < NODES.length) {
          nodeGlow[arrivedNode] = PULSE_MS;
        }

        // Advance to next segment
        dot.segmentIndex += 1;
        dot.progress      = 0;

        // If past the last node, mark for removal
        if (dot.segmentIndex >= NODES.length - 1) {
          deadDots.push(dot);
        }
      }
    }

    // Remove finished dots
    for (const d of deadDots) {
      const idx = dots.indexOf(d);
      if (idx !== -1) dots.splice(idx, 1);
    }

    /* Decay node glow */
    for (let i = 0; i < nodeGlow.length; i++) {
      if (nodeGlow[i] > 0) {
        nodeGlow[i] = Math.max(0, nodeGlow[i] - dt);
      }
    }
  }

  /* ─────────────────────────────────────────────
     ANIMATION LOOP
  ───────────────────────────────────────────── */
  function loop(timestamp) {
    if (paused) return;

    const dt = lastTime ? Math.min(timestamp - lastTime, 100) : 16;
    lastTime = timestamp;

    update(dt, timestamp);
    render();

    rafId = requestAnimationFrame(loop);
  }

  /* ─────────────────────────────────────────────
     RESIZE HANDLING
  ───────────────────────────────────────────── */
  let resizeTimer = null;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      recalcLayout();
      render();
    }, 80);
  }

  /* ─────────────────────────────────────────────
     PUBLIC API
  ───────────────────────────────────────────── */
  function init() {
    canvas = document.getElementById('workflow-canvas');
    if (!canvas) return;

    ctx = canvas.getContext('2d');
    dpr = window.devicePixelRatio || 1;

    canvas.style.display = 'block';
    recalcLayout();

    /* Seed first node as already "done" – light it briefly */
    nodeGlow[0] = PULSE_MS;

    /* Start the loop on next frame */
    lastTime      = 0;
    lastSpawnTime = -Infinity;

    rafId = requestAnimationFrame(loop);

    window.addEventListener('resize', onResize, { passive: true });
  }

  function pause() {
    paused = true;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function resume() {
    if (paused) {
      paused   = false;
      lastTime = 0;
      rafId    = requestAnimationFrame(loop);
    }
  }

  /* ─────────────────────────────────────────────
     BOOT
  ───────────────────────────────────────────── */
  window.workflowDemo = { init, pause, resume };

  // Auto-init when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
