/**
 * Catalyst AI Agency — Chatbot Widget
 * Self-contained, zero-dependency chatbot widget
 * Dynamically creates all DOM elements and injects CSS
 */

(function () {
  'use strict';

  // ── CONFIG ──────────────────────────────────────────────────────────────────

  const CONFIG = {
    apiEndpoint: '/api/chatbot/message',
    leadsEndpoint: '/api/leads',
    maxHistory: 20,
    typingDelayMin: 800,
    typingDelayMax: 1800,
    welcomeMessage:
      "Hi! I'm Gippo, Catalyst's AI assistant 👋 I can help you understand our services, get a cost estimate, or book a free consultation. What brings you here today?",
    botName: 'Gippo',
    companyName: 'Catalyst',
    leadTriggerAfter: 3, // Show lead form after this many bot messages
    cssPath: '/frontend/css/chatbot.css',
  };

  // ── STATE ────────────────────────────────────────────────────────────────────

  let state = {
    isOpen: false,
    sessionId: `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    messages: [], // { role: 'user'|'assistant', content: string, timestamp: Date }
    isTyping: false,
    hasWelcomed: false,
    botMessageCount: 0,
    leadData: { name: null, email: null, phone: null },
    leadCaptured: false,
    leadFormShown: false,
  };

  // ── DOM REFERENCES ───────────────────────────────────────────────────────────

  let els = {
    launcher: null,
    window: null,
    messages: null,
    input: null,
    sendBtn: null,
    typingEl: null,
    closeBtn: null,
  };

  // ── FALLBACK RESPONSES ───────────────────────────────────────────────────────

  const FALLBACK_RESPONSES = [
    {
      keywords: ['price', 'pricing', 'cost', 'how much', 'charge', 'fee', 'rate', 'budget'],
      responses: [
        "Our pricing varies depending on project scope. For a basic AI chatbot integration, we typically start at ₹25,000–₹60,000. Full automation workflows range from ₹80,000–₹3,00,000+. Would you like a custom quote based on your needs?",
        "We offer flexible pricing tailored to your business size and requirements. Our starter packages begin at ₹25K, with enterprise solutions going well beyond. Let me know your use case and I can give a more accurate estimate!",
      ],
    },
    {
      keywords: ['service', 'offer', 'provide', 'do you', 'what can', 'help with', 'solutions'],
      responses: [
        "Catalyst offers a full suite of AI-powered services: 🤖 AI Chatbots & Virtual Assistants, ⚡ Workflow Automation (n8n, Zapier, custom), 🌐 Custom Web & SaaS Development, 📱 Mobile App Development, 📊 AI Analytics & Insights, and 🔗 API Integrations. Which area interests you most?",
        "We specialize in three core areas: AI automation (chatbots, workflows, data pipelines), custom software development (web, mobile, SaaS), and AI-powered analytics. What challenge are you trying to solve?",
      ],
    },
    {
      keywords: ['timeline', 'how long', 'duration', 'time', 'deadline', 'deliver', 'weeks', 'months'],
      responses: [
        "Project timelines depend on complexity: Simple chatbot integrations take 1–2 weeks. Custom automation workflows: 2–4 weeks. Full web/SaaS platforms: 6–16 weeks. Mobile apps: 8–20 weeks. We always provide a detailed timeline in our project proposal. Want to discuss your specific project?",
        "We move fast! Most MVP projects are delivered within 2–6 weeks. For larger enterprise systems, we break it into phases so you start seeing value early. What's your target launch date?",
      ],
    },
    {
      keywords: ['contact', 'reach', 'email', 'call', 'speak', 'talk', 'human', 'team', 'support'],
      responses: [
        "You can reach the Catalyst team at: 📧 hello@catalystindia.in | 📞 +91 98765 43210 | 🌐 catalystindia.in. Or book a free 30-minute consultation directly from our website. Would you like to schedule a call?",
        "Our team is available Mon–Sat, 10AM–7PM IST. Drop us an email at hello@catalystindia.in or use the booking widget on our homepage. I can also collect your details and have someone reach out to you — interested?",
      ],
    },
    {
      keywords: ['website', 'web', 'landing page', 'e-commerce', 'ecommerce', 'frontend', 'design'],
      responses: [
        "Our web development team builds everything from high-converting landing pages to full-stack SaaS platforms. We use modern stacks (Next.js, React, Node.js) and obsess over performance, SEO, and stunning design. What kind of web presence are you looking to build?",
        "We create premium websites that actually convert. From portfolio sites (₹20K–₹50K) to e-commerce platforms (₹80K–₹2.5L) to full SaaS products (₹2L+). Every project includes SEO optimization and mobile-first design. What's your goal?",
      ],
    },
    {
      keywords: ['chatbot', 'bot', 'ai assistant', 'virtual assistant', 'chat widget'],
      responses: [
        "You're using one of our chatbot solutions right now! 😊 We build custom AI chatbots powered by GPT-4, Claude, and Gemini that can handle customer support, lead generation, appointment booking, and more. Integration takes as little as one week. Want to see a demo or get pricing?",
        "Our chatbot solutions are trained on your business data and can be embedded on your website, WhatsApp, or any platform. They handle everything from FAQs to complex sales conversations. This very chat is a live demo! Ready to get one for your business?",
      ],
    },
    {
      keywords: ['saas', 'software', 'platform', 'dashboard', 'app', 'application', 'product'],
      responses: [
        "Building a SaaS product is our specialty! We handle everything: product design, frontend, backend, database, auth, billing integration (Razorpay/Stripe), and deployment. We typically deliver a full MVP in 8–16 weeks. Do you have a product idea you'd like to discuss?",
        "Our SaaS development process is battle-tested: Discovery → Design → Build → Launch → Scale. We use Next.js + Node.js + PostgreSQL for most projects, but adapt to your needs. What problem is your SaaS going to solve?",
      ],
    },
    {
      keywords: ['mobile', 'android', 'ios', 'app', 'react native', 'flutter'],
      responses: [
        "We develop cross-platform mobile apps using React Native and Flutter — one codebase for both iOS and Android. A typical MVP takes 8–16 weeks and includes design, development, testing, and App Store/Play Store submission. What kind of mobile app are you envisioning?",
        "Mobile apps are a key part of our offering. We build everything from consumer apps to internal business tools. If you already have a web product, we can often accelerate the mobile version significantly. Tell me more about what you have in mind!",
      ],
    },
    {
      keywords: ['automation', 'workflow', 'automate', 'n8n', 'zapier', 'integrate', 'integration'],
      responses: [
        "Workflow automation is where Catalyst truly shines ✨ We automate repetitive tasks, data flows, CRM updates, email sequences, report generation, and much more using n8n, custom APIs, and AI. Most clients save 20–40 hours per week after automation. What process would you like to automate?",
        "Our automation engineers can map your current workflows and identify the highest-impact automation opportunities. We work with 200+ tools including Salesforce, HubSpot, Notion, Slack, Google Workspace, and custom APIs. What's your biggest manual bottleneck right now?",
      ],
    },
    {
      keywords: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'howdy', 'greetings'],
      responses: [
        "Hello there! Great to meet you 👋 I'm Gippo, Catalyst's AI assistant. Whether you're curious about our AI services, need a quote, or want to book a consultation — I'm here to help. What can I do for you today?",
        "Hey! Welcome to Catalyst 🚀 We help businesses grow with cutting-edge AI automation and custom software. What brings you here today — are you looking to automate something, build a product, or just exploring?",
      ],
    },
    {
      keywords: ['consult', 'consultation', 'meeting', 'demo', 'call', 'book', 'schedule', 'appointment'],
      responses: [
        "Absolutely! We offer free 30-minute consultations where we discuss your goals, explore solutions, and outline a rough plan — no commitment required. You can book directly at catalystindia.in/book or I can have someone from our team reach out to you. Which do you prefer?",
        "A discovery call is a great next step! Our consultations are always free and no-strings-attached. We'll listen to your challenges and propose actionable AI solutions. Would you like me to collect your details so our team can reach out at a time that works for you?",
      ],
    },
    {
      keywords: ['ai', 'artificial intelligence', 'machine learning', 'gpt', 'llm', 'openai', 'gemini'],
      responses: [
        "AI is at the core of everything we do at Catalyst. We leverage GPT-4, Claude, Gemini, and custom fine-tuned models to power chatbots, content generation, data analysis, predictive tools, and automated decision-making. What AI use case are you exploring?",
        "We're big believers in practical AI — not just hype. Our AI implementations are designed to solve real business problems: reducing response times, cutting costs, improving accuracy, and unlocking new revenue streams. What's your biggest pain point right now?",
      ],
    },
  ];

  const DEFAULT_RESPONSES = [
    "That's a great question! I'd love to connect you with our team who can give you a detailed answer. Could you share a bit more about what you're looking for? Or would you like to book a free consultation with one of our AI experts?",
    "Interesting! At Catalyst, we work with businesses of all sizes to solve problems with AI and automation. To give you the most relevant information, could you tell me a bit more about your business or what you're trying to achieve?",
    "I want to make sure I give you the most helpful answer. Could you elaborate on that? Alternatively, you can reach our team directly at hello@catalystindia.in or book a free call on our website.",
    "Great point! Our team would be best placed to address that in detail. Would you like to leave your contact info so one of our specialists can follow up with you directly?",
  ];

  // ── UTILITY HELPERS ──────────────────────────────────────────────────────────

  function formatTime(date) {
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  function randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
  }

  function nl2br(text) {
    return escapeHtml(text).replace(/\n/g, '<br>');
  }

  // ── CSS INJECTION ────────────────────────────────────────────────────────────

  function injectStyles() {
    if (document.getElementById('catalyst-chatbot-css')) return;

    // Try linking external CSS first
    const link = document.createElement('link');
    link.id = 'catalyst-chatbot-css';
    link.rel = 'stylesheet';
    link.href = CONFIG.cssPath;
    document.head.appendChild(link);

    // Inline critical styles as fallback (subset for launcher & window positioning)
    const fallback = document.createElement('style');
    fallback.id = 'catalyst-chatbot-css-inline';
    fallback.textContent = `
      .chatbot-launcher,.chatbot-window{font-family:'Inter',sans-serif;box-sizing:border-box}
      *,.chatbot-launcher *,.chatbot-window *{box-sizing:border-box}
    `;
    document.head.appendChild(fallback);
  }

  // ── DOM CREATION ─────────────────────────────────────────────────────────────

  function createLauncher() {
    const btn = document.createElement('button');
    btn.className = 'chatbot-launcher';
    btn.setAttribute('aria-label', 'Open chat with Gippo');
    btn.setAttribute('title', 'Chat with Gippo');
    btn.id = 'catalyst-chatbot-launcher';

    btn.innerHTML = `
      <span class="chatbot-launcher-icon" style="font-size: 24px; line-height: 1;">💬</span>
      <span class="chatbot-online-dot" aria-hidden="true"></span>
    `;

    btn.addEventListener('click', toggle);
    return btn;
  }

  function createCloseIcon() {
    return `<span style="font-size: 16px; font-weight: bold; line-height: 1;">✕</span>`;
  }

  function createHeader() {
    const header = document.createElement('div');
    header.className = 'chatbot-header';

    header.innerHTML = `
      <div class="chatbot-header-info">
        <div class="chatbot-avatar-wrap">
          <div class="chatbot-avatar" aria-hidden="true">
            <span style="font-size: 20px; line-height: 1;">🤖</span>
          </div>
          <span class="chatbot-avatar-dot" aria-hidden="true"></span>
        </div>
        <div class="chatbot-header-text">
          <div class="chatbot-title">Gippo — AI Assistant</div>
          <div class="chatbot-subtitle"><span class="chatbot-status">Online</span> · Typically replies instantly</div>
        </div>
      </div>
      <button class="chatbot-close" aria-label="Close chat" id="catalyst-chatbot-close">
        ${createCloseIcon()}
      </button>
    `;

    return header;
  }

  function createMessagesArea() {
    const area = document.createElement('div');
    area.className = 'chatbot-messages';
    area.id = 'catalyst-chatbot-messages';
    area.setAttribute('role', 'log');
    area.setAttribute('aria-live', 'polite');
    area.setAttribute('aria-label', 'Chat messages');
    return area;
  }

  function createInputRow() {
    const row = document.createElement('div');
    row.className = 'chatbot-input-row';

    const textarea = document.createElement('textarea');
    textarea.className = 'chatbot-input';
    textarea.id = 'catalyst-chatbot-input';
    textarea.placeholder = 'Ask me anything…';
    textarea.rows = 1;
    textarea.setAttribute('aria-label', 'Chat message input');

    const sendBtn = document.createElement('button');
    sendBtn.className = 'chatbot-send';
    sendBtn.id = 'catalyst-chatbot-send';
    sendBtn.setAttribute('aria-label', 'Send message');
    sendBtn.innerHTML = `
      <span style="font-size: 18px; line-height: 1;">➤</span>
    `;

    // Auto-resize textarea
    textarea.addEventListener('input', function () {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    });

    textarea.addEventListener('keydown', handleKeydown);
    sendBtn.addEventListener('click', sendMessage);

    row.appendChild(textarea);
    row.appendChild(sendBtn);

    return row;
  }

  function createWindow() {
    const win = document.createElement('div');
    win.className = 'chatbot-window';
    win.id = 'catalyst-chatbot-window';
    win.setAttribute('role', 'dialog');
    win.setAttribute('aria-modal', 'false');
    win.setAttribute('aria-label', 'Chat with Gippo');

    const header = createHeader();
    const messages = createMessagesArea();
    const inputRow = createInputRow();

    win.appendChild(header);
    win.appendChild(messages);
    win.appendChild(inputRow);

    return win;
  }

  // ── RENDER FUNCTIONS ─────────────────────────────────────────────────────────

  function addMessage(role, content, isHTML = false) {
    const now = new Date();
    const msgEl = document.createElement('div');
    msgEl.className = `chatbot-msg ${role === 'user' ? 'user' : 'bot'}`;

    const contentEl = document.createElement('div');
    contentEl.className = 'msg-content';
    if (isHTML) {
      contentEl.innerHTML = content;
    } else {
      contentEl.innerHTML = nl2br(content);
    }

    const timeEl = document.createElement('span');
    timeEl.className = 'msg-time';
    timeEl.textContent = formatTime(now);

    msgEl.appendChild(contentEl);
    msgEl.appendChild(timeEl);

    // Add to messages array (non-HTML messages only)
    if (!isHTML) {
      state.messages.push({ role, content, timestamp: now });
      // Enforce max history
      if (state.messages.length > CONFIG.maxHistory) {
        state.messages.shift();
      }
    }

    els.messages.appendChild(msgEl);
    scrollToBottom();

    if (role === 'assistant') {
      state.botMessageCount++;
    }

    return msgEl;
  }

  function showTyping() {
    if (state.isTyping) return;
    state.isTyping = true;

    const typingEl = document.createElement('div');
    typingEl.className = 'chatbot-typing';
    typingEl.id = 'catalyst-chatbot-typing';
    typingEl.setAttribute('aria-label', 'Gippo is typing');
    typingEl.innerHTML = '<span></span><span></span><span></span>';

    els.messages.appendChild(typingEl);
    els.typingEl = typingEl;
    scrollToBottom();
  }

  function hideTyping() {
    state.isTyping = false;
    if (els.typingEl && els.typingEl.parentNode) {
      els.typingEl.parentNode.removeChild(els.typingEl);
    }
    els.typingEl = null;
  }

  function scrollToBottom() {
    if (!els.messages) return;
    requestAnimationFrame(() => {
      els.messages.scrollTo({
        top: els.messages.scrollHeight,
        behavior: 'smooth',
      });
    });
  }

  // ── LEAD CAPTURE FORM ────────────────────────────────────────────────────────

  function showLeadForm() {
    if (state.leadFormShown || state.leadCaptured) return;
    state.leadFormShown = true;

    // Create a wrapper that spans full width
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;width:100%;';

    const form = document.createElement('div');
    form.className = 'chatbot-lead-form';
    form.id = 'catalyst-lead-form';

    form.innerHTML = `
      <h4>🎯 Get a Free Consultation</h4>
      <p>Leave your details and our team will reach out within 24 hours with a custom solution for you.</p>
      <input type="text" id="lead-name" placeholder="Your Name *" autocomplete="name" />
      <input type="email" id="lead-email" placeholder="Email Address *" autocomplete="email" />
      <input type="tel" id="lead-phone" placeholder="Phone Number (optional)" autocomplete="tel" />
      <button class="lead-submit" id="lead-submit-btn">Send My Details →</button>
    `;

    wrapper.appendChild(form);
    els.messages.appendChild(wrapper);
    scrollToBottom();

    // Attach submit handler
    document.getElementById('lead-submit-btn').addEventListener('click', handleLeadSubmit);

    // Allow Enter key on inputs
    ['lead-name', 'lead-email', 'lead-phone'].forEach((id) => {
      const input = document.getElementById(id);
      if (input) {
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleLeadSubmit();
          }
        });
      }
    });
  }

  async function handleLeadSubmit() {
    const nameInput = document.getElementById('lead-name');
    const emailInput = document.getElementById('lead-email');
    const phoneInput = document.getElementById('lead-phone');
    const submitBtn = document.getElementById('lead-submit-btn');

    const name = nameInput ? nameInput.value.trim() : '';
    const email = emailInput ? emailInput.value.trim() : '';
    const phone = phoneInput ? phoneInput.value.trim() : '';

    // Validation
    if (!name) {
      nameInput.style.borderColor = 'rgba(248,113,113,0.6)';
      nameInput.focus();
      return;
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      emailInput.style.borderColor = 'rgba(248,113,113,0.6)';
      emailInput.focus();
      return;
    }

    state.leadData = { name, email, phone };

    // Disable form
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending…';
    }

    const success = await submitLead({ name, email, phone });

    const form = document.getElementById('catalyst-lead-form');
    if (form) {
      if (success) {
        state.leadCaptured = true;
        form.innerHTML = `
          <h4 style="color:#22c55e">✅ Details Received!</h4>
          <p style="color:#4e5a70">Thanks ${escapeHtml(name)}! Our team will reach out to you at ${escapeHtml(email)} within 24 hours.</p>
        `;
        // Send a bot follow-up
        setTimeout(() => {
          addMessage(
            'assistant',
            `Perfect, ${name}! 🎉 Our team will review your enquiry and get back to you soon. In the meantime, feel free to ask me anything else about our services!`,
          );
        }, 600);
      } else {
        form.innerHTML = `
          <h4>Something went wrong</h4>
          <p>Please reach us directly at <strong>hello@catalystindia.in</strong> or call <strong>+91 98765 43210</strong>.</p>
        `;
      }
    }
  }

  async function submitLead(data) {
    try {
      const response = await fetch(CONFIG.leadsEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          sessionId: state.sessionId,
          source: 'chatbot_widget',
          timestamp: new Date().toISOString(),
        }),
      });
      return response.ok;
    } catch (err) {
      console.warn('[Catalyst Chatbot] Lead submission failed:', err);
      return false;
    }
  }

  // ── FALLBACK LOGIC ───────────────────────────────────────────────────────────

  function getFallbackReply(message) {
    const lower = message.toLowerCase();

    for (const entry of FALLBACK_RESPONSES) {
      if (entry.keywords.some((kw) => lower.includes(kw))) {
        return pickRandom(entry.responses);
      }
    }

    return pickRandom(DEFAULT_RESPONSES);
  }

  // ── API CALL ─────────────────────────────────────────────────────────────────

  async function callAPI(userMessage) {
    // Build session messages (last N for context)
    const sessionMessages = state.messages
      .slice(-CONFIG.maxHistory)
      .map(({ role, content }) => ({ role, content }));

    const response = await fetch(CONFIG.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        message: userMessage,
        sessionId: state.sessionId,
        sessionMessages,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.reply) {
      throw new Error('Invalid API response: missing reply');
    }

    return data.reply;
  }

  // ── SEND MESSAGE ─────────────────────────────────────────────────────────────

  async function sendMessage() {
    if (!els.input || !els.sendBtn) return;

    const text = els.input.value.trim();
    if (!text || state.isTyping) return;

    // Clear input and reset height
    els.input.value = '';
    els.input.style.height = 'auto';
    els.sendBtn.disabled = true;

    // Render user message
    addMessage('user', text);

    // Show typing indicator
    showTyping();

    // Simulate natural typing delay
    const delay = randomBetween(CONFIG.typingDelayMin, CONFIG.typingDelayMax);

    try {
      // Attempt API call (with a minimum display time for typing indicator)
      const [reply] = await Promise.all([
        callAPI(text),
        new Promise((resolve) => setTimeout(resolve, delay)),
      ]);

      hideTyping();
      addMessage('assistant', reply);
    } catch (err) {
      console.warn('[Catalyst Chatbot] API call failed, using fallback:', err.message);

      // Wait for minimum delay before showing fallback
      await new Promise((resolve) => setTimeout(resolve, delay));
      hideTyping();

      const fallback = getFallbackReply(text);
      addMessage('assistant', fallback);
    }

    els.sendBtn.disabled = false;

    // Check if we should show lead capture form
    checkLeadCapture();
  }

  // ── LEAD CAPTURE CHECK ───────────────────────────────────────────────────────

  function checkLeadCapture() {
    if (!state.leadCaptured && !state.leadFormShown && state.botMessageCount >= CONFIG.leadTriggerAfter) {
      // Small delay so the form appears after the bot message animation
      setTimeout(showLeadForm, 600);
    }
  }

  // ── EVENT HANDLERS ───────────────────────────────────────────────────────────

  function handleKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function toggle() {
    if (state.isOpen) {
      close();
    } else {
      open();
    }
  }

  function open() {
    state.isOpen = true;

    if (els.launcher) {
      els.launcher.classList.add('open');
      els.launcher.setAttribute('aria-expanded', 'true');
      els.launcher.setAttribute('aria-label', 'Close chat');
    }

    if (els.window) {
      els.window.classList.add('open');
    }

    // Show welcome message on first open
    if (!state.hasWelcomed) {
      state.hasWelcomed = true;

      setTimeout(() => {
        showTyping();
        setTimeout(() => {
          hideTyping();
          addMessage('assistant', CONFIG.welcomeMessage);
        }, randomBetween(800, 1400));
      }, 300);
    }

    // Focus input after animation
    setTimeout(() => {
      if (els.input) els.input.focus();
    }, 350);
  }

  function close() {
    state.isOpen = false;

    if (els.launcher) {
      els.launcher.classList.remove('open');
      els.launcher.setAttribute('aria-expanded', 'false');
      els.launcher.setAttribute('aria-label', 'Open chat with Gippo');
    }

    if (els.window) {
      els.window.classList.remove('open');
    }
  }

  // ── INIT ─────────────────────────────────────────────────────────────────────

  function init() {
    // Prevent double initialization
    if (document.getElementById('catalyst-chatbot-launcher')) return;

    // Inject CSS
    injectStyles();

    // Create DOM elements
    els.launcher = createLauncher();
    els.window = createWindow();

    // Cache references
    els.messages = els.window.querySelector('#catalyst-chatbot-messages');
    els.input = els.window.querySelector('#catalyst-chatbot-input');
    els.sendBtn = els.window.querySelector('#catalyst-chatbot-send');
    els.closeBtn = els.window.querySelector('#catalyst-chatbot-close');

    // Attach close button handler
    if (els.closeBtn) {
      els.closeBtn.addEventListener('click', close);
    }

    // Append to body
    document.body.appendChild(els.window);
    document.body.appendChild(els.launcher);

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && state.isOpen) {
        close();
      }
    });

    // Close when clicking outside (optional UX enhancement)
    document.addEventListener('click', (e) => {
      if (
        state.isOpen &&
        els.window &&
        els.launcher &&
        !els.window.contains(e.target) &&
        !els.launcher.contains(e.target)
      ) {
        close();
      }
    });

    console.log(
      '%c[Catalyst Chatbot] Gippo initialized 🚀',
      'color:#3B82F6;font-weight:bold;font-size:12px;',
    );
  }

  // ── BOOTSTRAP ────────────────────────────────────────────────────────────────

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // DOM already loaded (e.g., script added dynamically)
    init();
  }

  // Expose public API for programmatic control
  window.CatalystChatbot = {
    open,
    close,
    toggle,
    getState: () => ({ ...state }),
  };
})();
