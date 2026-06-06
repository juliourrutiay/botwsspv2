import Link from 'next/link';
import type { Route } from 'next';
import { PageHeader } from '@/components/page-header';
import { getUserContext } from '@/lib/supabase/user-context';
import { formatDateTime } from '@/lib/utils';

type LearningSurveyRow = {
  id: string;
  created_at: string | null;
  response_raw: string | null;
  feedback: string | null;
  triggered_by: string | null;
  conversation_id: string;
  contacts: { full_name: string | null; wa_phone: string | null } | null;
};

export default async function AprendizajesPage() {
  const { supabase } = await getUserContext();

  const { data } = await supabase
    .from('conversation_surveys')
    .select('id, created_at, response_raw, feedback, triggered_by, conversation_id, contacts(full_name, wa_phone)')
    .eq('resolved', false)
    .order('created_at', { ascending: false })
    .limit(100);

  const rows = (data ?? []) as unknown as LearningSurveyRow[];

  return (
    <div>
      <PageHeader title="Aprendizajes del bot" description="Comentarios negativos de clientes para mejorar FAQs, políticas, productos y respuestas del agente." />
      <div className="card overflow-hidden">
        {rows.map((item) => (
          <div key={item.id} className="border-b border-[#1F2937] p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-bold">{item.contacts?.full_name || item.contacts?.wa_phone || 'Cliente'}</p>
                <p className="text-xs text-[#9CA3AF]">{formatDateTime(item.created_at)} · Atendido por {item.triggered_by ?? 'sistema'}</p>
              </div>
              <Link href={`/conversaciones/${item.conversation_id}` as Route} className="badge">Abrir conversación</Link>
            </div>
            <div className="rounded-xl border border-[#1F2937] bg-[#0D1117] p-4 text-sm leading-6 text-[#D1D5DB]">
              <p><strong className="text-white">Respuesta:</strong> {item.response_raw ?? '—'}</p>
              <p className="mt-2"><strong className="text-white">Feedback:</strong> {item.feedback ?? 'Pendiente o no entregado'}</p>
            </div>
          </div>
        ))}
        {rows.length === 0 ? <p className="p-6 text-sm text-[#9CA3AF]">Aún no hay feedback negativo.</p> : null}
      </div>
    </div>
  );
}
