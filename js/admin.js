'use strict';

// ─────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000/api'
  : '/api';

// ─────────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────────
function checkAuth() {
  const token = localStorage.getItem('catalyst_admin_token');
  if (!token) {
    // Redirect relative to current page depth
    const depth = window.location.pathname.split('/').filter(Boolean).length;
    const prefix = depth > 1 ? '../'.repeat(depth - 1) : '';
    window.location.href = prefix + 'admin/index.html';
    return null;
  }
  return token;
}

function logout() {
  localStorage.removeItem('catalyst_admin_token');
  localStorage.removeItem('catalyst_admin_user');
  window.location.href = 'index.html';
}

// ─────────────────────────────────────────────────────────────────
// API REQUEST
// ─────────────────────────────────────────────────────────────────
async function apiRequest(endpoint, method = 'GET', body = null) {
  const token = localStorage.getItem('catalyst_admin_token');
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }
  };

  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  try {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
    const response = await fetch(url, options);

    if (response.status === 401) {
      localStorage.removeItem('catalyst_admin_token');
      localStorage.removeItem('catalyst_admin_user');
      window.location.href = 'index.html';
      return { error: 'Unauthorized' };
    }

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: `HTTP error ${response.status}` };
      }
      return { error: errorData.message || `Request failed with status ${response.status}` };
    }

    if (response.status === 204) return { success: true };
    return await response.json();
  } catch (err) {
    console.warn('API request failed:', err.message);
    return { error: err.message || 'Network error' };
  }
}

// ─────────────────────────────────────────────────────────────────
// FORMATTERS
// ─────────────────────────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(dateStr));
}

function formatDateRelative(dateStr) {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateStr);
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
}

function formatNumber(num) {
  return new Intl.NumberFormat('en-IN').format(num);
}

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ─────────────────────────────────────────────────────────────────
// TOAST NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────
function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = {
    success: '✓',
    error: '✗',
    info: 'ℹ',
    warning: '⚠'
  };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span class="toast-message">${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">×</button>
  `;

  container.appendChild(toast);

  // Auto-remove
  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ─────────────────────────────────────────────────────────────────
// BADGE & SCORE HELPERS
// ─────────────────────────────────────────────────────────────────
function createStatusBadge(status) {
  const map = {
    new: { icon: '🔵', label: 'New', cls: 'new' },
    contacted: { icon: '🟡', label: 'Contacted', cls: 'contacted' },
    qualified: { icon: '🟢', label: 'Qualified', cls: 'qualified' },
    closed: { icon: '⚫', label: 'Closed', cls: 'closed' },
    lost: { icon: '🔴', label: 'Lost', cls: 'lost' },
    published: { icon: '🟢', label: 'Published', cls: 'published' },
    draft: { icon: '⚫', label: 'Draft', cls: 'draft' },
    pending: { icon: '🟡', label: 'Pending', cls: 'pending' },
  };
  const s = status ? status.toLowerCase() : 'new';
  const info = map[s] || { icon: '⚪', label: status || 'Unknown', cls: '' };
  return `<span class="badge ${info.cls}">${info.icon} ${info.label}</span>`;
}

function createScoreBar(score) {
  const cls = score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low';
  return `<div style="display:flex;align-items:center;gap:8px;">
    <div class="score-bar"><div class="score-fill ${cls}" style="width:${score}%"></div></div>
    <span style="font-size:11px;color:var(--text-muted);min-width:24px;">${score}</span>
  </div>`;
}

// ─────────────────────────────────────────────────────────────────
// MODAL HELPERS
// ─────────────────────────────────────────────────────────────────
function openModal(overlayId) {
  const el = document.getElementById(overlayId);
  if (el) {
    el.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(overlayId) {
  const el = document.getElementById(overlayId);
  if (el) {
    el.classList.remove('open');
    document.body.style.overflow = '';
  }
}

// Close on overlay click
document.addEventListener('click', function(e) {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
    document.body.style.overflow = '';
  }
});

// Confirm dialog
function showConfirm(title, message, onConfirm) {
  let overlay = document.getElementById('confirm-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'confirm-overlay';
    overlay.className = 'confirm-overlay';
    overlay.innerHTML = `
      <div class="confirm-card">
        <div class="confirm-icon">⚠️</div>
        <div class="confirm-title" id="confirm-title"></div>
        <div class="confirm-message" id="confirm-message"></div>
        <div class="confirm-actions">
          <button class="btn-ghost btn-sm" onclick="closeConfirm()">Cancel</button>
          <button class="btn-danger btn-sm" id="confirm-ok-btn">Delete</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-message').textContent = message;
  document.getElementById('confirm-ok-btn').onclick = () => {
    closeConfirm();
    onConfirm();
  };
  overlay.classList.add('open');
}

function closeConfirm() {
  const overlay = document.getElementById('confirm-overlay');
  if (overlay) overlay.classList.remove('open');
}

// ─────────────────────────────────────────────────────────────────
// SIDEBAR TOGGLE (mobile)
// ─────────────────────────────────────────────────────────────────
function initSidebarToggle() {
  const toggle = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('admin-sidebar');

  // Create mobile overlay
  let mobileOverlay = document.getElementById('sidebar-mobile-overlay');
  if (!mobileOverlay) {
    mobileOverlay = document.createElement('div');
    mobileOverlay.id = 'sidebar-mobile-overlay';
    mobileOverlay.className = 'sidebar-mobile-overlay';
    document.body.appendChild(mobileOverlay);
  }

  function openSidebar() {
    sidebar?.classList.add('open');
    mobileOverlay.classList.add('open');
  }

  function closeSidebar() {
    sidebar?.classList.remove('open');
    mobileOverlay.classList.remove('open');
  }

  toggle?.addEventListener('click', () => {
    if (sidebar?.classList.contains('open')) {
      closeSidebar();
    } else {
      openSidebar();
    }
  });

  mobileOverlay.addEventListener('click', closeSidebar);
}

