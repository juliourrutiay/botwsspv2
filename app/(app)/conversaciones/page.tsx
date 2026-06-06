import { ConversationsInbox } from '@/components/conversations/conversations-inbox';
import { getConversationsInboxData } from '@/lib/conversations/queries';

export default async function ConversationsPage() {
  const data = await getConversationsInboxData();

  return <ConversationsInbox {...data} />;
}
