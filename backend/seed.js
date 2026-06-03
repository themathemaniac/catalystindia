/* ============================================================
   seed.js — Database seed script
   Creates admin user + sample data for Catalyst backend
   Run: node seed.js
   ============================================================ */

'use strict';

require('dotenv').config();

const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('\n🌱 Seeding Catalyst database...\n');

  /* ── Admin User ─────────────────────────────────────── */
  const adminEmail    = process.env.ADMIN_EMAIL    || 'admin@catalystindia.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';

  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!existingAdmin) {
    const hashed = await bcrypt.hash(adminPassword, 12);
    await prisma.user.create({
      data: {
        name:     'Catalyst Admin',
        email:    adminEmail,
        password: hashed,
        role:     'admin',
      },
    });
    console.log(`✅ Admin user created: ${adminEmail}`);
  } else {
    console.log(`ℹ️  Admin user already exists: ${adminEmail}`);
  }

  /* ── Sample Services ─────────────────────────────────── */
  const services = [
    {
      title:       'AI Automation',
      description: 'Transform your business operations with intelligent AI automation. We design and deploy custom automation workflows that eliminate repetitive tasks, reduce errors, and free your team to focus on high-value work.',
      icon:        '🤖',
      price:       '₹35,000 – ₹1,00,000',
      features:    JSON.stringify(['Custom workflow automation', 'Integration with existing tools', 'AI-powered decision making', 'Real-time monitoring dashboard', '24/7 automated operations', 'ROI tracking and reporting']),
      category:    'AI',
      order:       1,
      active:      true,
    },
    {
      title:       'AI Chatbots',
      description: 'Deploy intelligent chatbots that understand your customers and drive conversions. Our AI chatbots are trained on your business data and handle everything from lead capture to customer support.',
      icon:        '💬',
      price:       '₹30,000 – ₹80,000',
      features:    JSON.stringify(['Natural language understanding', 'Lead capture and qualification', 'CRM integration', 'Multi-platform deployment', 'Analytics dashboard', 'Human handoff capability']),
      category:    'AI',
      order:       2,
      active:      true,
    },
    {
      title:       'Website Development',
      description: 'Beautiful, fast, and conversion-optimised websites built with modern technologies. From landing pages to full-scale web platforms, we craft digital experiences that captivate and convert.',
      icon:        '🌐',
      price:       '₹25,000 – ₹1,50,000',
      features:    JSON.stringify(['Responsive design', 'SEO optimisation', 'Page speed optimisation', 'CMS integration', 'Analytics setup', '3 months free support']),
      category:    'Development',
      order:       3,
      active:      true,
    },
    {
      title:       'SaaS Development',
      description: 'Launch your software product with a robust, scalable SaaS platform. We handle everything from architecture design to deployment, so you can focus on growing your user base.',
      icon:        '☁️',
      price:       '₹2,00,000 – ₹5,00,000',
      features:    JSON.stringify(['Full-stack development', 'Multi-tenant architecture', 'Payment gateway integration', 'User management system', 'API development', 'DevOps and deployment']),
      category:    'Development',
      order:       4,
      active:      true,
    },
    {
      title:       'WhatsApp Automation',
      description: 'Reach your customers where they are with intelligent WhatsApp automation. Automate order updates, lead nurturing, customer support, and marketing campaigns through WhatsApp Business API.',
      icon:        '📱',
      price:       '₹20,000 – ₹60,000',
      features:    JSON.stringify(['WhatsApp Business API integration', 'Automated message flows', 'Bulk messaging campaigns', 'Lead capture forms', 'CRM sync', 'Analytics and reporting']),
      category:    'Automation',
      order:       5,
      active:      true,
    },
  ];

  let createdServices = 0;
  for (const service of services) {
    const existing = await prisma.service.findFirst({ where: { title: service.title } });
    if (!existing) {
      await prisma.service.create({ data: service });
      createdServices++;
    }
  }
  console.log(`✅ Services: ${createdServices} created (${services.length - createdServices} already existed)`);

  /* ── Sample Blog Posts ───────────────────────────────── */
  const blogPosts = [
    {
      title:      'How AI Automation Saved Our Client 40 Hours Per Week',
      slug:       'ai-automation-saved-40-hours-per-week',
      content:    `# How AI Automation Saved Our Client 40 Hours Per Week

When Sharma & Associates, a mid-sized accounting firm in Bangalore, came to us, they were drowning in manual data entry. Their team of 15 was spending over 40 hours every week just on repetitive tasks — invoice processing, report generation, and client follow-ups.

## The Problem

The firm was growing fast, but their processes weren't scaling. Every new client meant more manual work. They were hiring just to keep up with admin tasks.

## Our Solution

We built a custom AI automation stack using:
- **Document AI** to extract data from invoices and receipts automatically
- **Workflow automation** to route processed documents to the right team members
- **AI-generated reports** that pulled data from multiple systems and formatted them automatically
- **Smart email automation** for client follow-ups based on account status

## The Results

After 6 weeks of implementation:
- **42 hours saved per week** in manual data entry
- **98.7% accuracy** in invoice processing (up from 94.2%)
- **₹18 lakh saved annually** in operational costs
- Team could focus on strategic client work instead of admin

## Key Takeaway

AI automation isn't about replacing people — it's about making them dramatically more effective. The Sharma & Associates team now handles 3x the clients with the same headcount, and they're happier because they're doing meaningful work.

**Ready to automate your business? [Contact us today.](/contact)**`,
      excerpt:    'A case study of how we helped a Bangalore accounting firm save 40+ hours weekly and ₹18 lakh annually through intelligent AI automation.',
      tags:       JSON.stringify(['AI Automation', 'Case Study', 'Business Automation', 'ROI']),
      published:  true,
      coverImage: null,
    },
    {
      title:      '10 Signs Your Business Needs AI Automation in 2025',
      slug:       '10-signs-your-business-needs-ai-automation-2025',
      content:    `# 10 Signs Your Business Needs AI Automation in 2025

The difference between businesses that thrive and those that struggle often comes down to one thing: how efficiently they operate. Here are 10 telltale signs that AI automation could be a game-changer for your business.

## 1. You're drowning in repetitive tasks
If your team spends hours on data entry, report generation, or copy-paste work, that's automation waiting to happen.

## 2. Human errors are costing you money
Manual processes have a 1-4% error rate. AI automation typically achieves 99%+ accuracy.

## 3. You're growing, but margins are shrinking
More revenue but higher costs? Automation breaks this cycle by scaling without proportional headcount growth.

## 4. Customer response times are too slow
AI-powered chatbots and automated workflows can respond in seconds, 24/7.

## 5. Your data lives in silos
If your CRM, email, accounting software, and spreadsheets don't talk to each other, automation can connect them.

## 6. You're losing leads due to slow follow-up
Studies show 78% of leads go to the company that responds first. Automation ensures you're always first.

## 7. Your team complains about soul-crushing work
High turnover in admin roles? People hate repetitive work. Automate it and retain talent.

## 8. Reporting takes days instead of hours
Real-time dashboards and automated reports mean decisions based on current data.

## 9. You can't scale without hiring
Every business process should scale with minimal additional human effort.

## 10. Competitors are moving faster
If your competitors are deploying AI and you're not, you're already behind.

## What's Next?

The good news: getting started with AI automation doesn't require a massive budget or a team of engineers. At Catalyst, we help businesses of all sizes implement automation that delivers ROI within weeks.

**Book a free consultation to discover your automation opportunities.**`,
      excerpt:    'Is your business ready for AI automation? Here are 10 clear signals that now is the time to transform your operations with intelligent automation.',
      tags:       JSON.stringify(['AI Automation', 'Business Growth', 'Productivity', 'Guide']),
      published:  true,
      coverImage: null,
    },
    {
      title:      'Building a Lead-Generating AI Chatbot: Our Complete Framework',
      slug:       'building-lead-generating-ai-chatbot-framework',
      content:    `# Building a Lead-Generating AI Chatbot: Our Complete Framework

After building 50+ AI chatbots for businesses across India, we've refined our framework for creating chatbots that actually convert visitors into leads. Here's our complete playbook.

## Why Most Chatbots Fail

Most businesses deploy generic chatbots that frustrate users. They're too rigid, can't handle natural language, and feel like talking to an FAQ page. Our approach is fundamentally different.

## The ARIA Framework

We call our methodology ARIA — Authentic, Responsive, Intelligent, Action-oriented.

### Authentic
Train the chatbot on your specific business context, tone of voice, and common objections. It should feel like talking to your best salesperson.

### Responsive
Never make users wait. Our chatbots respond in under 200ms with contextually relevant answers.

### Intelligent
Use large language models (like Grok or GPT) to handle complex, nuanced conversations, not just keyword matching.

### Action-oriented
Every conversation should move toward a goal: capture an email, book a call, or qualify the lead.

## The Lead Capture Flow

1. **Warm opener** — Greet based on the page they're on
2. **Value proposition** — Explain what you do in one sentence
3. **Discovery questions** — Understand their need (2-3 questions max)
4. **Soft ask** — "Can I send you a custom quote?" (gets the email)
5. **Qualification** — Budget, timeline, decision-maker status
6. **Next step** — Book a call or send resources

## Technical Architecture

- **Frontend**: Floating chat widget (React or vanilla JS)
- **Backend**: Node.js API with session management
- **AI Model**: Grok-3 via xAI API
- **Database**: PostgreSQL for session persistence
- **CRM sync**: Automatic lead creation in your CRM

## Results We've Seen

- Average 23% increase in lead capture rate
- 65% reduction in bounce rate on pricing pages
- 3x higher engagement vs. contact forms

Ready to build your lead-generating chatbot? [Get in touch.](/contact)`,
      excerpt:    'Our proven ARIA framework for building AI chatbots that convert website visitors into qualified leads. Includes technical architecture and real results.',
      tags:       JSON.stringify(['AI Chatbot', 'Lead Generation', 'Framework', 'Technical']),
      published:  true,
      coverImage: null,
    },
  ];

  let createdPosts = 0;
  for (const post of blogPosts) {
    const existing = await prisma.blogPost.findUnique({ where: { slug: post.slug } });
    if (!existing) {
      await prisma.blogPost.create({ data: post });
      createdPosts++;
    }
  }
  console.log(`✅ Blog posts: ${createdPosts} created (${blogPosts.length - createdPosts} already existed)`);

  /* ── Sample Leads ────────────────────────────────────── */
  const leads = [
    {
      name:    'Priya Sharma',
      email:   'priya@techstartup.in',
      phone:   '+91 98765 43210',
      company: 'TechStartup India',
      budget:  '₹50,000 – ₹1,00,000',
      service: 'AI Chatbot',
      message: 'We need an AI chatbot for our e-commerce platform to handle customer queries 24/7.',
      source:  'website',
      status:  'contacted',
      score:   85,
    },
    {
      name:    'Rahul Mehta',
      email:   'rahul.mehta@mehtacorp.com',
      phone:   '+91 87654 32109',
      company: 'Mehta Corporation',
      budget:  '₹2,00,000+',
      service: 'Business Automation',
      message: 'Looking to automate our HR onboarding process and payroll reporting.',
      source:  'referral',
      status:  'qualified',
      score:   92,
    },
    {
      name:    'Ananya Krishnan',
      email:   'ananya@designstudio.co',
      phone:   '+91 76543 21098',
      company: 'Creative Design Studio',
      budget:  '₹25,000 – ₹50,000',
      service: 'Website Development',
      message: 'Need a modern portfolio website with a blog and contact form.',
      source:  'chatbot',
      status:  'new',
      score:   72,
    },
    {
      name:    'Vikram Singh',
      email:   'vikram@logisticspro.in',
      phone:   '+91 65432 10987',
      company: 'LogisticsPro',
      budget:  '₹75,000 – ₹1,50,000',
      service: 'SaaS Development',
      message: 'Building a fleet management SaaS for the logistics industry.',
      source:  'linkedin',
      status:  'proposal',
      score:   88,
    },
    {
      name:    'Meera Patel',
      email:   'meera@retailchain.com',
      phone:   '+91 54321 09876',
      company: 'Retail Chain India',
      budget:  '₹30,000 – ₹60,000',
      service: 'WhatsApp Automation',
      message: 'We want to send order updates and promotional messages via WhatsApp to our 10,000 customers.',
      source:  'google',
      status:  'closed-won',
      score:   95,
    },
  ];

  let createdLeads = 0;
  for (const lead of leads) {
    const existing = await prisma.lead.findFirst({ where: { email: lead.email } });
    if (!existing) {
      await prisma.lead.create({ data: lead });
      createdLeads++;
    }
  }
  console.log(`✅ Leads: ${createdLeads} created (${leads.length - createdLeads} already existed)`);

  /* ── Sample Portfolio Items ──────────────────────────── */
  const portfolioItems = [
    {
      title:       'E-Commerce AI Chatbot — ShopEasy India',
      description: 'Built an AI-powered customer support chatbot for a growing e-commerce platform. The bot handles 85% of customer queries without human intervention, processes returns, tracks orders, and upsells products using AI recommendations.',
      category:    'AI Chatbot',
      client:      'ShopEasy India',
      imageUrl:    null,
      liveUrl:     null,
      metrics:     JSON.stringify({ 'Queries Automated': '85%', 'Response Time': '<200ms', 'Customer Satisfaction': '4.8/5', 'Revenue Uplift': '₹12L/month' }),
      tags:        JSON.stringify(['AI Chatbot', 'E-Commerce', 'Node.js', 'Grok AI']),
      featured:    true,
      order:       1,
    },
    {
      title:       'HR Automation Platform — ManufactureCo',
      description: 'End-to-end HR automation covering onboarding, attendance tracking, payroll processing, and compliance reporting. Replaced manual spreadsheet-based processes affecting 200+ employees.',
      category:    'Business Automation',
      client:      'ManufactureCo (Confidential)',
      imageUrl:    null,
      liveUrl:     null,
      metrics:     JSON.stringify({ 'Hours Saved Weekly': '60 hours', 'Payroll Accuracy': '99.9%', 'Employee Count': '200+', 'Cost Savings': '₹28L/year' }),
      tags:        JSON.stringify(['Automation', 'HR Tech', 'Python', 'React']),
      featured:    true,
      order:       2,
    },
    {
      title:       'SaaS Fleet Management — LogisticsPro',
      description: 'Full-stack SaaS platform for managing a fleet of 500+ delivery vehicles. Real-time GPS tracking, route optimisation, driver performance scoring, and automated dispatch system.',
      category:    'SaaS Development',
      client:      'LogisticsPro',
      imageUrl:    null,
      liveUrl:     null,
      metrics:     JSON.stringify({ 'Vehicles Tracked': '500+', 'Route Efficiency': '+23%', 'Delivery SLA': '97.2%', 'Monthly Active Users': '150+' }),
      tags:        JSON.stringify(['SaaS', 'Logistics', 'GPS Tracking', 'Node.js', 'PostgreSQL']),
      featured:    true,
      order:       3,
    },
  ];

  let createdPortfolio = 0;
  for (const item of portfolioItems) {
    const existing = await prisma.portfolioItem.findFirst({ where: { title: item.title } });
    if (!existing) {
      await prisma.portfolioItem.create({ data: item });
      createdPortfolio++;
    }
  }
  console.log(`✅ Portfolio: ${createdPortfolio} items created (${portfolioItems.length - createdPortfolio} already existed)`);

  console.log('\n🎉 Seed completed successfully!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   Admin login:`);
  console.log(`   Email:    ${adminEmail}`);
  console.log(`   Password: ${adminPassword}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch(err => {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
