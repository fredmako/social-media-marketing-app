// @ts-ignore
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';

// Initialize the SQLite database sync client using Node.js v22+ native support
export const db = new DatabaseSync('dev.db');

// Execute migrations to create tables if they do not exist
db.exec(`
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS Tenant (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    brandVoice TEXT,
    logoUrl TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS User (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    tenantId TEXT NOT NULL,
    FOREIGN KEY(tenantId) REFERENCES Tenant(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS Product (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    targetAudience TEXT NOT NULL,
    tenantId TEXT NOT NULL,
    FOREIGN KEY(tenantId) REFERENCES Tenant(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS Campaign (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT NOT NULL,
    tenantId TEXT NOT NULL,
    FOREIGN KEY(tenantId) REFERENCES Tenant(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS AdCreative (
    id TEXT PRIMARY KEY,
    productId TEXT NOT NULL,
    headline TEXT NOT NULL,
    bodyText TEXT NOT NULL,
    hashtags TEXT NOT NULL,
    imageUrl TEXT,
    videoUrl TEXT,
    FOREIGN KEY(productId) REFERENCES Product(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS Post (
    id TEXT PRIMARY KEY,
    campaignId TEXT NOT NULL,
    adCreativeId TEXT NOT NULL,
    platform TEXT NOT NULL,
    status TEXT NOT NULL,
    scheduledTime TEXT NOT NULL,
    publishedTime TEXT,
    platformPostId TEXT,
    errorMessage TEXT,
    FOREIGN KEY(campaignId) REFERENCES Campaign(id) ON DELETE CASCADE,
    FOREIGN KEY(adCreativeId) REFERENCES AdCreative(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS AnalyticsSnapshot (
    id TEXT PRIMARY KEY,
    postId TEXT NOT NULL,
    views INTEGER NOT NULL,
    likes INTEGER NOT NULL,
    shares INTEGER NOT NULL,
    recordedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(postId) REFERENCES Post(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS BusinessProfile (
    id TEXT PRIMARY KEY,
    tenantId TEXT NOT NULL,
    productName TEXT NOT NULL,
    description TEXT NOT NULL,
    targetAudience TEXT NOT NULL,
    brandVoice TEXT,
    offerType TEXT,
    primaryPain TEXT,
    primaryGain TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(tenantId) REFERENCES Tenant(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS Lead (
    id TEXT PRIMARY KEY,
    tenantId TEXT NOT NULL,
    name TEXT,
    email TEXT,
    phone TEXT,
    source TEXT,
    score INTEGER DEFAULT 0,
    status TEXT DEFAULT 'new',
    notes TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(tenantId) REFERENCES Tenant(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS CampaignExperiment (
    id TEXT PRIMARY KEY,
    tenantId TEXT NOT NULL,
    campaignId TEXT NOT NULL,
    psychologicalHook TEXT NOT NULL,
    channel TEXT,
    status TEXT DEFAULT 'active',
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    demoRequests INTEGER DEFAULT 0,
    leads INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(tenantId) REFERENCES Tenant(id) ON DELETE CASCADE,
    FOREIGN KEY(campaignId) REFERENCES Campaign(id) ON DELETE CASCADE
  );
`);

