import type { Json } from '@/lib/database.types';

type WhatsAppTextMessage = {
  id: string;
  from: string;
  timestamp?: string;
  type?: string;
  text?: { body?: string };
  button?: { text?: string; payload?: string };
  interactive?: {
    type?: string;
    button_reply?: { id?: string; title?: string };
    list_reply?: { id?: string; title?: string; description?: string };
  };
};

type WhatsAppValue = {
  metadata?: { phone_number_id?: string; display_phone_number?: string };
  contacts?: Array<{ wa_id?: string; profile?: { name?: string } }>;
  messages?: WhatsAppTextMessage[];
  statuses?: Array<{ id?: string; status?: string }>;
};

type WhatsAppPayload = {
  object?: string;
  entry?: Array<{
    id?: string;
    changes?: Array<{
      field?: string;
      value?: WhatsAppValue;
    }>;
  }>;
};

export type ParsedWhatsAppMessage = {
  phoneNumberId: string;
  waMessageId: string;
  from: string;
  contactName: string | null;
  text: string;
  raw: Json;
};

export function parsePayload(rawBody: string): WhatsAppPayload {
  return JSON.parse(rawBody) as WhatsAppPayload;
}

export function extractPhoneNumberId(payload: WhatsAppPayload): string | null {
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const phoneNumberId = change.value?.metadata?.phone_number_id;
      if (phoneNumberId) return phoneNumberId;
    }
  }
  return null;
}

export function extractEventId(payload: WhatsAppPayload): string | null {
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const messageId = change.value?.messages?.[0]?.id;
      const statusId = change.value?.statuses?.[0]?.id;
      if (messageId) return messageId;
      if (statusId) return statusId;
    }
  }
  return null;
}

function extractMessageText(message: WhatsAppTextMessage): string {
  if (message.text?.body) return message.text.body;
  if (message.button?.text) return message.button.text;
  if (message.button?.payload) return message.button.payload;
  if (message.interactive?.button_reply?.title) return message.interactive.button_reply.title;
  if (message.interactive?.list_reply?.title) return message.interactive.list_reply.title;
  return '[Mensaje no soportado en este MVP]';
}

export function extractInboundMessages(payload: WhatsAppPayload): ParsedWhatsAppMessage[] {
  const parsed: ParsedWhatsAppMessage[] = [];

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const phoneNumberId = change.value?.metadata?.phone_number_id;
      if (!phoneNumberId) continue;

      const contact = change.value?.contacts?.[0];
      const contactName = contact?.profile?.name ?? null;

      for (const message of change.value?.messages ?? []) {
        parsed.push({
          phoneNumberId,
          waMessageId: message.id,
          from: message.from,
          contactName,
          text: extractMessageText(message),
          raw: message as unknown as Json
        });
      }
    }
  }

  return parsed;
}
