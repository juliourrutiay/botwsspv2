import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { decrypt } from '@/lib/crypto';
import { sendWhatsAppTextMessage } from '@/lib/whatsapp/send-message';
import { extractEventId, extractInboundMessages, parsePayload } from '@/lib/whatsapp/parse-payload';
import { handleSurveyInbound, startResolutionSurvey } from '@/lib/surveys/service';
import { parsePreCloseResponse } from '@/lib/surveys/parse-survey-response';
import { runAgent } from '@/lib/agent/run-agent';
import type { Database, Json } from '@/lib/database.types';

type Conversation = Database['public']['Tables']['conversations']['Row'];
type Contact = Database['public']['Tables']['contacts']['Row'];
type WhatsAppConfig = Database['public']['Tables']['whatsapp_configs']['Row'];
type AgentConfig = Database['public']['Tables']['agent_configs']['Row'];
type SurveyConfig = Database['public']['Tables']['survey_configs']['Row'];
type RecentMessage = Pick<Database['public']['Tables']['messages']['Row'], 'sender' | 'content'>;
type WebhookEvent = Database['public']['Tables']['webhook_events']['Row'];

type ConversationMetadata = {
  awaiting_pre_close_confirmation?: boolean;
};

function asMetadata(value: Json | null): ConversationMetadata {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as ConversationMetadata;
}