// Expose query helper methods that mimic basic ORM operations
export const dbHelper = {
  tenants: {
    findMany: () => {
      const stmt = db.prepare('SELECT * FROM Tenant');
      return stmt.all();
    },
    create: (data: { name: string; brandVoice?: string }) => {
      const id = randomUUID();
      const stmt = db.prepare('INSERT INTO Tenant (id, name, brandVoice) VALUES (?, ?, ?)');
      stmt.run(id, data.name, data.brandVoice || null);
      return { id, ...data };
    },
    count: () => {
      const stmt = db.prepare('SELECT COUNT(*) as count FROM Tenant');
      const res = stmt.get() as { count: number };
      return res.count;
    }
  },
  users: {
    create: (data: { email: string; name: string; role: string; tenantId: string }) => {
      const id = randomUUID();
      const stmt = db.prepare('INSERT INTO User (id, email, name, role, tenantId) VALUES (?, ?, ?, ?, ?)');
      stmt.run(id, data.email, data.name, data.role, data.tenantId);
      return { id, ...data };
    }
  },
  products: {
    findMany: (tenantId: string) => {
      const stmt = db.prepare('SELECT * FROM Product WHERE tenantId = ?');
      return stmt.all(tenantId);
    },
    create: (data: { name: string; description: string; targetAudience: string; tenantId: string }) => {
      const id = randomUUID();
      const stmt = db.prepare('INSERT INTO Product (id, name, description, targetAudience, tenantId) VALUES (?, ?, ?, ?, ?)');
      stmt.run(id, data.name, data.description, data.targetAudience, data.tenantId);
      return { id, ...data };
    }
  },
  campaigns: {
    findMany: (tenantId: string) => {
      const stmt = db.prepare('SELECT * FROM Campaign WHERE tenantId = ?');
      const campaigns = stmt.all(tenantId) as any[];
      // Hydrate posts for each campaign
      for (const campaign of campaigns) {
        const postsStmt = db.prepare(`
          SELECT p.*, c.headline, c.bodyText, c.hashtags, c.imageUrl
          FROM Post p
          JOIN AdCreative c ON p.adCreativeId = c.id
          WHERE p.campaignId = ?
        `);
        campaign.posts = postsStmt.all(campaign.id).map((p: any) => ({
          ...p,
          adCreative: {
            headline: p.headline,
            bodyText: p.bodyText,
            hashtags: p.hashtags,
            imageUrl: p.imageUrl
          }
        }));
      }
      return campaigns;
    },
    create: (data: { name: string; tenantId: string; status: string }) => {
      const id = randomUUID();
      const stmt = db.prepare('INSERT INTO Campaign (id, name, status, tenantId) VALUES (?, ?, ?, ?)');
      stmt.run(id, data.name, data.status, data.tenantId);
      return { id, ...data };
    }
  },
  posts: {
    findManyDue: (now: Date) => {
      const stmt = db.prepare(`
        SELECT p.*, c.headline, c.bodyText, c.hashtags, c.imageUrl, c.videoUrl
        FROM Post p
        JOIN AdCreative c ON p.adCreativeId = c.id
        WHERE p.status = 'SCHEDULED' AND p.scheduledTime <= ?
      `);
      return stmt.all(now.toISOString()).map((p: any) => ({
        ...p,
        adCreative: {
          headline: p.headline,
          bodyText: p.bodyText,
          hashtags: p.hashtags,
          imageUrl: p.imageUrl,
          videoUrl: p.videoUrl
        }
      }));
    },
    findPublishedWithPlatformIds: () => {
      const stmt = db.prepare("SELECT * FROM Post WHERE status = 'PUBLISHED' AND platformPostId IS NOT NULL");
      return stmt.all() as any[];
    },
    updateStatus: (id: string, data: { status: string; publishedTime?: Date; platformPostId?: string | null; errorMessage?: string | null }) => {
      const stmt = db.prepare(`
        UPDATE Post
        SET status = ?, publishedTime = ?, platformPostId = ?, errorMessage = ?
        WHERE id = ?
      `);
      stmt.run(
        data.status,
        data.publishedTime ? data.publishedTime.toISOString() : null,
        data.platformPostId || null,
        data.errorMessage || null,
        id
      );
    },
    create: (data: { campaignId: string; adCreativeId: string; platform: string; status: string; scheduledTime: Date }) => {
      const id = randomUUID();
      const stmt = db.prepare('INSERT INTO Post (id, campaignId, adCreativeId, platform, status, scheduledTime) VALUES (?, ?, ?, ?, ?, ?)');
      stmt.run(id, data.campaignId, data.adCreativeId, data.platform, data.status, data.scheduledTime.toISOString());
      return { id, ...data };
    },
    findManyByTenant: (tenantId: string) => {
      // Find all posts linked to campaigns belonging to this tenant
      const stmt = db.prepare(`
        SELECT p.*, c.headline, c.bodyText, c.hashtags, c.imageUrl, c.videoUrl, prod.name as productName
        FROM Post p
        JOIN Campaign camp ON p.campaignId = camp.id
        JOIN AdCreative c ON p.adCreativeId = c.id
        JOIN Product prod ON c.productId = prod.id
        WHERE camp.tenantId = ?
      `);
      const posts = stmt.all(tenantId) as any[];

      // Hydrate with latest analytics snapshot for each post
      for (const post of posts) {
        const snapStmt = db.prepare('SELECT * FROM AnalyticsSnapshot WHERE postId = ? ORDER BY recordedAt DESC LIMIT 1');
        const latestSnapshot = snapStmt.get(post.id) as any;
        post.analytics = latestSnapshot ? [latestSnapshot] : [];
        post.adCreative = {
          headline: post.headline,
          bodyText: post.bodyText,
          hashtags: post.hashtags,
          imageUrl: post.imageUrl,
          videoUrl: post.videoUrl,
          product: { name: post.productName }
        };
      }
      return posts;
    }
  },
  adCreatives: {
    create: (data: { productId: string; headline: string; bodyText: string; hashtags: string; imageUrl?: string; videoUrl?: string }) => {
      const id = randomUUID();
      const stmt = db.prepare('INSERT INTO AdCreative (id, productId, headline, bodyText, hashtags, imageUrl, videoUrl) VALUES (?, ?, ?, ?, ?, ?, ?)');
      stmt.run(id, data.productId, data.headline, data.bodyText, data.hashtags, data.imageUrl || null, data.videoUrl || null);
      return { id, ...data };
    }
  },
  analytics: {
    createSnapshot: (data: { postId: string; views: number; likes: number; shares: number }) => {
      const id = randomUUID();
      const stmt = db.prepare('INSERT INTO AnalyticsSnapshot (id, postId, views, likes, shares) VALUES (?, ?, ?, ?, ?)');
      stmt.run(id, data.postId, data.views, data.likes, data.shares);
      return { id, ...data };
    },
    findSnapshotsByTenant: (tenantId: string) => {
      const stmt = db.prepare(`
        SELECT s.*, p.platform
        FROM AnalyticsSnapshot s
        JOIN Post p ON s.postId = p.id
        JOIN Campaign c ON p.campaignId = c.id
        WHERE c.tenantId = ?
        ORDER BY s.recordedAt ASC
      `);
      return stmt.all(tenantId);
    }
  },
  businessProfile: {
    create: (data: { tenantId: string; productName: string; description: string; targetAudience: string; brandVoice?: string; offerType?: string; primaryPain?: string; primaryGain?: string }) => {
      const id = randomUUID();
      const stmt = db.prepare('INSERT INTO BusinessProfile (id, tenantId, productName, description, targetAudience, brandVoice, offerType, primaryPain, primaryGain) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
      stmt.run(id, data.tenantId, data.productName, data.description, data.targetAudience, data.brandVoice || null, data.offerType || null, data.primaryPain || null, data.primaryGain || null);
      return { id, ...data };
    },
    findMany: (tenantId: string) => {
      const stmt = db.prepare('SELECT * FROM BusinessProfile WHERE tenantId = ?');
      return stmt.all(tenantId);
    }
  },
  leads: {
    create: (data: { tenantId: string; name?: string; email?: string; phone?: string; source?: string; score?: number; status?: string; notes?: string }) => {
      const id = randomUUID();
      const stmt = db.prepare('INSERT INTO Lead (id, tenantId, name, email, phone, source, score, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
      stmt.run(id, data.tenantId, data.name || null, data.email || null, data.phone || null, data.source || null, data.score || 0, data.status || 'new', data.notes || null);
      return { id, ...data };
    },
    findMany: (tenantId: string) => {
      const stmt = db.prepare('SELECT * FROM Lead WHERE tenantId = ? ORDER BY createdAt DESC');
      return stmt.all(tenantId);
    }
  },
  campaignExperiment: {
    create: (data: { tenantId: string; campaignId: string; psychologicalHook: string; channel?: string; status?: string }) => {
      const id = randomUUID();
      const stmt = db.prepare('INSERT INTO CampaignExperiment (id, tenantId, campaignId, psychologicalHook, channel, status) VALUES (?, ?, ?, ?, ?, ?)');
      stmt.run(id, data.tenantId, data.campaignId, data.psychologicalHook, data.channel || null, data.status || 'active');
      return { id, ...data };
    },
    findMany: (tenantId: string) => {
      const stmt = db.prepare('SELECT * FROM CampaignExperiment WHERE tenantId = ?');
      return stmt.all(tenantId);
    }
  }
};
