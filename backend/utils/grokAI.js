/* ============================================================
   utils/grokAI.js — Grok (xAI) API helper
   Uses OpenAI-compatible API at https://api.x.ai/v1
   ============================================================ */

'use strict';

const fetch = require('node-fetch');

const GROK_API_URL = 'https://api.x.ai/v1/chat/completions';
const GROK_MODEL   = process.env.GROK_MODEL || 'grok-3';

const SYSTEM_PROMPT = `You are Gippo, the AI assistant for Catalyst — an AI Automation & Software Development agency based in India. You are helpful, professional, and enthusiastic about AI automation.

About Catalyst:
- We build AI agents, automation systems, websites, SaaS apps, chatbots, CRM integrations
- Services: AI Automation, Website Development, SaaS Development, AI Chatbots, WhatsApp Automation, CRM Integration, Lead Generation, API Integration, Business Automation, AI Agents
- Pricing: Starter from ₹25,000, Growth from ₹75,000, Enterprise custom
- We serve businesses across India and globally
- Contact: hello@catalystindia.com

Your goals:
1. Answer questions about Catalyst's services warmly and professionally
2. Collect lead information naturally: name, email, phone, company, budget
3. Help qualify leads by understanding their needs
4. Book discovery calls and consultations
5. Generate rough project cost estimates

Lead collection flow (collect these over conversation naturally):
- Name
- Email address
- Phone number  
- Company name
- Budget range
- Service needed

Always be conversational. Never sound like a bot. If asked for pricing, give ranges and explain ROI.`;

/**
 * Send a message to Grok and get a response.
 * @param {Array<{role: string, content: string}>} messages
 * @param {Object} sessionContext
 * @returns {Promise<string>}
 */
async function chatWithGrok(messages, sessionContext = {}) {
  const apiKey = process.env.GROK_API_KEY;

  if (!apiKey) {
    return getFallbackResponse(messages[messages.length - 1]?.content || '');
  }

  try {
    const response = await fetch(GROK_API_URL, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model:      GROK_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages,
        ],
        max_tokens:  500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('[Grok API Error]', response.status, err);
      return getFallbackResponse(messages[messages.length - 1]?.content || '');
    }

    const data = await response.json();
    return (
      data.choices?.[0]?.message?.content ||
      "I'm having trouble responding right now. Please email us at hello@catalystindia.com"
    );
  } catch (error) {
    console.error('[Grok API Error]', error.message);
    return getFallbackResponse(messages[messages.length - 1]?.content || '');
  }
}

/**
 * Extract lead info from the conversation text.
 * @param {Array<{role: string, content: string}>} messages
 * @returns {Object}
 */
function extractLeadInfo(messages) {
  const fullText = messages.map(m => m.content).join(' ');
  const lower    = fullText.toLowerCase();
  const lead     = {};

  // Email
  const emailMatch = fullText.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) lead.email = emailMatch[0].toLowerCase();

  // Phone (Indian formats + international)
  const phoneMatch = fullText.match(/(\+91|91|0)?[6-9]\d{9}|\+?[1-9]\d{9,13}/);
  if (phoneMatch) lead.phone = phoneMatch[0];

  // Budget (INR mentions)
  const budgetMatch = lower.match(/(?:₹|rs\.?|inr\s?)[\d,]+(?:\s*(?:k|lakh|lakhs|thousand|lac|lacs))?/i) ||
                      lower.match(/[\d,]+\s*(?:k|lakh|lakhs|thousand|lac|lacs)/i);
  if (budgetMatch) lead.budget = budgetMatch[0];

  // Name — look for "my name is ..." or "I am ..."
  const nameMatch = fullText.match(/(?:my name is|i(?:'m| am)|call me)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
  if (nameMatch) lead.name = nameMatch[1];

  // Company — look for "company is ..." or "work at ..." or "from ..."
  const companyMatch = fullText.match(/(?:company(?:\s+is)?|work(?:ing)?\s+at|from)\s+([A-Z][A-Za-z\s&.]{2,30})/);
  if (companyMatch) lead.company = companyMatch[1].trim();

  // Service interest
  const services = [
    'ai automation', 'website', 'web development', 'saas', 'chatbot',
    'whatsapp', 'crm', 'lead generation', 'api', 'business automation', 'ai agent',
    'mobile app',
  ];
  const foundService = services.find(s => lower.includes(s));
  if (foundService) lead.service = foundService;

  return lead;
}

/**
 * Fallback responses when Grok API is unavailable.
 * @param {string} userMessage
 * @returns {string}
 */
function getFallbackResponse(userMessage) {
  const msg = userMessage.toLowerCase();

  if (msg.includes('price') || msg.includes('cost') || msg.includes('budget') || msg.includes('rate')) {
    return "Our projects start at ₹25,000 for Starter packages, ₹75,000+ for Growth, and custom pricing for Enterprise. The exact cost depends on your requirements — could you share more about what you need? I can give you a more accurate estimate.";
  }

  if (msg.includes('service') || msg.includes('offer') || msg.includes('build') || msg.includes('help')) {
    return "We offer AI Automation, Website Development, SaaS Development, AI Chatbots, WhatsApp Automation, CRM Integration, Lead Generation, API Integration, Business Automation, and AI Agents! What specific service are you most interested in?";
  }

  if (msg.includes('contact') || msg.includes('call') || msg.includes('meet') || msg.includes('talk')) {
    return "I'd love to set up a discovery call! Please share your email and phone number and our team will reach out within 24 hours. Alternatively, email us directly at hello@catalystindia.com.";
  }

  if (msg.includes('time') || msg.includes('deadline') || msg.includes('long') || msg.includes('weeks')) {
    return "Timelines vary by project complexity: simple websites take 1–2 weeks, AI chatbots 2–4 weeks, custom SaaS 2–4 months. We also offer rush delivery with priority support. What's your target launch date?";
  }

  if (msg.includes('hi') || msg.includes('hello') || msg.includes('hey') || msg.includes('start')) {
    return "Hey there! 👋 I'm Gippo, Catalyst's AI assistant. We help businesses automate workflows, build AI-powered products, and grow with technology. What can I help you with today?";
  }

  return "Thanks for reaching out to Catalyst! We're an AI Automation & Software Development agency helping businesses grow smarter. I'm Gippo, your AI assistant. What can I help you with — services, pricing, or booking a consultation?";
}

module.exports = { chatWithGrok, extractLeadInfo, getFallbackResponse };
