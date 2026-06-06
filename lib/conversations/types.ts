import type { Database } from '@/lib/database.types';

export type ConversationRow = Database['public']['Tables']['conversations']['Row'];
export type ContactRow = Pick<Database['public']['Tables']['contacts']['Row'], 'full_name' | 'wa_phone'>;
export type MessageRow = Database['public']['Tables']['messages']['Row'];

export type LastMessagePreview = Pick<MessageRow, 'conversation_id' | 'content' | 'created_at' | 'direction' | 'sender'>;

export type InboxConversation = Pick<
  ConversationRow,
  'id' | 'contact_id' | 'status' | 'bot_active' | 'last_message_at' | 'created_at' | 'updated_at'
> & {
  contacts: ContactRow | null;
  last_message: LastMessagePreview | null;
};
