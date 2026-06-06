import Link from 'next/link';
import type { Route } from 'next';
import { PageHeader } from '@/components/page-header';
import { getUserContext } from '@/lib/supabase/user-context';
import { formatDateTime } from '@/lib/utils';

type ConversationListRow = {
  id: string;
  status: string | null;
  bot_active: boolean | null;
  last_message_at: string | null;
  contacts: { full_name: string | null; wa_phone: string | null } | null;
};

export default async function ConversationsPage() {
  const { supabase } = await getUserContext();

  const { data } = await supabase
    .from('conversations')
    .select('id, status, bot_active, last_message_at, contacts(full_name, wa_phone)')
    .order('last_message_at', { ascending: false })
    .limit(100);

  const rows = (data ?? []) as unknown as ConversationListRow[];

  return (
    <div>
      <PageHeader title="Conversaciones" description="Gestiona conversaciones de WhatsApp, responde como humano y activa o desactiva el bot." />
      <div className="card overflow-hidden">
        {rows.map((item) => (
          <Link key={item.id} href={`/conversaciones/${item.id}` as Route} className="flex items-center justify-between gap-4 border-b border-[#1F2937] p-5 hover:bg-[#0D1117]">
            <div className="flex items-center gap-4">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-[#22C55E] font-black text-[#031008]">
                {(item.contacts?.full_name || item.contacts?.wa_phone || 'C').slice(0, 1).toUpperCase()}
              </div>
              <div>
                <p className="font-bold">{item.contacts?.full_name || item.contacts?.wa_phone || 'Cliente'}</p>
                <p className="text-sm text-[#9CA3AF]">{formatDateTime(item.last_message_at)}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <span className="badge">{item.status ?? 'open'}</span>
              {!item.bot_active ? <span className="badge">Bot inactivo</span> : null}
            </div>
          </Link>
        ))}
        {rows.length === 0 ? <p className="p-6 text-sm text-[#9CA3AF]">Aún no hay conversaciones. Configura WhatsApp y envía un mensaje de prueba.</p> : null}
      </div>
    </div>
  );
}
