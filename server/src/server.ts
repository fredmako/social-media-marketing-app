import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { dbHelper } from './db.js';
import { generateAdCreative } from './services/aiGenerator.js';
import { startScheduler } from './services/scheduler.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Seeding function on startup using native SQLite helpers
async function seedInitialData() {
  const tenantCount = dbHelper.tenants.count();
  if (tenantCount > 0) return;

  console.log('[Seed] Database is empty, seeding initial multi-tenant marketing data (SQLite)...');

  // Create Tenants
  const glowSkin = dbHelper.tenants.create({
    name: 'GlowSkin Cosmetics',
    brandVoice: 'Radiant, scientific, luxurious',
  });

  const saasify = dbHelper.tenants.create({
    name: 'SaaSify Metrics',
    brandVoice: 'Expert, professional, analytical, concise',
  });

  // Create Users
  dbHelper.users.create({
    email: 'admin@glowskin.com',
    name: 'Elena Rostova',
    role: 'ADMIN',
    tenantId: glowSkin.id
  });

  dbHelper.users.create({
    email: 'marketer@saasify.com',
    name: 'John Doe',
    role: 'ADMIN',
    tenantId: saasify.id
  });

  // Create Products
  const serum = dbHelper.products.create({
    name: 'Vitamin C Brightening Serum',
    description: 'A daily serum containing 15% pure Vitamin C and Hyaluronic acid to boost brightness and skin texture.',
    targetAudience: 'Skincare enthusiasts, busy young professionals looking to refresh fatigued skin',
    tenantId: glowSkin.id
  });

  const dashboard = dbHelper.products.create({
    name: 'SaaSify Analytics Suite',
    description: 'A real-time dashboard unifying marketing spend and churn analytics for small B2B SaaS companies.',
    targetAudience: 'SaaS founders, growth marketers, tech CFOs',
    tenantId: saasify.id
  });

  // Create Campaigns
  const campaignSkin = dbHelper.campaigns.create({
    name: 'Summer Glow Launch',
    status: 'ACTIVE',
    tenantId: glowSkin.id
  });

  const campaignSaas = dbHelper.campaigns.create({
    name: 'Q3 SaaS Growth Drive',
    status: 'ACTIVE',
    tenantId: saasify.id
  });

  // Create AdCreatives
  const creativeSkin = dbHelper.adCreatives.create({
    productId: serum.id,
    headline: 'Unlock Radiant Skin in 7 Days!',
    bodyText: 'Fatigued skin? Brighten up with our 15% Vitamin C serum. Hydrates, plumps, and restores your natural glow.',
    hashtags: '#skincare, #glowskin, #vegancosmetics, #brightening',
    imageUrl: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=600'
  });

  const creativeSaas = dbHelper.adCreatives.create({
    productId: dashboard.id,
    headline: 'Stop Guessing Your Marketing ROI.',
    bodyText: 'SaaSify unifies all your client acquisition metrics in one gorgeous, real-time dashboard. Spot churn, optimize spend.',
    hashtags: '#SaaS, #GrowthHacking, #Analytics, #BusinessIntel',
    imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=600'
  });

  // Create some Mock published posts with pre-existing analytics for charts
  const platforms = ['x', 'linkedin', 'facebook', 'tiktok', 'discord', 'whatsapp'];
  
  for (const plat of platforms) {
    // Glowskin post
    const postSkin = dbHelper.posts.create({
      campaignId: campaignSkin.id,
      adCreativeId: creativeSkin.id,
      platform: plat,
      status: 'PUBLISHED',
      scheduledTime: new Date(Date.now() - 36 * 60 * 60 * 1000) // 36 hours ago
    });
    // Set status to published and setup platformPostId
    dbHelper.posts.updateStatus(postSkin.id, {
      status: 'PUBLISHED',
      publishedTime: new Date(Date.now() - 36 * 60 * 60 * 1000),
      platformPostId: `seeded_mcp_id_skin_${plat}`
    });

    // SaaSify post
    const postSaas = dbHelper.posts.create({
      campaignId: campaignSaas.id,
      adCreativeId: creativeSaas.id,
      platform: plat,
      status: 'PUBLISHED',
      scheduledTime: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago
    });
    dbHelper.posts.updateStatus(postSaas.id, {
      status: 'PUBLISHED',
      publishedTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
      platformPostId: `seeded_mcp_id_saas_${plat}`
    });

    // Populate historical analytics points (snapshots over past 24 hours)
    for (let hour = 1; hour <= 3; hour++) {
      const viewsMult = plat === 'tiktok' ? 240 : plat === 'x' ? 80 : 30;
      
      dbHelper.analytics.createSnapshot({
        postId: postSkin.id,
        views: hour * viewsMult + Math.floor(Math.random() * 20),
        likes: Math.floor(hour * viewsMult * 0.1),
        shares: Math.floor(hour * viewsMult * 0.02)
      });

      dbHelper.analytics.createSnapshot({
        postId: postSaas.id,
        views: hour * viewsMult * 1.2 + Math.floor(Math.random() * 20),
        likes: Math.floor(hour * viewsMult * 1.2 * 0.12),
        shares: Math.floor(hour * viewsMult * 1.2 * 0.03)
      });
    }
  }

  console.log('[Seed] Seeding completed successfully.');
}

