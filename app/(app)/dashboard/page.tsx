import Link from 'next/link';
import type { Route } from 'next';
import { PageHeader } from '@/components/page-header';
import { getUserContext } from '@/lib/supabase/user-context';
import { formatDateTime } from '@/lib/utils';

type SurveyKpiRow = {
  status: string | null;
  resolved: boolean | null;
};

type LatestConversationRow = {
  id: string;
  status: string | null;
  bot_active: boolean | null;
  last_message_at: string | null;
  contacts: { full_name: string | null; wa_phone: string | null } | null;
};

function pct(numerator: number, denominator: number): string {
  if (!denominator) return '0%';
  return `${Math.round((numerator / denominator) * 100)}%`;
}

export default async function DashboardPage() {
  const { supabase, organization } = await getUserContext();
  const orgName = organization?.name ?? 'Tu negocio';
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [conversations, openConversations, botInactive, handoffs, surveys, latest] = await Promise.all([
    supabase.from('conversations').select('id', { count: 'exact', head: true }).gte('last_message_at', since),
    supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('bot_active', false).neq('status', 'closed'),
    supabase.from('human_handoffs').select('id', { count: 'exact', head: true }).gte('created_at', since),
    supabase.from('conversation_surveys').select('status, resolved').gte('created_at', since),
    supabase
      .from('conversations')
      .select('id, status, bot_active, last_message_at, contacts(full_name, wa_phone)')
      .order('last_message_at', { ascending: false })
      .limit(5)
  ]);

  const surveyRows = (surveys.data ?? []) as unknown as SurveyKpiRow[];
  const latestRows = (latest.data ?? []) as unknown as LatestConversationRow[];
  const sent = surveyRows.length;
  const responded = surveyRows.filter((s) => s.status === 'completed' || s.status === 'answered' || s.status === 'feedback_pending').length;
  const expired = surveyRows.filter((s) => s.status === 'expired').length;
  const resolved = surveyRows.filter((s) => s.resolved === true).length;
  const unresolved = surveyRows.filter((s) => s.resolved === false).length;

  const kpis = [
    { label: 'Conversaciones 30 días', value: conversations.count ?? 0 },
    { label: 'Abiertas', value: openConversations.count ?? 0 },
    { label: 'Bot inactivo', value: botInactive.count ?? 0 },
    { label: 'Handoffs 30 días', value: handoffs.count ?? 0 },
    { label: 'Encuestas enviadas', value: sent },
    { label: 'Encuestas respondidas', value: responded },
    { label: 'Tasa respuesta', value: pct(responded, sent) },
    { label: 'Resolutividad', value: pct(resolved, responded) },
    { label: 'No resolutivas', value: unresolved },
    { label: 'Expiradas', value: expired }
  ];

  return (
    <div>
      <PageHeader title={`Dashboard de ${orgName}`} description="Monitorea conversaciones, handoffs y KPIs de resolutividad declarada por clientes." />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="card p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF]">{kpi.label}</p>
            <p className="mt-3 text-3xl font-black text-white">{kpi.value}</p>
          </div>
        ))}
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="mb-4 text-lg font-black">Últimas conversaciones</h2>
          <div className="space-y-3">
            {latestRows.map((item) => (
              <Link key={item.id} href={`/conversaciones/${item.id}` as Route} className="block rounded-xl border border-[#1F2937] bg-[#0D1117] p-4 hover:border-[#22C55E]/60">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-bold">{item.contacts?.full_name || item.contacts?.wa_phone || 'Cliente'}</p>
                    <p className="text-xs text-[#9CA3AF]">{formatDateTime(item.last_message_at)}</p>
                  </div>
                  <span className="badge">{item.status ?? 'open'}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="mb-4 text-lg font-black">Lectura rápida</h2>
          <div className="space-y-3 text-sm leading-6 text-[#9CA3AF]">
            <p>• Encuestas enviadas vs respondidas mide la participación real de clientes.</p>
            <p>• Encuestas expiradas indican cierres sin respuesta dentro de 30 minutos.</p>
            <p>• Los feedback negativos alimentan el panel de aprendizajes para mejorar el bot.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