async function sendBotMessage({
  organizationId,
  conversationId,
  to,
  text,
  sender = 'bot'
}: {
  organizationId: string;
  conversationId: string;
  to: string;
  text: string;
  sender?: 'bot' | 'system';
}) {
  const supabase = createSupabaseAdminClient();

  const { data: config, error } = await supabase
    .from('whatsapp_configs')
    .select('*')
    .eq('organization_id', organizationId)
    .single();

  const typedConfig = config as unknown as WhatsAppConfig | null;
  if (error || !typedConfig) throw new Error('WhatsApp config not found.');

  const waMessageId = await sendWhatsAppTextMessage({
    phoneNumberId: typedConfig.phone_number_id,
    accessToken: decrypt(typedConfig.access_token_encrypted),
    to,
    text
  });

  await supabase.from('messages').insert({
    organization_id: organizationId,
    conversation_id: conversationId,
    wa_message_id: waMessageId,
    direction: 'outbound',
    sender,
    content: text
  });

  await supabase
    .from('conversations')
    .update({ last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', conversationId);
}

async function getOrCreateContact({
  organizationId,
  waPhone,
  fullName
}: {
  organizationId: string;
  waPhone: string;
  fullName: string | null;
}): Promise<Contact> {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from('contacts')
    .upsert(
      {
        organization_id: organizationId,
        wa_phone: waPhone,
        full_name: fullName,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'organization_id,wa_phone' }
    )
    .select('*')
    .single();

  const typedContact = data as unknown as Contact | null;
  if (error || !typedContact) throw error ?? new Error('Could not upsert contact.');
  return typedContact;
}

async function getOrCreateConversation({
  organizationId,
  contactId,
  botActiveDefault
}: {
  organizationId: string;
  contactId: string;
  botActiveDefault: boolean;
}): Promise<Conversation> {
  const supabase = createSupabaseAdminClient();

  const { data: existing } = await supabase
    .from('conversations')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('contact_id', contactId)
    .neq('status', 'closed')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const typedExisting = existing as unknown as Conversation | null;
  if (typedExisting) return typedExisting;

  const { data, error } = await supabase
    .from('conversations')
    .insert({
      organization_id: organizationId,
      contact_id: contactId,
      bot_active: botActiveDefault,
      status: 'open'
    })
    .select('*')
    .single();

  const typedConversation = data as unknown as Conversation | null;
  if (error || !typedConversation) throw error ?? new Error('Could not create conversation.');
  return typedConversation;
}

async function handlePreCloseResponse({
  conversation,
  contact,
  inboundText
}: {
  conversation: Conversation;
  contact: Contact;
  inboundText: string;
}): Promise<boolean> {
  const metadata = asMetadata(conversation.metadata);
  if (!metadata.awaiting_pre_close_confirmation) return false;

  const intent = parsePreCloseResponse(inboundText);
  const supabase = createSupabaseAdminClient();

  if (intent === 'no_more_questions') {
    await startResolutionSurvey({
      organizationId: conversation.organization_id,
      conversationId: conversation.id,
      contactId: contact.id,
      triggeredBy: 'bot'
    });
    return true;
  }

  if (intent === 'has_more_questions') {
    await supabase
      .from('conversations')
      .update({ metadata: {}, updated_at: new Date().toISOString() })
      .eq('id', conversation.id);

    await sendBotMessage({
      organizationId: conversation.organization_id,
      conversationId: conversation.id,
      to: contact.wa_phone,
      text: 'Claro, cuéntame qué otra duda tienes.'
    });
    return true;
  }

  await supabase
    .from('conversations')
    .update({ metadata: {}, updated_at: new Date().toISOString() })
    .eq('id', conversation.id);

  return false;
}

async function callAgentForConversation({
  conversation,
  contact,
  inboundText
}: {
  conversation: Conversation;
  contact: Contact;
  inboundText: string;
}) {
  const supabase = createSupabaseAdminClient();

  const [{ data: agentConfig }, { data: surveyConfig }, { data: recentMessages }] = await Promise.all([
    supabase.from('agent_configs').select('*').eq('organization_id', conversation.organization_id).single(),
    supabase.from('survey_configs').select('*').eq('organization_id', conversation.organization_id).single(),
    supabase
      .from('messages')
      .select('sender, content')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: false })
      .limit(12)
  ]);

  const typedAgentConfig = agentConfig as unknown as AgentConfig | null;
  const typedSurveyConfig = surveyConfig as unknown as SurveyConfig | null;
  const typedRecentMessages = (recentMessages ?? []) as unknown as RecentMessage[];

  if (!typedAgentConfig) throw new Error('Agent config not found.');

  const result = await runAgent({
    agentConfig: typedAgentConfig,
    surveyConfig: typedSurveyConfig,
    recentMessages: typedRecentMessages.reverse(),
    latestCustomerMessage: inboundText
  });

  if (result.action === 'handoff') {
    await supabase
      .from('conversations')
      .update({ bot_active: false, status: 'pending_human', updated_at: new Date().toISOString() })
      .eq('id', conversation.id);

    await supabase.from('human_handoffs').insert({
      organization_id: conversation.organization_id,
      conversation_id: conversation.id,
      requested_by: 'bot',
      reason: result.reason ?? 'Derivación solicitada por el agente.'
    });

    await sendBotMessage({
      organizationId: conversation.organization_id,
      conversationId: conversation.id,
      to: contact.wa_phone,
      text: result.reply || typedAgentConfig.handoff_message || 'Te paso con una persona del equipo para que pueda ayudarte mejor.'
    });

    return;
  }

  if (result.action === 'ask_pre_close') {
    await supabase
      .from('conversations')
      .update({
        metadata: { awaiting_pre_close_confirmation: true } as Json,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversation.id);
  }

  await sendBotMessage({
    organizationId: conversation.organization_id,
    conversationId: conversation.id,
    to: contact.wa_phone,
    text: result.reply
  });
}

export async function processWhatsAppWebhook(rawBody: string, organizationId: string) {
  const supabase = createSupabaseAdminClient();
  const payload = parsePayload(rawBody);
  const eventId = extractEventId(payload);

  const { data: webhookEventData } = await supabase
    .from('webhook_events')
    .insert({
      organization_id: organizationId,
      provider: 'whatsapp',
      external_event_id: eventId,
      event_type: 'messages',
      payload: payload as unknown as Json,
      status: 'pending'
    })
    .select('*')
    .maybeSingle();

  try {
    const webhookEvent = webhookEventData as unknown as WebhookEvent | null;

    const { data: agentConfig } = await supabase
      .from('agent_configs')
      .select('*')
      .eq('organization_id', organizationId)
      .single();

    const inboundMessages = extractInboundMessages(payload);

    if (inboundMessages.length === 0) {
      if (webhookEvent) {
        await supabase
          .from('webhook_events')
          .update({ status: 'ignored', processed_at: new Date().toISOString() })
          .eq('id', webhookEvent.id);
      }
      return;
    }

    for (const inbound of inboundMessages) {
      const contact = await getOrCreateContact({
        organizationId,
        waPhone: inbound.from,
        fullName: inbound.contactName
      });

      const conversation = await getOrCreateConversation({
        organizationId,
        contactId: contact.id,
        botActiveDefault: (agentConfig as unknown as AgentConfig | null)?.bot_enabled_by_default ?? true
      });

      const { error: messageError } = await supabase.from('messages').insert({
        organization_id: organizationId,
        conversation_id: conversation.id,
        wa_message_id: inbound.waMessageId,
        direction: 'inbound',
        sender: 'contact',
        content: inbound.text,
        raw: inbound.raw
      });

      if (messageError) {
        // Duplicate message id = idempotency hit. Ignore safely.
        if (messageError.code === '23505') continue;
        throw messageError;
      }

      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', conversation.id);

      if (conversation.status === 'survey_pending' || conversation.status === 'survey_feedback_pending') {
        await handleSurveyInbound({ conversation, contact, inboundText: inbound.text });
        continue;
      }

      const preCloseHandled = await handlePreCloseResponse({ conversation, contact, inboundText: inbound.text });
      if (preCloseHandled) continue;

      if (!conversation.bot_active || conversation.status === 'pending_human') {
        continue;
      }

      await callAgentForConversation({ conversation, contact, inboundText: inbound.text });
    }

    if (webhookEvent) {
      await supabase
        .from('webhook_events')
        .update({ status: 'processed', processed_at: new Date().toISOString() })
        .eq('id', webhookEvent.id);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown processing error';
    console.error(JSON.stringify({ event: 'whatsapp_webhook_processing_failed', organization_id: organizationId, error: message }));

    const webhookEvent = webhookEventData as unknown as WebhookEvent | null;
    if (webhookEvent) {
      await supabase
        .from('webhook_events')
        .update({ status: 'failed', error: message, processed_at: new Date().toISOString() })
        .eq('id', webhookEvent.id);
    }
  }
}