// Routes
// 1. Tenants
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

// 2. Products
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

// 3. Campaigns
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

// 4. AI Generate Ad
app.post('/api/generate-ad', async (req, res) => {
  try {
    const { productName, productDescription, targetAudience, brandVoice } = req.body;
    const generated = await generateAdCreative(
      productName,
      productDescription,
      targetAudience,
      brandVoice
    );
    res.json(generated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Schedule Post
app.post('/api/posts', (req, res) => {
  try {
    const { campaignId, productId, headline, bodyText, hashtags, imageUrl, platforms, scheduledTime } = req.body;

    // Create ad creative first
    const creative = dbHelper.adCreatives.create({
      productId,
      headline,
      bodyText,
      hashtags,
      imageUrl
    });

    // Create a Post record for each platform selected
    const posts = [];
    for (const platform of platforms) {
      const post = dbHelper.posts.create({
        campaignId,
        adCreativeId: creative.id,
        platform,
        status: 'SCHEDULED',
        scheduledTime: new Date(scheduledTime)
      });
      posts.push(post);
    }

    res.status(201).json({ creative, posts });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Dashboard Analytics
app.get('/api/analytics', (req, res) => {
  try {
    const { tenantId } = req.query;
    if (!tenantId) return res.status(400).json({ error: 'tenantId required' });

    // Fetch posts belonging to the tenant's campaigns
    const posts = dbHelper.posts.findManyByTenant(String(tenantId));

    // Format metrics per platform
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

    // Generate timeline data for active tenant
    const snapshots = dbHelper.analytics.findSnapshotsByTenant(String(tenantId));

    // Group snapshots by timeline buckets
    const timeline = snapshots.map((s: any) => ({
      platform: s.platform,
      views: s.views,
      likes: s.likes,
      recordedAt: s.recordedAt
    }));

    res.json({
      summary: {
        totalViews,
        totalLikes,
        totalShares,
        totalPosts: posts.length,
        scheduledPosts: posts.filter((p: any) => p.status === 'SCHEDULED').length,
        publishedPosts: posts.filter((p: any) => p.status === 'PUBLISHED').length,
        failedPosts: posts.filter((p: any) => p.status === 'FAILED').length,
      },
      platformBreakdown: platformMetrics,
      recentPosts: posts.map((p: any) => ({
        id: p.id,
        platform: p.platform,
        status: p.status,
        scheduledTime: p.scheduledTime,
        publishedTime: p.publishedTime,
        headline: p.adCreative.headline,
        productName: p.adCreative.product.name,
        latestViews: p.analytics[0]?.views || 0,
        errorMessage: p.errorMessage
      })).sort((a: any, b: any) => new Date(b.scheduledTime).getTime() - new Date(a.scheduledTime).getTime()).slice(0, 10),
      timeline
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Run server
app.listen(port, async () => {
  console.log(`[Express Server] Server running at http://localhost:${port}`);
  try {
    await seedInitialData();
    startScheduler();
  } catch (seedErr) {
    console.error('[Startup Error] Failed during database seed or scheduler start:', seedErr);
  }
});
