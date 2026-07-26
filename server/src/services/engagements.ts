import { postToPlatform } from './mcpClient.js';

export type SendOptions = {
  leadPhone: string;
  text: string;
};

export async function sendWhatsAppMessage({ leadPhone, text }: SendOptions): Promise<{ status: string; platformPostId?: string }> {
  // TODO: swap for real WhatsApp MCP provider when available
  const result = await postToPlatform('whatsapp', {
    text,
    recipientPhone: leadPhone
  });

  return {
    status: result.status === 'success' ? 'sent' : 'failed',
    platformPostId: result.platformPostId
  };
}
