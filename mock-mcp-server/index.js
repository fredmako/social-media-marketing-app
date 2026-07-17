import express from 'express';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const app = express();
const port = 3001;

const server = new Server(
  {
    name: 'mock-social-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// In-memory store for tracking views and post states
const db = {
  posts: [],
  views: {} // post_id -> { platform, baseViews, currentViews, lastUpdated }
};

// Define MCP tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'post_to_x',
        description: 'Publish an ad or post to X (Twitter).',
        inputSchema: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'Text content of the tweet.' },
            imageUrl: { type: 'string', description: 'Optional image attachment URL.' }
          },
          required: ['text']
        }
      },
      {
        name: 'post_to_linkedin',
        description: 'Publish an ad or article to LinkedIn.',
        inputSchema: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'Body text.' },
            title: { type: 'string', description: 'Optional post title/heading.' },
            imageUrl: { type: 'string', description: 'Optional image attachment URL.' }
          },
          required: ['text']
        }
      },
      {
        name: 'post_to_facebook',
        description: 'Publish a marketing post to Facebook.',
        inputSchema: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'Post description.' },
            imageUrl: { type: 'string', description: 'Optional image attachment URL.' }
          },
          required: ['text']
        }
      },
      {
        name: 'post_to_discord',
        description: 'Send a marketing message / alert to a Discord channel.',
        inputSchema: {
          type: 'object',
          properties: {
            channelId: { type: 'string', description: 'Target Discord channel ID.' },
            text: { type: 'string', description: 'Message body.' }
          },
          required: ['channelId', 'text']
        }
      },
      {
        name: 'post_to_whatsapp',
        description: 'Send a promotional message to a customer via WhatsApp API.',
        inputSchema: {
          type: 'object',
          properties: {
            recipientPhone: { type: 'string', description: 'E.164 phone number of recipient.' },
            text: { type: 'string', description: 'Message body content.' }
          },
          required: ['recipientPhone', 'text']
        }
      },
      {
        name: 'post_to_tiktok',
        description: 'Upload a marketing short-form video to TikTok.',
        inputSchema: {
          type: 'object',
          properties: {
            videoUrl: { type: 'string', description: 'URL of the video to upload.' },
            caption: { type: 'string', description: 'Caption including hashtags.' }
          },
          required: ['videoUrl', 'caption']
        }
      },
      {
        name: 'get_post_metrics',
        description: 'Retrieve tracking metrics (views, reach) for a published post.',
        inputSchema: {
          type: 'object',
          properties: {
            platform: { type: 'string', description: 'Platform name (x, linkedin, facebook, discord, whatsapp, tiktok).' },
            platformPostId: { type: 'string', description: 'Unique post ID returned by the platform during publishing.' }
          },
          required: ['platform', 'platformPostId']
        }
      }
    ]
  };
});

// Implement handlers for executing tools
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const platformPostId = `platform_id_${Math.random().toString(36).substring(2, 10)}`;

  switch (name) {
    case 'post_to_x':
    case 'post_to_linkedin':
    case 'post_to_facebook':
    case 'post_to_discord':
    case 'post_to_whatsapp':
    case 'post_to_tiktok': {
      const platform = name.replace('post_to_', '');
      
      // Seed analytics data
      db.views[platformPostId] = {
        platform,
        baseViews: Math.floor(Math.random() * 50) + 10,
        currentViews: 0,
        lastUpdated: Date.now()
      };

      console.log(`[MCP Server] Published post to platform [${platform}] with ID [${platformPostId}]`, args);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              status: 'success',
              platform,
              platformPostId,
              timestamp: new Date().toISOString()
            })
          }
        ]
      };
    }
    case 'get_post_metrics': {
      const { platform, platformPostId } = args;
      const metricInfo = db.views[platformPostId];
      let views = 0;

      if (metricInfo) {
        // Increment views dynamically over time to simulate organic user engagement
        const hoursPassed = (Date.now() - metricInfo.lastUpdated) / (1000 * 60 * 60);
        // Let views grow by a random range per simulated hour
        const growthRate = platform === 'tiktok' ? 120 : platform === 'x' ? 30 : 10;
        const newViews = Math.floor(metricInfo.baseViews + hoursPassed * growthRate * (Math.random() * 1.5 + 0.5));
        metricInfo.currentViews = Math.max(metricInfo.currentViews, newViews);
        views = metricInfo.currentViews;
      } else {
        // Fallback for untracked/random posts
        views = Math.floor(Math.random() * 250);
      }

      console.log(`[MCP Server] Fetched metrics for ${platform}:${platformPostId} -> ${views} views`);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              views,
              likes: Math.floor(views * 0.12),
              shares: Math.floor(views * 0.03),
              timestamp: new Date().toISOString()
            })
          }
        ]
      };
    }
    default:
      throw new Error(`Tool not found: ${name}`);
  }
});

let transport;

app.get('/sse', (req, res) => {
  console.log('[SSE] Connection opened');
  transport = new SSEServerTransport('/message', res);
  server.connect(transport);
});

app.post('/message', (req, res) => {
  console.log('[SSE] Message received');
  if (transport) {
    transport.handlePostMessage(req, res);
  } else {
    res.status(500).send('No active SSE connection');
  }
});

app.listen(port, () => {
  console.log(`[MCP Server] Mock Social Media MCP running on http://localhost:${port}`);
});
