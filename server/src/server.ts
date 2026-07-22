import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { dbHelper } from './db.js';
import { generateAdCreative } from './services/aiGenerator.js';
import { startScheduler } from './services/scheduler.js';

dotenv.config();
const app = express();
const port = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

// Health
app.get('/health', (req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

const knownMcpServers = [
  { id: 'mock-social', name: 'Mock Social Media MCP', url: 'http://127.0.0.1:3001/sse' },
  { id: 'supabase', name: 'Supabase', url: process.env.SUPABASE_MCP_URL || '' },
  { id: 'vercel', name: 'Vercel', url: process.env.VERCEL_MCP_URL || '' },
  { id: 'notion', name: 'Notion', url: process.env.NOTION_MCP_URL || '' },
  { id: 'digitalocean', name: 'DigitalOcean', url: process.env.DO_MCP_URL || '' },
  { id: 'jarvis', name: 'Jarvis', url: process.env.JARVIS_MCP_URL || '' }
];

async function checkMcpStatus(server: any) {
  if (!server.url) return { ...server, status: 'disabled', detail: 'URL not configured' };
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(server.url, { method: 'GET', signal: controller.signal });
    clearTimeout(timeout);
    return { ...server, status: res && (res.status === 405 || res.ok) ? 'online' : 'error', detail: `HTTP ${res.status}` };
  } catch (err: any) {
    return { ...server, status: 'offline', detail: err?.message || 'unreachable' };
  }
}

app.get('/api/mcp/status', async (req, res) => {
  const results = await Promise.all(knownMcpServers.map(checkMcpStatus));
  const connected = results.filter(r => r.status === 'online').length;
  res.json({ snapshots: results, summary: { total: results.length, connected } });
});

async function seedInitialData() {
  const tenantCount = dbHelper.tenants.count();
  if (tenantCount > 0) return;

  console.log('[Seed] Database is empty, seeding initial multi-tenant marketing data (SQLite)...');

  const glowSkin = dbHelper.tenants.create({ name: 'GlowSkin Cosmetics', brandVoice: 'Radiant, scientific, luxurious' });
  const saasify = dbHelper.tenants.create({ name: 'SaaSify Metrics', brandVoice: 'Expert, professional, analytical, concise' });

  dbHelper.users.create({ email: 'admin@glowskin.com', name: 'Elena Rostova', role: 'ADMIN', tenantId: glowSkin.id });
  dbHelper.users.create({ email: 'marketer@saasify.com', name: 'John Doe', role: 'ADMIN', tenantId: saasify.id });

  const serum = dbHelper.products.create({ name: 'Vitamin C Brightening Serum', description: 'A daily serum containing 15% pure Vitamin C and Hyaluronic acid to boost brightness and skin texture.', targetAudience: 'Skincare enthusiasts, busy young professionals looking to refresh fatigued skin', tenantId: glowSkin.id });
  const dashboard = dbHelper.products.create({ name: 'SaaSify Analytics Suite', description: 'A real-time dashboard unifying marketing spend and churn analytics for small B2B SaaS companies.', targetAudience: 'SaaS founders, growth marketers, tech CFOs', tenantId: saasify.id });

  const campaignSkin = dbHelper.campaigns.create({ name: 'Summer Glow Launch', status: 'ACTIVE', tenantId: glowSkin.id });
  const campaignSaas = dbHelper.campaigns.create({ name: 'Q3 SaaS Growth Drive', status: 'ACTIVE', tenantId: saasify.id });

  const creativeSkin = dbHelper.adCreatives.create({ productId: serum.id, headline: 'Unlock Radiant Skin in 7 Days!', bodyText: 'Fatigued skin? Brighten up with our 15% Vitamin C serum. Hydrates, plumps, and restores your natural glow.', hashtags: '#skincare, #glowskin, #vegancosmetics, #brightening', imageUrl: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=600' });
  const creativeSaas = dbHelper.adCreatives.create({ productId: dashboard.id, headline: 'Stop Guessing Your Marketing ROI.', bodyText: 'SaaSify unifies all your client acquisition metrics in one gorgeous, real-time dashboard. Spot churn, optimize spend.', hashtags: '#SaaS, #GrowthHacking, #Analytics, #BusinessIntel', imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=600' });

  const platforms = ['x', 'linkedin', 'facebook', 'tiktok', 'discord', 'whatsapp'];
  for (const plat of platforms) {
    const postSkin = dbHelper.posts.create({ campaignId: campaignSkin.id, adCreativeId: creativeSkin.id, platform: plat, status: 'PUBLISHED', scheduledTime: new Date(Date.now() - 36 * 60 * 60 * 1000) });
    dbHelper.posts.updateStatus(postSkin.id, { status: 'PUBLISHED', publishedTime: new Date(Date.now() - 36 * 60 * 60 * 1000), platformPostId: `seeded_mcp_id_skin_${plat}` });

    const postSaas = dbHelper.posts.create({ campaignId: campaignSaas.id, adCreativeId: creativeSaas.id, platform: plat, status: 'PUBLISHED', scheduledTime: new Date(Date.now() - 24 * 60 * 60 * 1000) });
    dbHelper.posts.updateStatus(postSaas.id, { status: 'PUBLISHED', publishedTime: new Date(Date.now() - 24 * 60 * 60 * 1000), platformPostId: `seeded_mcp_id_saas_${plat}` });

    for (let hour = 1; hour <= 3; hour++) {
      const viewsMult = plat === 'tiktok' ? 240 : plat === 'x' ? 80 : 30;
      dbHelper.analytics.createSnapshot({ postId: postSkin.id, views: hour * viewsMult + Math.floor(Math.random() * 20), likes: Math.floor(hour * viewsMult * 0.1), shares: Math.floor(hour * viewsMult * 0.02) });
      dbHelper.analytics.createSnapshot({ postId: postSaas.id, views: hour * viewsMult * 1.2 + Math.floor(Math.random() * 20), likes: Math.floor(hour * viewsMult * 1.2 * 0.12), shares: Math.floor(hour * viewsMult * 1.2 * 0.03) });
    }
  }

  console.log('[Seed] Seeding completed successfully.');
}

app.get('/api/tenants', (req, res) => {
  try {
    const tenants = dbHelper.tenants.findMany();
    res.json(tenants);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tenants', (req, res) => {
  try {
    const { name, brandVoice } = req.body;
    const newTenant = dbHelper.tenants.create({ name, brandVoice });
    res.status(201).json(newTenant);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/products', (req, res) => {
  try {
    const { tenantId } = req.query;
    if (!tenantId) return res.status(400).json({ error: 'tenantId required' });
    const products = dbHelper.products.findMany(String(tenantId));
    res.json(products);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products', (req, res) => {
  try {
    const { name, description, targetAudience, tenantId } = req.body;
    const newProduct = dbHelper.products.create({ name, description, targetAudience, tenantId });
    res.status(201).json(newProduct);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/campaigns', (req, res) => {
  try {
    const { tenantId } = req.query;
    if (!tenantId) return res.status(400).json({ error: 'tenantId required' });
    const campaigns = dbHelper.campaigns.findMany(String(tenantId));
    res.json(campaigns);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/campaigns', (req, res) => {
  try {
    const { name, tenantId } = req.body;
    const campaign = dbHelper.campaigns.create({ name, tenantId, status: 'ACTIVE' });
    res.status(201).json(campaign);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/generate-ad', async (req, res) => {
  try {
    const { productName, productDescription, targetAudience, brandVoice } = req.body;
    const generated = await generateAdCreative(productName, productDescription, targetAudience, brandVoice);
    res.json(generated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/posts', (req, res) => {
  try {
    const { campaignId, productId, headline, bodyText, hashtags, imageUrl, platforms, scheduledTime } = req.body;
    const creative = dbHelper.adCreatives.create({ productId, headline, bodyText, hashtags, imageUrl });
    const posts = [];
    for (const platform of platforms) {
      const post = dbHelper.posts.create({ campaignId, adCreativeId: creative.id, platform, status: 'SCHEDULED', scheduledTime: new Date(scheduledTime) });
      posts.push(post);
    }
    res.status(201).json({ creative, posts });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/analytics', (req, res) => {
  try {
    const { tenantId } = req.query;
    if (!tenantId) return res.status(400).json({ error: 'tenantId required' });
    const posts = dbHelper.posts.findManyByTenant(String(tenantId));
    const platformMetrics: Record<string, { views: number; likes: number; shares: number; postCount: number }> = {
      x: { views: 0, likes: 0, shares: 0, postCount: 0 },
      linkedin: { views: 0, likes: 0, shares: 0, postCount: 0 },
      facebook: { views: 0, likes: 0, shares: 0, postCount: 0 },
      tiktok: { views: 0, likes: 0, shares: 0, postCount: 0 },
      discord: { views: 0, likes: 0, shares: 0, postCount: 0 },
      whatsapp: { views: 0, likes: 0, shares: 0, postCount: 0 }
    };

    let totalViews = 0;
    let totalLikes = 0;
    let totalShares = 0;

    posts.forEach(post => {
      const plat = post.platform.toLowerCase();
      if (platformMetrics[plat]) {
        platformMetrics[plat].postCount++;
        const latestSnapshot = post.analytics[0];
        if (latestSnapshot) {
          platformMetrics[plat].views += latestSnapshot.views;
          platformMetrics[plat].likes += latestSnapshot.likes;
          platformMetrics[plat].shares += latestSnapshot.shares;
          totalViews += latestSnapshot.views;
          totalLikes += latestSnapshot.likes;
          totalShares += latestSnapshot.shares;
        }
      }
    });

    const snapshots = dbHelper.analytics.findSnapshotsByTenant(String(tenantId));
    const timeline = snapshots.map((s: any) => ({ platform: s.platform, views: s.views, likes: s.likes, recordedAt: s.recordedAt }));

    res.json({
      summary: { totalViews, totalLikes, totalShares, totalPosts: posts.length, scheduledPosts: posts.filter((p: any) => p.status === 'SCHEDULED').length, publishedPosts: posts.filter((p: any) => p.status === 'PUBLISHED').length, failedPosts: posts.filter((p: any) => p.status === 'FAILED').length },
      platformBreakdown: platformMetrics,
      recentPosts: posts.map((p: any) => ({ id: p.id, platform: p.platform, status: p.status, scheduledTime: p.scheduledTime, publishedTime: p.publishedTime, headline: p.adCreative.headline, productName: p.adCreative.product.name, latestViews: p.analytics[0]?.views || 0, errorMessage: p.errorMessage })).sort((a: any, b: any) => new Date(b.scheduledTime).getTime() - new Date(a.scheduledTime).getTime()).slice(0, 10),
      timeline
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/business-profiles', (req, res) => {
  try {
    const { tenantId, productName, description, targetAudience, brandVoice, offerType, primaryPain, primaryGain } = req.body;
    const profile = dbHelper.businessProfile.create({ tenantId, productName, description, targetAudience, brandVoice, offerType, primaryPain, primaryGain });
    res.status(201).json(profile);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/business-profiles', (req, res) => {
  try {
    const { tenantId } = req.query;
    if (!tenantId) return res.status(400).json({ error: 'tenantId required' });
    const profiles = dbHelper.businessProfile.findMany(String(tenantId));
    res.json(profiles);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/leads', (req, res) => {
  try {
    const { tenantId, name, email, phone, source, score, status, notes } = req.body;
    const lead = dbHelper.leads.create({ tenantId, name, email, phone, source, score, status, notes });
    res.status(201).json(lead);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/leads', (req, res) => {
  try {
    const { tenantId } = req.query;
    if (!tenantId) return res.status(400).json({ error: 'tenantId required' });
    const leads = dbHelper.leads.findMany(String(tenantId));
    res.json(leads);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/campaigns/:campaignId/experiments', (req, res) => {
  try {
    const { campaignId } = req.params;
    const { tenantId, psychologicalHook, channel, status } = req.body;
    const experiment = dbHelper.campaignExperiment.create({ tenantId, campaignId, psychologicalHook, channel, status });
    res.status(201).json(experiment);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/campaigns/:campaignId/experiments', (req, res) => {
  try {
    const { campaignId } = req.params;
    const { tenantId } = req.query;
    if (!tenantId) return res.status(400).json({ error: 'tenantId required' });
    const all = dbHelper.campaignExperiment.findMany(String(tenantId));
    const items = all.filter((e: any) => e.campaignId === campaignId);
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/generate-ad-from-theme', async (req, res) => {
  try {
    const { productName, productDescription, targetAudience, brandVoice, psychologicalHook, offerType, primaryPain, primaryGain } = req.body;
    const hook = psychologicalHook || 'curiosity';
    const pain = primaryPain || 'wasted time and missed opportunities';
    const gain = primaryGain || 'faster results and less friction';

    const hookPrompts: Record<string, { headline: string; body: string }> = {
      curiosity: { headline: `What if ${productName} changed everything?`, body: `Most ${targetAudience} never expect this outcome. ${productName} turns ${pain} into ${gain}.` },
      loss_aversion: { headline: `Don't let ${pain} keep costing you.`, body: `Every day without the right system is another day of losses. ${productName} stops the leak and protects your top line.` },
      social_proof: { headline: `Top performers choose ${productName}.`, body: `High-performing teams already made the switch. Now they ship faster, with fewer mistakes.` },
      authority: { headline: `The hidden reason most teams still struggle.`, body: `Industry leaders follow a simple framework. ${productName} puts that framework on autopilot.` },
      problem_solution_proof: { headline: `Still dealing with ${pain}?`, body: `${productName} replaces the old mess with a single workflow. Less overhead, more output.` },
      shareable_hook: { headline: `5 reasons ${targetAudience} are switching systems now.`, body: `#1: It removes ${pain}. #2: It unlocks ${gain}. #3: It pays for itself.` }
    };

    const selected = hookPrompts[hook] || hookPrompts.curiosity;
    const headline = selected.headline;
    const bodyText = `${selected.body} ${productDescription}`;
    const hashtags = `#${offerType || productName.replace(/\s+/g, '')}, #growth, #automation`;

    res.json({ headline, bodyText, hashtags, psychologicalHook: hook });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, async () => {
  console.log(`[Express Server] Server running at http://localhost:${port}`);
  try {
    await seedInitialData();
    startScheduler();
  } catch (seedErr) {
    console.error('[Startup Error] Failed during database seed or scheduler start:', seedErr);
  }
});
