import Link from 'next/link';
import { notFound } from 'next/navigation';
import { finalizeConversationAction, sendHumanMessageAction, toggleBotAction } from '@/app/actions/conversations';
import { PageHeader } from '@/components/page-header';
import { RealtimeRefresh } from '@/components/realtime-refresh';
import type { Database } from '@/lib/database.types';
import { getUserContext } from '@/lib/supabase/user-context';
import { cn, formatDateTime } from '@/lib/utils';

type ConversationRow = Database['public']['Tables']['conversations']['Row'];
type ContactRow = Pick<Database['public']['Tables']['contacts']['Row'], 'full_name' | 'wa_phone'>;
type ConversationWithContact = ConversationRow & { contacts: ContactRow | null };
type MessageRow = Database['public']['Tables']['messages']['Row'];

export default async function ConversationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await getUserContext();

  const { data: conversation } = await supabase
    .from('conversations')
    .select('*, contacts(*)')
    .eq('id', id)
    .single();

  if (!conversation) notFound();

  const item = conversation as unknown as ConversationWithContact;

  const { data: messagesData } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true });

  const messages = (messagesData ?? []) as unknown as MessageRow[];

  return (
    <div>
      <RealtimeRefresh conversationId={id} />
      <Link href="/conversaciones" className="mb-4 inline-block text-sm text-[#22C55E]">← Volver</Link>
      <PageHeader
        title={item.contacts?.full_name || item.contacts?.wa_phone || 'Conversación'}
        description={`Estado: ${item.status ?? 'open'} · Bot ${item.bot_active ? 'activo' : 'inactivo'} · Último mensaje ${formatDateTime(item.last_message_at)}`}
      />

      <div className="mb-5 flex flex-wrap gap-3">
        <form action={toggleBotAction}>
          <input type="hidden" name="conversation_id" value={id} />
          <input type="hidden" name="bot_active" value={String(item.bot_active)} />
          <button className="btn-secondary" type="submit">{item.bot_active ? 'Desactivar bot' : 'Activar bot'}</button>
        </form>
        <form action={finalizeConversationAction}>
          <input type="hidden" name="conversation_id" value={id} />
          <button className="btn-primary" type="submit">Finalizar conversación y enviar encuesta</button>
        </form>
      </div>

      <section className="card flex min-h-[580px] flex-col overflow-hidden">
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {messages.map((message) => {
            const outbound = message.direction === 'outbound';
            return (
              <div key={message.id} className={cn('flex', outbound ? 'justify-end' : 'justify-start')}>
                <div className={cn('max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-6', outbound ? 'bg-[#22C55E] text-[#031008]' : 'bg-[#0D1117] text-white border border-[#1F2937]')}>
                  <div className="mb-1 text-[11px] font-bold uppercase opacity-70">{message.sender}</div>
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  <p className="mt-2 text-[10px] opacity-60">{formatDateTime(message.created_at)}</p>
                </div>
              </div>
            );
          })}
        </div>

        <form action={sendHumanMessageAction} className="border-t border-[#1F2937] p-4">
          <input type="hidden" name="conversation_id" value={id} />
          <div className="flex gap-3">
            <input name="message" placeholder="Escribe como humano..." autoComplete="off" />
            <button className="btn-primary whitespace-nowrap" type="submit">Enviar</button>
          </div>
        </form>
      </section>
    </div>
  );
}
