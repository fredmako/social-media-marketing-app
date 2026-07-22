import express from 'express';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const app = express();
const port = 3001;

const db = {
  posts: [],
  views: {}
};

function buildMcpServer() {
  const server = new Server(
    { name: 'mock-social-mcp-server', version: '1.0.0' },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      { name: 'post_to_x', description: 'Publish an ad or post to X (Twitter).', inputSchema: { type: 'object', properties: { text: { type: 'string' }, imageUrl: { type: 'string' } }, required: ['text'] } },
      { name: 'post_to_linkedin', description: 'Publish an ad or article to LinkedIn.', inputSchema: { type: 'object', properties: { text: { type: 'string' }, title: { type: 'string' }, imageUrl: { type: 'string' } }, required: ['text'] } },
      { name: 'post_to_facebook', description: 'Publish a marketing post to Facebook.', inputSchema: { type: 'object', properties: { text: { type: 'string' }, imageUrl: { type: 'string' } }, required: ['text'] } },
      { name: 'post_to_discord', description: 'Send a marketing message / alert to a Discord channel.', inputSchema: { type: 'object', properties: { channelId: { type: 'string' }, text: { type: 'string' } }, required: ['channelId', 'text'] } },
      { name: 'post_to_whatsapp', description: 'Send a promotional message to a customer via WhatsApp API.', inputSchema: { type: 'object', properties: { recipientPhone: { type: 'string' }, text: { type: 'string' } }, required: ['recipientPhone', 'text'] } },
      { name: 'post_to_tiktok', description: 'Upload a marketing short-form video to TikTok.', inputSchema: { type: 'object', properties: { videoUrl: { type: 'string' }, caption: { type: 'string' } }, required: ['videoUrl', 'caption'] } },
      { name: 'get_post_metrics', description: 'Retrieve tracking metrics (views, reach) for a published post.', inputSchema: { type: 'object', properties: { platform: { type: 'string' }, platformPostId: { type: 'string' } }, required: ['platform', 'platformPostId'] } }
    ]
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const platformPostId = `platform_id_${Math.random().toString(36).substring(2, 10)}`;

    if (name.startsWith('post_to_')) {
      const platform = name.replace('post_to_', '');
      db.views[platformPostId] = { platform, baseViews: Math.floor(Math.random() * 50) + 10, currentViews: 0, lastUpdated: Date.now() };
      console.log(`[MCP Server] Published post to platform [${platform}] with ID [${platformPostId}]`);
      return { content: [{ type: 'text', text: JSON.stringify({ status: 'success', platform, platformPostId, timestamp: new Date().toISOString() }) }] };
    }

    if (name === 'get_post_metrics') {
      const { platform, platformPostId } = args;
      const info = db.views[platformPostId];
      const views = info ? Math.max(info.currentViews, info.baseViews) : Math.floor(Math.random() * 250);
      console.log(`[MCP Server] Fetched metrics for ${platform}:${platformPostId} -> ${views} views`);
      return { content: [{ type: 'text', text: JSON.stringify({ views, likes: Math.floor(views * 0.12), shares: Math.floor(views * 0.03), timestamp: new Date().toISOString() }) }] };
    }

    throw new Error(`Tool not found: ${name}`);
  });

  return server;
}

let currentTransport = null;

app.get('/sse', (req, res) => {
  console.log('[SSE] Connection opened');
  const mcpServer = buildMcpServer();
  const transport = new SSEServerTransport('/message', res);
  currentTransport = transport;
  mcpServer.connect(transport);
});

app.post('/message', (req, res) => {
  if (!currentTransport) {
    return res.status(500).send('No active SSE connection');
  }
  return currentTransport.handlePostMessage(req, res);
});

app.listen(port, () => {
  console.log(`[MCP Server] Mock Social Media MCP running on http://localhost:${port}`);
});
