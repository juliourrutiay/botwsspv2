'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { decrypt } from '@/lib/crypto';
import { sendWhatsAppTextMessage } from '@/lib/whatsapp/send-message';
import { startResolutionSurvey } from '@/lib/surveys/service';
import type { Database } from '@/lib/database.types';

type ProfileOrganization = Pick<Database['public']['Tables']['profiles']['Row'], 'organization_id'>;
type WhatsAppConfig = Database['public']['Tables']['whatsapp_configs']['Row'];
type ConversationRow = Database['public']['Tables']['conversations']['Row'];
type ConversationWithContact = ConversationRow & {
  contacts: Pick<Database['public']['Tables']['contacts']['Row'], 'wa_phone'> | null;
};

async function requireUserOrg() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single();
  const typedProfile = profile as unknown as ProfileOrganization | null;
  if (!typedProfile) redirect('/login');
  return { supabase, organizationId: typedProfile.organization_id };
}

export async function sendHumanMessageAction(formData: FormData) {
  const conversationId = String(formData.get('conversation_id') ?? '');
  const message = String(formData.get('message') ?? '').trim();

  if (!conversationId || !message) return;

  const { supabase, organizationId } = await requireUserOrg();

  const { data: conversation } = await supabase
    .from('conversations')
    .select('*, contacts(*)')
    .eq('id', conversationId)
    .eq('organization_id', organizationId)
    .single();

  const typedConversation = conversation as unknown as ConversationWithContact | null;
  if (!typedConversation?.contacts?.wa_phone) return;

  const { data: config } = await supabase
    .from('whatsapp_configs')
    .select('*')
    .eq('organization_id', organizationId)
    .single();

  const typedConfig = config as unknown as WhatsAppConfig | null;
  if (!typedConfig) redirect(`/conversaciones/${conversationId}?error=Configura WhatsApp antes de responder.`);

  const waMessageId = await sendWhatsAppTextMessage({
    phoneNumberId: typedConfig.phone_number_id,
    accessToken: decrypt(typedConfig.access_token_encrypted),
    to: typedConversation.contacts.wa_phone,
    text: message
  });

  await supabase.from('messages').insert({
    organization_id: organizationId,
    conversation_id: conversationId,
    wa_message_id: waMessageId,
    direction: 'outbound',
    sender: 'human',
    content: message
  });

  await supabase
    .from('conversations')
    .update({
      status: 'pending_human',
      bot_active: false,
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', conversationId)
    .eq('organization_id', organizationId);

  revalidatePath(`/conversaciones/${conversationId}`);
}

export async function toggleBotAction(formData: FormData) {
  const conversationId = String(formData.get('conversation_id') ?? '');
  const botActive = String(formData.get('bot_active') ?? '') === 'true';
  const { supabase, organizationId } = await requireUserOrg();

  await supabase
    .from('conversations')
    .update({
      bot_active: !botActive,
      status: !botActive ? 'open' : 'pending_human',
      updated_at: new Date().toISOString()
    })
    .eq('id', conversationId)
    .eq('organization_id', organizationId);

  revalidatePath(`/conversaciones/${conversationId}`);
}

export async function finalizeConversationAction(formData: FormData) {
  const conversationId = String(formData.get('conversation_id') ?? '');
  const { supabase, organizationId } = await requireUserOrg();

  const { data: conversation } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .eq('organization_id', organizationId)
    .single();

  const typedConversation = conversation as unknown as ConversationRow | null;
  if (!typedConversation) return;

  await startResolutionSurvey({
    organizationId,
    conversationId,
    contactId: typedConversation.contact_id,
    triggeredBy: 'human'
  });

  revalidatePath(`/conversaciones/${conversationId}`);
}
