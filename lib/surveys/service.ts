import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { decrypt } from '@/lib/crypto';
import { sendWhatsAppTextMessage } from '@/lib/whatsapp/send-message';
import { parseSurveyResponse } from '@/lib/surveys/parse-survey-response';
import type { Database } from '@/lib/database.types';

export type TriggeredBy = 'bot' | 'human' | 'system';

type Conversation = Database['public']['Tables']['conversations']['Row'];
type Contact = Database['public']['Tables']['contacts']['Row'];
type SurveyConfig = Database['public']['Tables']['survey_configs']['Row'];
type WhatsAppConfig = Database['public']['Tables']['whatsapp_configs']['Row'];
type ConversationSurvey = Database['public']['Tables']['conversation_surveys']['Row'];

function addMinutes(date: Date, minutes: number): string {
  return new Date(date.getTime() + minutes * 60_000).toISOString();
}

async function getSurveyConfig(organizationId: string) {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from('survey_configs')
    .select('*')
    .eq('organization_id', organizationId)
    .single();

  return data as unknown as SurveyConfig | null;
}

async function sendSystemMessage({
  organizationId,
  conversationId,
  to,
  text
}: {
  organizationId: string;
  conversationId: string;
  to: string;
  text: string;
}) {
  const supabase = createSupabaseAdminClient();

  const { data: config, error } = await supabase
    .from('whatsapp_configs')
    .select('*')
    .eq('organization_id', organizationId)
    .single();

  const typedConfig = config as unknown as WhatsAppConfig | null;
  if (error || !typedConfig) {
    throw new Error('WhatsApp config not found for organization.');
  }

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
    sender: 'system',
    content: text
  });

  await supabase
    .from('conversations')
    .update({ last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', conversationId);
}

export async function startResolutionSurvey({
  organizationId,
  conversationId,
  contactId,
  triggeredBy
}: {
  organizationId: string;
  conversationId: string;
  contactId: string;
  triggeredBy: TriggeredBy;
}) {
  const supabase = createSupabaseAdminClient();
  const surveyConfig = await getSurveyConfig(organizationId);

  if (surveyConfig?.enabled === false) {
    await supabase
      .from('conversations')
      .update({ status: 'closed', updated_at: new Date().toISOString() })
      .eq('id', conversationId);
    return;
  }

  const { data: contact, error: contactError } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', contactId)
    .single();

  const typedContact = contact as unknown as Contact | null;
  if (contactError || !typedContact) throw new Error('Contact not found for survey.');

  const now = new Date();
  const timeout = surveyConfig?.timeout_minutes ?? 30;
  const question = surveyConfig?.resolution_question ?? '¿Logramos resolver tu consulta?';
  const text = `${question}\nResponde con:\n1. Sí\n2. No`;

  await supabase.from('conversation_surveys').insert({
    organization_id: organizationId,
    conversation_id: conversationId,
    contact_id: contactId,
    triggered_by: triggeredBy,
    question,
    status: 'pending',
    sent_at: now.toISOString(),
    expires_at: addMinutes(now, timeout)
  });

  await supabase
    .from('conversations')
    .update({
      status: 'survey_pending',
      metadata: {},
      updated_at: now.toISOString()
    })
    .eq('id', conversationId);

  await sendSystemMessage({ organizationId, conversationId, to: typedContact.wa_phone, text });
}

export async function handleSurveyInbound({
  conversation,
  contact,
  inboundText
}: {
  conversation: Conversation;
  contact: Contact;
  inboundText: string;
}): Promise<boolean> {
  const supabase = createSupabaseAdminClient();
  const surveyConfig = await getSurveyConfig(conversation.organization_id);

  const { data: survey } = await supabase
    .from('conversation_surveys')
    .select('*')
    .eq('conversation_id', conversation.id)
    .in('status', ['pending', 'feedback_pending'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const typedSurvey = survey as unknown as ConversationSurvey | null;
  if (!typedSurvey) return false;

  if (conversation.status === 'survey_pending') {
    const intent = parseSurveyResponse(inboundText);

    if (intent === 'unknown') {
      await sendSystemMessage({
        organizationId: conversation.organization_id,
        conversationId: conversation.id,
        to: contact.wa_phone,
        text: 'No logré entender tu respuesta. ¿Nos puedes responder con 1 para Sí o 2 para No?'
      });
      return true;
    }

    if (intent === 'yes') {
      const now = new Date().toISOString();
      await supabase
        .from('conversation_surveys')
        .update({
          response_raw: inboundText,
          resolved: true,
          score: 1,
          status: 'completed',
          answered_at: now,
          completed_at: now
        })
        .eq('id', typedSurvey.id);

      await supabase
        .from('conversations')
        .update({ status: 'closed', updated_at: now })
        .eq('id', conversation.id);

      await sendSystemMessage({
        organizationId: conversation.organization_id,
        conversationId: conversation.id,
        to: contact.wa_phone,
        text: surveyConfig?.positive_thanks_message ?? '¡Gracias por responder! Nos alegra haber podido ayudarte.'
      });
      return true;
    }

    const now = new Date();
    await supabase
      .from('conversation_surveys')
      .update({
        response_raw: inboundText,
        resolved: false,
        score: 0,
        status: 'feedback_pending',
        answered_at: now.toISOString(),
        expires_at: addMinutes(now, surveyConfig?.timeout_minutes ?? 30)
      })
      .eq('id', typedSurvey.id);

    await supabase
      .from('conversations')
      .update({ status: 'survey_feedback_pending', updated_at: now.toISOString() })
      .eq('id', conversation.id);

    await sendSystemMessage({
      organizationId: conversation.organization_id,
      conversationId: conversation.id,
      to: contact.wa_phone,
      text: surveyConfig?.negative_feedback_question ?? 'Cuéntanos qué nos faltó para ser más resolutivos.'
    });
    return true;
  }

  if (conversation.status === 'survey_feedback_pending') {
    const now = new Date().toISOString();
    await supabase
      .from('conversation_surveys')
      .update({
        feedback: inboundText,
        status: 'completed',
        completed_at: now
      })
      .eq('id', typedSurvey.id);

    await supabase
      .from('conversations')
      .update({ status: 'closed', updated_at: now })
      .eq('id', conversation.id);

    await sendSystemMessage({
      organizationId: conversation.organization_id,
      conversationId: conversation.id,
      to: contact.wa_phone,
      text: surveyConfig?.negative_thanks_message ?? 'Gracias por contarnos. Usaremos tu comentario para mejorar nuestra atención.'
    });
    return true;
  }

  return false;
}

export async function expirePendingSurveys() {
  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();

  const { data: surveys, error } = await supabase
    .from('conversation_surveys')
    .select('*, conversations(*), contacts(*)')
    .in('status', ['pending', 'feedback_pending'])
    .lt('expires_at', now)
    .limit(50);

  if (error) throw error;

  let expiredCount = 0;

  const typedSurveys = (surveys ?? []) as unknown as Array<ConversationSurvey & {
    conversations: Conversation | null;
    contacts: Contact | null;
  }>;

  for (const survey of typedSurveys) {
    if (!survey.conversations || !survey.contacts) continue;

    const surveyConfig = await getSurveyConfig(survey.organization_id);
    const finalMessage = surveyConfig?.expired_message ?? 'Gracias por contactarnos.';

    try {
      await sendSystemMessage({
        organizationId: survey.organization_id,
        conversationId: survey.conversation_id,
        to: survey.contacts.wa_phone,
        text: finalMessage
      });
    } catch (sendError) {
      console.error(JSON.stringify({
        event: 'survey_expiration_send_failed',
        survey_id: survey.id,
        message: sendError instanceof Error ? sendError.message : 'Unknown error'
      }));
    }

    await supabase
      .from('conversation_surveys')
      .update({ status: 'expired', expired_at: now, completed_at: now })
      .eq('id', survey.id);

    await supabase
      .from('conversations')
      .update({ status: 'closed', updated_at: now })
      .eq('id', survey.conversation_id);

    expiredCount += 1;
  }

  return { expiredCount };
}