// ─────────────────────────────────────────────────────────────────
// TOPBAR INIT
// ─────────────────────────────────────────────────────────────────
function initTopbar() {
  const greetingEl = document.getElementById('topbar-greeting');
  const dateEl = document.getElementById('topbar-date');

  if (greetingEl) {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    const user = JSON.parse(localStorage.getItem('catalyst_admin_user') || '{}');
    const name = user.name || 'Admin';
    greetingEl.innerHTML = `${greeting}, <span>${name}</span> 👋`;
  }

  if (dateEl) {
    dateEl.textContent = new Intl.DateTimeFormat('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    }).format(new Date());
  }

  // Logout buttons
  document.querySelectorAll('[data-action="logout"]').forEach(btn => {
    btn.addEventListener('click', logout);
  });
}

// ─────────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────────
async function initDashboard() {
  const token = checkAuth();
  if (!token) return;

  initTopbar();
  initSidebarToggle();

  // Demo data fallback
  const demoData = {
    totalLeads: 47,
    newToday: 3,
    activeProjects: 12,
    blogPosts: 8,
    recentLeads: [
      { id: 'ld-001', name: 'Aarav Mehta', email: 'aarav@techsolutions.in', status: 'qualified', source: 'Website', date: '2026-06-03', score: 82 },
      { id: 'ld-002', name: 'Priya Sharma', email: 'priya.s@growthco.com', status: 'new', source: 'Chatbot', date: '2026-06-02', score: 55 },
      { id: 'ld-003', name: 'Rahul Gupta', email: 'rahul@startup.io', status: 'contacted', source: 'LinkedIn', date: '2026-06-01', score: 68 },
      { id: 'ld-004', name: 'Sneha Patel', email: 'sneha.p@retail.com', status: 'new', source: 'Website', date: '2026-06-01', score: 40 },
      { id: 'ld-005', name: 'Vikram Singh', email: 'vikram@enterprise.co', status: 'closed', source: 'Referral', date: '2026-05-30', score: 95 },
    ],
    chatbotStats: {
      conversations: 24,
      conversionRate: 18,
      avgSession: 4.2
    },
    leadsOverTime: [12, 18, 14, 22, 19, 28, 24]
  };

  let data = demoData;
  const result = await apiRequest('/admin/dashboard');
  if (!result.error) {
    data = result;
  }

  // Populate metric cards
  setMetricCard('metric-total-leads', data.totalLeads, '+12% this month', 'up');
  setMetricCard('metric-new-today', data.newToday, 'vs 2 yesterday', 'up');
  setMetricCard('metric-active-projects', data.activeProjects, '+2 this week', 'up');
  setMetricCard('metric-blog-posts', data.blogPosts, `${data.blogPosts} published`, 'neutral');

  // Render recent leads table
  renderRecentLeadsTable(data.recentLeads);

  // Render chatbot stats
  renderChatbotStats(data.chatbotStats);

  // Init chart
  initLeadsChart(data.leadsOverTime);
}

function setMetricCard(id, value, trendText, trendDir) {
  const el = document.getElementById(id);
  if (!el) return;
  const valueEl = el.querySelector('.metric-value');
  const trendEl = el.querySelector('.metric-trend');
  if (valueEl) valueEl.textContent = formatNumber(value);
  if (trendEl) {
    const arrow = trendDir === 'up' ? '↑' : trendDir === 'down' ? '↓' : '→';
    trendEl.className = `metric-trend ${trendDir}`;
    trendEl.innerHTML = `<span>${arrow}</span> ${trendText}`;
  }
}

function renderRecentLeadsTable(leads) {
  const tbody = document.getElementById('recent-leads-tbody');
  if (!tbody) return;

  if (!leads || leads.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--text-muted);">No recent leads</td></tr>`;
    return;
  }

  tbody.innerHTML = leads.map(lead => `
    <tr>
      <td>
        <div style="font-weight:600;color:var(--text-primary);">${escapeHtml(lead.name)}</div>
        <div style="font-size:12px;color:var(--text-muted);">${escapeHtml(lead.email)}</div>
      </td>
      <td>${createStatusBadge(lead.status)}</td>
      <td><span style="font-size:12px;">${escapeHtml(lead.source || '—')}</span></td>
      <td>${createScoreBar(lead.score || 0)}</td>
      <td><span style="font-size:12px;color:var(--text-muted);">${formatDateRelative(lead.date)}</span></td>
      <td>
        <div class="actions-cell">
          <button class="action-btn view" onclick="window.location.href='leads.html'">View All</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function renderChatbotStats(stats) {
  const el = document.getElementById('chatbot-stats');
  if (!el) return;
  el.innerHTML = `
    <div class="chatbot-stat-item">
      <span class="chatbot-stat-label">💬 Conversations Today</span>
      <span class="chatbot-stat-value">${stats.conversations}</span>
    </div>
    <div class="chatbot-stat-item">
      <span class="chatbot-stat-label">🎯 Conversion Rate</span>
      <span class="chatbot-stat-value">${stats.conversionRate}%</span>
    </div>
    <div class="chatbot-stat-item">
      <span class="chatbot-stat-label">⏱ Avg. Session (min)</span>
      <span class="chatbot-stat-value">${stats.avgSession}</span>
    </div>
  `;
}

function initLeadsChart(dataPoints) {
  const ctx = document.getElementById('leads-chart');
  if (!ctx) return;

  // Load Chart.js dynamically
  if (typeof Chart === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
    script.onload = () => renderLeadsChart(ctx, dataPoints);
    document.head.appendChild(script);
  } else {
    renderLeadsChart(ctx, dataPoints);
  }
}

function renderLeadsChart(ctx, dataPoints) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 220);
  gradient.addColorStop(0, 'rgba(59,130,246,0.3)');
  gradient.addColorStop(1, 'rgba(59,130,246,0.0)');

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: days,
      datasets: [{
        label: 'Leads',
        data: dataPoints,
        borderColor: '#3B82F6',
        backgroundColor: gradient,
        borderWidth: 2.5,
        pointBackgroundColor: '#3B82F6',
        pointBorderColor: '#3B82F6',
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true,
        tension: 0.4,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(37,41,57,0.95)',
          borderColor: 'rgba(162,178,200,0.15)',
          borderWidth: 1,
          titleColor: '#EDF1F7',
          bodyColor: '#8E9DAF',
          padding: 12,
          cornerRadius: 10,
          callbacks: {
            label: ctx => `${ctx.parsed.y} leads`
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(162,178,200,0.04)', drawBorder: false },
          ticks: { color: '#4E5A70', font: { size: 11, family: 'Inter' } },
        },
        y: {
          grid: { color: 'rgba(162,178,200,0.06)', drawBorder: false },
          ticks: { color: '#4E5A70', font: { size: 11, family: 'Inter' }, stepSize: 5 },
          beginAtZero: true,
        }
      },
      interaction: {
        intersect: false,
        mode: 'index'
      },
      elements: {
        line: { borderCapStyle: 'round', borderJoinStyle: 'round' }
      }
    }
  });
}

// ─────────────────────────────────────────────────────────────────
// LEADS
// ─────────────────────────────────────────────────────────────────
const leadsState = {
  leads: [],
  filtered: [],
  page: 1,
  perPage: 10,
  filters: { status: '', source: '', search: '' },
  currentLead: null
};

const demoLeads = [
  { id: 'ld-001', name: 'Aarav Mehta', email: 'aarav@techsolutions.in', phone: '+91 8240177655', company: 'TechSolutions India', service: 'AI Automation', status: 'qualified', source: 'Website', date: '2026-06-03T08:30:00Z', score: 82, budget: 150000, message: 'We need AI automation for our customer support pipeline. Looking for a comprehensive solution that can handle 5000+ tickets per day.' },
  { id: 'ld-002', name: 'Priya Sharma', email: 'priya.s@growthco.com', phone: '+91 87654 32109', company: 'GrowthCo', service: 'Chatbot Development', status: 'new', source: 'Chatbot', date: '2026-06-02T14:15:00Z', score: 55, budget: 50000, message: 'Looking for a smart chatbot that can handle sales inquiries on our e-commerce site.' },
  { id: 'ld-003', name: 'Rahul Gupta', email: 'rahul@startup.io', phone: '+91 76543 21098', company: 'StartupIO', service: 'AI Strategy', status: 'contacted', source: 'LinkedIn', date: '2026-06-01T11:00:00Z', score: 68, budget: 80000, message: 'Need consulting on AI strategy for our fintech startup. Want to automate risk assessment.' },
  { id: 'ld-004', name: 'Sneha Patel', email: 'sneha.p@retail.com', phone: '+91 65432 10987', company: 'RetailPros', service: 'Process Automation', status: 'new', source: 'Website', date: '2026-06-01T09:45:00Z', score: 40, budget: 30000, message: 'Want to automate inventory management and order processing.' },
  { id: 'ld-005', name: 'Vikram Singh', email: 'vikram@enterprise.co', phone: '+91 54321 09876', company: 'Enterprise Corp', service: 'Full AI Suite', status: 'closed', source: 'Referral', date: '2026-05-30T16:20:00Z', score: 95, budget: 500000, message: 'Looking for complete AI transformation of our operations. Budget approved by board.' },
  { id: 'ld-006', name: 'Divya Nair', email: 'divya@healthtech.io', phone: '+91 43210 98765', company: 'HealthTech', service: 'AI Automation', status: 'qualified', source: 'Website', date: '2026-05-29T13:00:00Z', score: 76, budget: 200000, message: 'Need AI for patient triage and appointment scheduling automation.' },
  { id: 'ld-007', name: 'Arjun Reddy', email: 'arjun@edtech.in', phone: '+91 32109 87654', company: 'EduFuture', service: 'Chatbot Development', status: 'contacted', source: 'Google Ads', date: '2026-05-28T10:30:00Z', score: 60, budget: 60000, message: 'Looking for AI tutoring chatbot for our learning platform.' },
  { id: 'ld-008', name: 'Kavya Krishnan', email: 'kavya@finserv.com', phone: '+91 21098 76543', company: 'FinServ India', service: 'AI Strategy', status: 'new', source: 'Website', date: '2026-05-27T15:45:00Z', score: 35, budget: 25000, message: 'Interested in AI for fraud detection in our payment processing system.' },
  { id: 'ld-009', name: 'Rajesh Kumar', email: 'rajesh@logistics.co', phone: '+91 10987 65432', company: 'LogiPro', service: 'Process Automation', status: 'lost', source: 'LinkedIn', date: '2026-05-25T11:15:00Z', score: 45, budget: 40000, message: 'Need route optimization and dispatch automation.' },
  { id: 'ld-010', name: 'Meena Iyer', email: 'meena@agency.io', phone: '+91 09876 54321', company: 'CreativeAgency', service: 'AI Automation', status: 'new', source: 'Chatbot', date: '2026-05-24T09:00:00Z', score: 50, budget: 70000, message: 'Want AI to automate content generation and campaign analytics.' },
];

async function initLeads() {
  const token = checkAuth();
  if (!token) return;

  initTopbar();
  initSidebarToggle();

  leadsState.leads = demoLeads;

  const result = await apiRequest('/leads');
  if (!result.error && Array.isArray(result.leads || result)) {
    leadsState.leads = result.leads || result;
  }

  setupLeadFilters();
  applyLeadFilters();
  setupLeadModal();
}

function setupLeadFilters() {
  const searchInput = document.getElementById('leads-search');
  const statusFilter = document.getElementById('leads-status-filter');
  const sourceFilter = document.getElementById('leads-source-filter');

  searchInput?.addEventListener('input', (e) => {
    leadsState.filters.search = e.target.value.toLowerCase();
    leadsState.page = 1;
    applyLeadFilters();
  });

  statusFilter?.addEventListener('change', (e) => {
    leadsState.filters.status = e.target.value;
    leadsState.page = 1;
    applyLeadFilters();
  });

  sourceFilter?.addEventListener('change', (e) => {
    leadsState.filters.source = e.target.value;
    leadsState.page = 1;
    applyLeadFilters();
  });
}

function applyLeadFilters() {
  const { search, status, source } = leadsState.filters;
  leadsState.filtered = leadsState.leads.filter(lead => {
    const matchSearch = !search ||
      lead.name.toLowerCase().includes(search) ||
      lead.email.toLowerCase().includes(search) ||
      (lead.company || '').toLowerCase().includes(search);
    const matchStatus = !status || lead.status === status;
    const matchSource = !source || lead.source === source;
    return matchSearch && matchStatus && matchSource;
  });
  renderLeadsTable();
  renderLeadsPagination();
}

function renderLeadsTable() {
  const tbody = document.getElementById('leads-tbody');
  if (!tbody) return;

  const start = (leadsState.page - 1) * leadsState.perPage;
  const pageLeads = leadsState.filtered.slice(start, start + leadsState.perPage);

  if (pageLeads.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty-state">
      <div class="empty-state-icon">📋</div>
      <div class="empty-state-text">No leads found matching your filters</div>
    </td></tr>`;
    return;
  }

  tbody.innerHTML = pageLeads.map(lead => `
    <tr>
      <td>
        <div style="font-weight:600;color:var(--text-primary);">${escapeHtml(lead.name)}</div>
        <div style="font-size:11px;color:var(--text-muted);">${escapeHtml(lead.company || '')}</div>
      </td>
      <td>
        <div>${escapeHtml(lead.email)}</div>
        <div style="font-size:11px;color:var(--text-muted);">${escapeHtml(lead.phone || '')}</div>
      </td>
      <td><span style="font-size:12px;">${escapeHtml(lead.service || '—')}</span></td>
      <td>${createStatusBadge(lead.status)}</td>
      <td><span style="font-size:12px;color:var(--text-secondary);">${escapeHtml(lead.source || '—')}</span></td>
      <td>${createScoreBar(lead.score || 0)}</td>
      <td><span style="font-size:12px;color:var(--text-muted);">${formatDate(lead.date)}</span></td>
      <td>
        <div class="actions-cell">
          <button class="action-btn view" onclick="viewLead('${lead.id}')">View</button>
          <button class="action-btn edit" onclick="changeLeadStatus('${lead.id}')">Status</button>
          <button class="action-btn delete" onclick="deleteLead('${lead.id}')">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function renderLeadsPagination() {
  const container = document.getElementById('leads-pagination');
  if (!container) return;

  const total = leadsState.filtered.length;
  const pages = Math.ceil(total / leadsState.perPage);
  const current = leadsState.page;

  if (pages <= 1) {
    container.innerHTML = `<span class="pagination-info">Showing ${total} lead${total !== 1 ? 's' : ''}</span>`;
    return;
  }

  let html = `<span class="pagination-info">Showing ${Math.min((current - 1) * leadsState.perPage + 1, total)}–${Math.min(current * leadsState.perPage, total)} of ${total}</span>`;
  html += `<button class="page-btn arrow" onclick="goLeadPage(${current - 1})" ${current === 1 ? 'disabled' : ''}>‹</button>`;

  for (let i = 1; i <= pages; i++) {
    if (pages > 7 && (i > 2 && i < pages - 1 && Math.abs(i - current) > 1)) {
      if (i === 3 || i === pages - 2) html += `<span style="color:var(--text-muted);padding:0 4px;">…</span>`;
      continue;
    }
    html += `<button class="page-btn ${i === current ? 'active' : ''}" onclick="goLeadPage(${i})">${i}</button>`;
  }

  html += `<button class="page-btn arrow" onclick="goLeadPage(${current + 1})" ${current === pages ? 'disabled' : ''}>›</button>`;
  container.innerHTML = html;
}

function goLeadPage(page) {
  const pages = Math.ceil(leadsState.filtered.length / leadsState.perPage);
  if (page < 1 || page > pages) return;
  leadsState.page = page;
  renderLeadsTable();
  renderLeadsPagination();
}

function viewLead(id) {
  const lead = leadsState.leads.find(l => l.id === id);
  if (!lead) return;
  leadsState.currentLead = lead;

  // Populate modal
  const fields = {
    'lead-detail-name': lead.name,
    'lead-detail-email': lead.email,
    'lead-detail-phone': lead.phone || '—',
    'lead-detail-company': lead.company || '—',
    'lead-detail-service': lead.service || '—',
    'lead-detail-source': lead.source || '—',
    'lead-detail-date': formatDate(lead.date),
    'lead-detail-score': lead.score,
    'lead-detail-budget': lead.budget ? formatCurrency(lead.budget) : '—',
  };

  Object.entries(fields).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  });

  const statusEl = document.getElementById('lead-detail-status');
  if (statusEl) statusEl.innerHTML = createStatusBadge(lead.status);

  const messageEl = document.getElementById('lead-detail-message');
  if (messageEl) messageEl.textContent = lead.message || 'No message provided.';

  openModal('lead-modal');
}

function changeLeadStatus(id) {
  const lead = leadsState.leads.find(l => l.id === id);
  if (!lead) return;

  const statuses = ['new', 'contacted', 'qualified', 'closed', 'lost'];
  const current = statuses.indexOf(lead.status);
  const next = statuses[(current + 1) % statuses.length];

  updateLeadStatus(id, next);
}

async function updateLeadStatus(id, newStatus) {
  const result = await apiRequest(`/leads/${id}/status`, 'PUT', { status: newStatus });
  // Optimistic update regardless of API response
  const lead = leadsState.leads.find(l => l.id === id);
  if (lead) {
    lead.status = newStatus;
    applyLeadFilters();
    showToast(`Status updated to "${newStatus}"`, 'success');
  }
}

async function deleteLead(id) {
  const lead = leadsState.leads.find(l => l.id === id);
  if (!lead) return;

  showConfirm(
    'Delete Lead',
    `Are you sure you want to delete the lead from ${lead.name}? This action cannot be undone.`,
    async () => {
      const result = await apiRequest(`/leads/${id}`, 'DELETE');
      leadsState.leads = leadsState.leads.filter(l => l.id !== id);
      leadsState.page = 1;
      applyLeadFilters();
      showToast('Lead deleted successfully', 'success');
    }
  );
}

function setupLeadModal() {
  const closeBtn = document.getElementById('lead-modal-close');
  closeBtn?.addEventListener('click', () => closeModal('lead-modal'));
}

// ─────────────────────────────────────────────────────────────────
// BLOG
// ─────────────────────────────────────────────────────────────────
const blogState = {
  posts: [],
  editingPost: null
};

const demoPosts = [
  { id: 'bp-001', title: 'How AI Automation is Transforming Indian SMEs', slug: 'ai-automation-indian-smes', category: 'AI Trends', status: 'published', date: '2026-05-28T00:00:00Z', excerpt: 'Discover how small and medium enterprises across India are leveraging AI to reduce costs and scale faster.', content: 'AI automation is reshaping the business landscape...', tags: 'AI, Automation, SME, India', featured: true },
  { id: 'bp-002', title: '5 Ways Chatbots Boost Customer Retention', slug: '5-ways-chatbots-boost-customer-retention', category: 'Chatbots', status: 'published', date: '2026-05-20T00:00:00Z', excerpt: 'Learn the proven strategies to use AI chatbots for improving customer satisfaction and retention rates.', content: 'Customer retention is the lifeblood of any business...', tags: 'Chatbots, Customer Success, Retention', featured: false },
  { id: 'bp-003', title: 'Building a Scalable AI Strategy for 2026', slug: 'scalable-ai-strategy-2026', category: 'Strategy', status: 'published', date: '2026-05-15T00:00:00Z', excerpt: 'A step-by-step guide to building an AI roadmap that aligns with your business goals and scales with your team.', content: 'The key to successful AI adoption...', tags: 'AI Strategy, Digital Transformation, 2026', featured: true },
  { id: 'bp-004', title: 'The ROI of AI: Case Studies from Our Clients', slug: 'roi-of-ai-case-studies', category: 'Case Studies', status: 'draft', date: '2026-06-01T00:00:00Z', excerpt: 'Real numbers from real clients. See how Catalyst AI delivered measurable ROI across multiple industries.', content: 'Our clients have seen remarkable results...', tags: 'ROI, Case Studies, Results', featured: false },
  { id: 'bp-005', title: 'AI in Healthcare: Opportunities for Indian Startups', slug: 'ai-healthcare-indian-startups', category: 'AI Trends', status: 'draft', date: '2026-06-02T00:00:00Z', excerpt: 'India\'s healthcare sector is ripe for AI disruption. Here\'s what founders need to know.', content: 'Healthcare AI is one of the fastest-growing sectors...', tags: 'Healthcare, AI, Startups, India', featured: false },
];

async function initBlog() {
  const token = checkAuth();
  if (!token) return;

  initTopbar();
  initSidebarToggle();

  blogState.posts = demoPosts;

  const result = await apiRequest('/blog');
  if (!result.error && Array.isArray(result.posts || result)) {
    blogState.posts = result.posts || result;
  }

  renderBlogTable();
  setupBlogEditor();

  document.getElementById('new-post-btn')?.addEventListener('click', () => openEditor(null));
}

function renderBlogTable() {
  const tbody = document.getElementById('blog-tbody');
  if (!tbody) return;

  if (blogState.posts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--text-muted);">No blog posts yet</td></tr>`;
    return;
  }

  tbody.innerHTML = blogState.posts.map(post => `
    <tr>
      <td>
        <div style="font-weight:600;color:var(--text-primary);">${escapeHtml(post.title)}</div>
        <div style="font-size:11px;color:var(--text-muted);">/${post.slug}</div>
      </td>
      <td><span style="font-size:12px;">${escapeHtml(post.category || '—')}</span></td>
      <td>${createStatusBadge(post.status)}</td>
      <td>${post.featured ? '<span class="badge featured">⭐ Featured</span>' : '<span style="color:var(--text-muted);font-size:12px;">—</span>'}</td>
      <td><span style="font-size:12px;color:var(--text-muted);">${formatDate(post.date)}</span></td>
      <td>
        <div class="actions-cell">
          <button class="action-btn edit" onclick="openEditor('${post.id}')">Edit</button>
          <button class="action-btn ${post.status === 'draft' ? 'publish' : 'view'}" onclick="togglePostStatus('${post.id}')">${post.status === 'draft' ? 'Publish' : 'Unpublish'}</button>
          <button class="action-btn delete" onclick="deletePost('${post.id}')">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function setupBlogEditor() {
  const titleInput = document.getElementById('editor-title');
  const slugDisplay = document.getElementById('editor-slug-display');
  const slugInput = document.getElementById('editor-slug');
  const saveBtn = document.getElementById('editor-save-btn');
  const closeBtn = document.getElementById('editor-close-btn');
  const publishToggle = document.getElementById('editor-publish-toggle');

  titleInput?.addEventListener('input', (e) => {
    const slug = slugify(e.target.value);
    if (slugDisplay) slugDisplay.textContent = slug || 'your-post-slug';
    if (slugInput) slugInput.value = slug;
  });

  publishToggle?.addEventListener('click', () => {
    publishToggle.classList.toggle('on');
  });

  saveBtn?.addEventListener('click', savePost);
  closeBtn?.addEventListener('click', () => closeEditor());
}

function openEditor(postId) {
  const overlay = document.getElementById('blog-editor-overlay');
  if (!overlay) return;

  if (postId) {
    const post = blogState.posts.find(p => p.id === postId);
    if (!post) return;
    blogState.editingPost = post;

    // Fill fields
    setEditorField('editor-title', post.title);
    setEditorField('editor-slug', post.slug);
    setEditorField('editor-category', post.category);
    setEditorField('editor-tags', post.tags);
    setEditorField('editor-excerpt', post.excerpt);
    setEditorField('editor-content', post.content);

    const slugDisplay = document.getElementById('editor-slug-display');
    if (slugDisplay) slugDisplay.textContent = post.slug;

    const publishToggle = document.getElementById('editor-publish-toggle');
    if (publishToggle) {
      if (post.status === 'published') publishToggle.classList.add('on');
      else publishToggle.classList.remove('on');
    }

    const toolbarTitle = document.getElementById('editor-toolbar-title');
    if (toolbarTitle) toolbarTitle.textContent = 'Editing: ' + post.title;
  } else {
    blogState.editingPost = null;
    ['editor-title', 'editor-slug', 'editor-category', 'editor-tags', 'editor-excerpt', 'editor-content'].forEach(id => setEditorField(id, ''));
    const slugDisplay = document.getElementById('editor-slug-display');
    if (slugDisplay) slugDisplay.textContent = 'your-post-slug';
    const publishToggle = document.getElementById('editor-publish-toggle');
    if (publishToggle) publishToggle.classList.remove('on');
    const toolbarTitle = document.getElementById('editor-toolbar-title');
    if (toolbarTitle) toolbarTitle.textContent = 'New Post';
  }

  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeEditor() {
  const overlay = document.getElementById('blog-editor-overlay');
  overlay?.classList.remove('open');
  document.body.style.overflow = '';
  blogState.editingPost = null;
}

function setEditorField(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value || '';
}

async function savePost() {
  const title = document.getElementById('editor-title')?.value.trim();
  const slug = document.getElementById('editor-slug')?.value.trim() || slugify(title);
  const category = document.getElementById('editor-category')?.value.trim();
  const tags = document.getElementById('editor-tags')?.value.trim();
  const excerpt = document.getElementById('editor-excerpt')?.value.trim();
  const content = document.getElementById('editor-content')?.value.trim();
  const published = document.getElementById('editor-publish-toggle')?.classList.contains('on');

  if (!title) {
    showToast('Please enter a title', 'error');
    return;
  }

  const postData = {
    title, slug, category, tags, excerpt, content,
    status: published ? 'published' : 'draft'
  };

  const saveBtn = document.getElementById('editor-save-btn');
  if (saveBtn) {
    saveBtn.textContent = 'Saving...';
    saveBtn.disabled = true;
  }

  let result;
  if (blogState.editingPost) {
    result = await apiRequest(`/blog/${blogState.editingPost.id}`, 'PUT', postData);
    // Optimistic update
    const idx = blogState.posts.findIndex(p => p.id === blogState.editingPost.id);
    if (idx >= 0) {
      blogState.posts[idx] = { ...blogState.posts[idx], ...postData };
    }
    showToast('Post updated successfully', 'success');
  } else {
    result = await apiRequest('/blog', 'POST', postData);
    const newPost = result.error ? { ...postData, id: 'bp-' + Date.now(), date: new Date().toISOString() } : result;
    blogState.posts.unshift(newPost);
    showToast('Post created successfully', 'success');
  }

  if (saveBtn) {
    saveBtn.textContent = 'Save';
    saveBtn.disabled = false;
  }

  renderBlogTable();
  closeEditor();
}

async function togglePostStatus(id) {
  const post = blogState.posts.find(p => p.id === id);
  if (!post) return;
  const newStatus = post.status === 'published' ? 'draft' : 'published';
  await apiRequest(`/blog/${id}`, 'PUT', { ...post, status: newStatus });
  post.status = newStatus;
  renderBlogTable();
  showToast(`Post ${newStatus === 'published' ? 'published' : 'unpublished'}`, 'success');
}

async function deletePost(id) {
  const post = blogState.posts.find(p => p.id === id);
  if (!post) return;

  showConfirm(
    'Delete Post',
    `Are you sure you want to delete "${post.title}"? This cannot be undone.`,
    async () => {
      await apiRequest(`/blog/${id}`, 'DELETE');
      blogState.posts = blogState.posts.filter(p => p.id !== id);
      renderBlogTable();
      showToast('Post deleted', 'success');
    }
  );
}

// ─────────────────────────────────────────────────────────────────
// PORTFOLIO
// ─────────────────────────────────────────────────────────────────
const portfolioState = {
  items: [],
  editingItem: null
};

const demoPortfolio = [
  { id: 'pf-001', title: 'AI Customer Support Bot — FinServe', category: 'Chatbot', client: 'FinServe India', featured: true, date: '2026-04-15', description: 'Built an intelligent support chatbot handling 10,000+ queries/day with 94% satisfaction rate.', results: '40% cost reduction in support operations', tech: 'OpenAI GPT-4, Node.js, React', url: 'https://finserve.example.com' },
  { id: 'pf-002', title: 'E-commerce Process Automation', category: 'Automation', client: 'ShopKart', featured: false, date: '2026-03-20', description: 'Automated order processing, inventory sync, and customer communication workflows.', results: '60% faster order fulfillment', tech: 'Python, n8n, PostgreSQL', url: '' },
  { id: 'pf-003', title: 'AI Lead Generation System', category: 'AI System', client: 'GrowthHQ', featured: true, date: '2026-02-10', description: 'Intelligent lead scoring and automated outreach system using AI.', results: '3x increase in qualified leads', tech: 'OpenAI, LangChain, FastAPI', url: '' },
  { id: 'pf-004', title: 'HR Recruitment AI Assistant', category: 'AI System', client: 'HirePro', featured: false, date: '2026-01-05', description: 'Resume screening, candidate matching, and interview scheduling automation.', results: '75% reduction in screening time', tech: 'Python, OpenAI, Google Calendar API', url: '' },
  { id: 'pf-005', title: 'Multilingual Customer Chat', category: 'Chatbot', client: 'TravelEase', featured: false, date: '2025-12-18', description: 'Multilingual chatbot supporting English, Hindi, Tamil, and Bengali for travel bookings.', results: '28% increase in conversions', tech: 'OpenAI, React, Firebase', url: 'https://travelease.example.com' },
];

async function initPortfolio() {
  const token = checkAuth();
  if (!token) return;

  initTopbar();
  initSidebarToggle();

  portfolioState.items = demoPortfolio;

  const result = await apiRequest('/portfolio');
  if (!result.error && Array.isArray(result.items || result)) {
    portfolioState.items = result.items || result;
  }

  renderPortfolioTable();
  setupPortfolioModal();

  document.getElementById('new-portfolio-btn')?.addEventListener('click', () => openPortfolioModal(null));
}

function renderPortfolioTable() {
  const tbody = document.getElementById('portfolio-tbody');
  if (!tbody) return;

  if (portfolioState.items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--text-muted);">No portfolio items yet</td></tr>`;
    return;
  }

  tbody.innerHTML = portfolioState.items.map(item => `
    <tr>
      <td>
        <div style="font-weight:600;color:var(--text-primary);">${escapeHtml(item.title)}</div>
        <div style="font-size:11px;color:var(--text-muted);">${escapeHtml(item.tech || '')}</div>
      </td>
      <td><span style="font-size:12px;">${escapeHtml(item.category || '—')}</span></td>
      <td><span style="font-size:13px;">${escapeHtml(item.client || '—')}</span></td>
      <td>${item.featured ? '<span class="badge featured">⭐ Featured</span>' : '<span style="color:var(--text-muted);font-size:12px;">—</span>'}</td>
      <td><span style="font-size:12px;color:var(--text-muted);">${formatDate(item.date)}</span></td>
      <td>
        <div class="actions-cell">
          <button class="action-btn edit" onclick="openPortfolioModal('${item.id}')">Edit</button>
          <button class="action-btn delete" onclick="deletePortfolioItem('${item.id}')">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function setupPortfolioModal() {
  const closeBtn = document.getElementById('portfolio-modal-close');
  const saveBtn = document.getElementById('portfolio-save-btn');
  closeBtn?.addEventListener('click', () => closeModal('portfolio-modal'));
  saveBtn?.addEventListener('click', savePortfolioItem);
}

function openPortfolioModal(id) {
  if (id) {
    const item = portfolioState.items.find(i => i.id === id);
    if (!item) return;
    portfolioState.editingItem = item;

    setFormField('portfolio-title', item.title);
    setFormField('portfolio-category', item.category);
    setFormField('portfolio-client', item.client);
    setFormField('portfolio-tech', item.tech);
    setFormField('portfolio-date', item.date ? item.date.split('T')[0] : '');
    setFormField('portfolio-description', item.description);
    setFormField('portfolio-results', item.results);
    setFormField('portfolio-url', item.url);

    const featuredToggle = document.getElementById('portfolio-featured-toggle');
    if (featuredToggle) {
      if (item.featured) featuredToggle.classList.add('on');
      else featuredToggle.classList.remove('on');
    }

    const modalTitle = document.querySelector('#portfolio-modal .modal-title');
    if (modalTitle) modalTitle.textContent = 'Edit Portfolio Item';
  } else {
    portfolioState.editingItem = null;
    ['portfolio-title', 'portfolio-category', 'portfolio-client', 'portfolio-tech', 'portfolio-date', 'portfolio-description', 'portfolio-results', 'portfolio-url'].forEach(id => setFormField(id, ''));
    const featuredToggle = document.getElementById('portfolio-featured-toggle');
    if (featuredToggle) featuredToggle.classList.remove('on');
    const modalTitle = document.querySelector('#portfolio-modal .modal-title');
    if (modalTitle) modalTitle.textContent = 'Add Portfolio Item';
  }

  openModal('portfolio-modal');
}

function setFormField(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value || '';
}

async function savePortfolioItem() {
  const title = document.getElementById('portfolio-title')?.value.trim();
  if (!title) { showToast('Title is required', 'error'); return; }

  const itemData = {
    title,
    category: document.getElementById('portfolio-category')?.value.trim(),
    client: document.getElementById('portfolio-client')?.value.trim(),
    tech: document.getElementById('portfolio-tech')?.value.trim(),
    date: document.getElementById('portfolio-date')?.value,
    description: document.getElementById('portfolio-description')?.value.trim(),
    results: document.getElementById('portfolio-results')?.value.trim(),
    url: document.getElementById('portfolio-url')?.value.trim(),
    featured: document.getElementById('portfolio-featured-toggle')?.classList.contains('on') || false,
  };

  const saveBtn = document.getElementById('portfolio-save-btn');
  if (saveBtn) { saveBtn.textContent = 'Saving...'; saveBtn.disabled = true; }

  if (portfolioState.editingItem) {
    await apiRequest(`/portfolio/${portfolioState.editingItem.id}`, 'PUT', itemData);
    const idx = portfolioState.items.findIndex(i => i.id === portfolioState.editingItem.id);
    if (idx >= 0) portfolioState.items[idx] = { ...portfolioState.items[idx], ...itemData };
    showToast('Portfolio item updated', 'success');
  } else {
    const result = await apiRequest('/portfolio', 'POST', itemData);
    const newItem = result.error ? { ...itemData, id: 'pf-' + Date.now() } : result;
    portfolioState.items.unshift(newItem);
    showToast('Portfolio item added', 'success');
  }

  if (saveBtn) { saveBtn.textContent = 'Save'; saveBtn.disabled = false; }

  renderPortfolioTable();
  closeModal('portfolio-modal');
}

async function deletePortfolioItem(id) {
  const item = portfolioState.items.find(i => i.id === id);
  if (!item) return;

  showConfirm(
    'Delete Portfolio Item',
    `Delete "${item.title}"? This action cannot be undone.`,
    async () => {
      await apiRequest(`/portfolio/${id}`, 'DELETE');
      portfolioState.items = portfolioState.items.filter(i => i.id !== id);
      renderPortfolioTable();
      showToast('Item deleted', 'success');
    }
  );
}

// ─────────────────────────────────────────────────────────────────
// LOGIN PAGE
// ─────────────────────────────────────────────────────────────────
async function initLogin() {
  // If already logged in, redirect to dashboard
  const token = localStorage.getItem('catalyst_admin_token');
  if (token) {
    window.location.href = 'dashboard.html';
    return;
  }

  const form = document.getElementById('login-form');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email')?.value.trim();
    const password = document.getElementById('login-password')?.value;
    const errorEl = document.getElementById('login-error');
    const btn = document.getElementById('login-submit-btn');

    if (!email || !password) {
      showLoginError('Please fill in all fields.');
      return;
    }

    // Show loading
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="loading-spinner"></span> Signing in...';
    }
    if (errorEl) errorEl.classList.remove('show');

    const result = await apiRequest('/admin/login', 'POST', { email, password });

    if (result.error || !result.token) {
      // Demo fallback
      if (email === 'admin@catalystindia.ai' && password === 'Admin@2026') {
        localStorage.setItem('catalyst_admin_token', 'demo-token-' + Date.now());
        localStorage.setItem('catalyst_admin_user', JSON.stringify({ name: 'Admin', email }));
        window.location.href = 'dashboard.html';
        return;
      }
      showLoginError(result.error || 'Invalid credentials. Please try again.');
      if (btn) { btn.disabled = false; btn.innerHTML = 'Sign In →'; }
      return;
    }

    localStorage.setItem('catalyst_admin_token', result.token);
    if (result.user) localStorage.setItem('catalyst_admin_user', JSON.stringify(result.user));
    window.location.href = 'dashboard.html';
  });
}

function showLoginError(message) {
  const el = document.getElementById('login-error');
  if (el) {
    el.textContent = message;
    el.classList.add('show');
  }
}

// ─────────────────────────────────────────────────────────────────
// UTILITY
// ─────────────────────────────────────────────────────────────────
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─────────────────────────────────────────────────────────────────
// PAGE DETECTION & AUTO-INIT
// ─────────────────────────────────────────────────────────────────
function detectAndInit() {
  const path = window.location.pathname;
  const page = document.body.dataset.page || '';

  if (path.includes('dashboard') || page === 'dashboard') {
    initDashboard();
  } else if (path.includes('leads') || page === 'leads') {
    initLeads();
  } else if (path.includes('blog') || page === 'blog') {
    initBlog();
  } else if (path.includes('portfolio') || page === 'portfolio') {
    initPortfolio();
  } else if (path.includes('login') || path.endsWith('index.html') || path.endsWith('/admin/') || page === 'login') {
    initLogin();
  }
}

document.addEventListener('DOMContentLoaded', detectAndInit);

// ─────────────────────────────────────────────────────────────────
// GLOBAL EXPORTS (for use in inline HTML event handlers)
// ─────────────────────────────────────────────────────────────────
window.AdminJS = {
  showToast,
  openModal,
  closeModal,
  closeConfirm,
  viewLead,
  changeLeadStatus,
  deleteLead,
  openEditor,
  closeEditor,
  togglePostStatus,
  deletePost,
  openPortfolioModal,
  deletePortfolioItem,
  goLeadPage,
  logout,
  slugify,
  createStatusBadge,
  createScoreBar,
  formatDate,
  formatCurrency,
};
