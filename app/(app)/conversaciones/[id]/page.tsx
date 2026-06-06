import { notFound } from 'next/navigation';
import { ConversationsInbox } from '@/components/conversations/conversations-inbox';
import { getConversationsInboxData } from '@/lib/conversations/queries';

export default async function ConversationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getConversationsInboxData(id);

  if (data.conversations.length > 0 && !data.selectedConversation) {
    notFound();
  }

  return <ConversationsInbox {...data} />;
}
