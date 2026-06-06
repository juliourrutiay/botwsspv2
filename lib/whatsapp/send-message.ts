import 'server-only';
import { GRAPH_API_VERSION } from '@/lib/constants';

type SendWhatsAppTextMessageInput = {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  text: string;
};

type MetaSendMessageResponse = {
  messaging_product?: string;
  contacts?: Array<{ input: string; wa_id: string }>;
  messages?: Array<{ id: string }>;
  error?: { message?: string; type?: string; code?: number; error_subcode?: number };
};

export async function sendWhatsAppTextMessage(input: SendWhatsAppTextMessageInput): Promise<string | null> {
  const response = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${input.phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: input.to,
        type: 'text',
        text: {
          preview_url: false,
          body: input.text
        }
      })
    }
  );

  const data = (await response.json()) as MetaSendMessageResponse;

  if (!response.ok) {
    const message = data.error?.message ?? 'Unknown WhatsApp API error';
    throw new Error(`WhatsApp send failed: ${message}`);
  }

  return data.messages?.[0]?.id ?? null;
}
