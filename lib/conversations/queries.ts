import 'server-only';

import { getUserContext } from '@/lib/supabase/user-context';
import type { InboxConversation, LastMessagePreview, MessageRow } from '@/lib/conversations/types';

type ConversationWithContactFromDb = {
  id: string;
  contact_id: string;
  status: InboxConversation['status'];
  bot_active: boolean | null;
  last_message_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  contacts: {
    full_name: string | null;
    wa_phone: string | null;
  } | null;
};

export type ConversationsInboxData = {
  organizationId: string;
  conversations: InboxConversation[];
  selectedConversation: InboxConversation | null;
  messages: MessageRow[];
};

function getFirstMessageByConversation(messages: LastMessagePreview[]): Map<string, LastMessagePreview> {
  const map = new Map<string, LastMessagePreview>();

  for (const message of messages) {
    if (!map.has(message.conversation_id)) {
      map.set(message.conversation_id, message);
    }
  }

  return map;
}

export async function getConversationsInboxData(selectedConversationId?: string): Promise<ConversationsInboxData> {
  const { supabase, profile } = await getUserContext();
  const organizationId = profile.organization_id;

  const { data: conversationsData } = await supabase
    .from('conversations')
    .select('id, contact_id, status, bot_active, last_message_at, created_at, updated_at, contacts(full_name, wa_phone)')
    .order('last_message_at', { ascending: false })
    .limit(100);

  const conversationsFromDb = (conversationsData ?? []) as unknown as ConversationWithContactFromDb[];
  const conversationIds = conversationsFromDb.map((conversation) => conversation.id);

  const { data: lastMessagesData } = conversationIds.length
    ? await supabase
        .from('messages')
        .select('conversation_id, content, created_at, direction, sender')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: false })
    : { data: [] };

  const lastMessages = getFirstMessageByConversation((lastMessagesData ?? []) as unknown as LastMessagePreview[]);

  const conversations: InboxConversation[] = conversationsFromDb.map((conversation) => ({
    ...conversation,
    last_message: lastMessages.get(conversation.id) ?? null
  }));

  const selectedId = selectedConversationId ?? conversations[0]?.id ?? null;
  const selectedConversation = selectedId ? conversations.find((conversation) => conversation.id === selectedId) ?? null : null;

  const { data: messagesData } = selectedConversation
    ? await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', selectedConversation.id)
        .order('created_at', { ascending: true })
    : { data: [] };

  const messages = (messagesData ?? []) as unknown as MessageRow[];

  return {
    organizationId,
    conversations,
    selectedConversation,
    messages
  };
}
