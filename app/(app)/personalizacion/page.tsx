import { updateAgentConfigAction, updateSurveyConfigAction } from '@/app/actions/settings';
import { AgentSandbox } from '@/components/agent-sandbox';
import { Notice } from '@/components/notice';
import { PageHeader } from '@/components/page-header';
import { getUserContext } from '@/lib/supabase/user-context';
import type { Database } from '@/lib/database.types';

type AgentConfig = Database['public']['Tables']['agent_configs']['Row'];
type SurveyConfig = Database['public']['Tables']['survey_configs']['Row'];

function pretty(value: unknown): string {
  return JSON.stringify(value ?? {}, null, 2);
}

export default async function PersonalizacionPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const params = await searchParams;
  const { supabase, profile } = await getUserContext();
  const organizationId = profile.organization_id;

  const [{ data: agent }, { data: survey }] = await Promise.all([
    supabase.from('agent_configs').select('*').eq('organization_id', organizationId).single(),
    supabase.from('survey_configs').select('*').eq('organization_id', organizationId).single()
  ]);

  const typedAgent = agent as unknown as AgentConfig | null;
  const typedSurvey = survey as unknown as SurveyConfig | null;

  if (!typedAgent || !typedSurvey) {
    return <p>No se encontró configuración inicial. Revisa la migración y el trigger de signup.</p>;
  }

  return (
    <div>
      <PageHeader title="Personalización" description="Configura el agente, el modelo OpenRouter, la información del negocio y los textos de encuesta." />
      <Notice error={params.error} message={params.message} />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <form action={updateAgentConfigAction} className="card space-y-5 p-6">
          <h2 className="text-xl font-black">Agente conversacional</h2>
          <label className="block text-sm font-semibold">Nombre del agente<input name="agent_name" defaultValue={typedAgent.agent_name} className="mt-2" /></label>
          <label className="block text-sm font-semibold">Modelo OpenRouter<input name="agent_model" defaultValue={typedAgent.agent_model} className="mt-2" /></label>
          <label className="block text-sm font-semibold">Tono<input name="tone" defaultValue={typedAgent.tone} className="mt-2" /></label>
          <label className="block text-sm font-semibold">Prompt base<textarea name="system_prompt" defaultValue={typedAgent.system_prompt} className="mt-2" /></label>
          <label className="block text-sm font-semibold">Mensaje handoff<textarea name="handoff_message" defaultValue={typedAgent.handoff_message ?? ''} className="mt-2" /></label>
          <label className="block text-sm font-semibold">Mensaje fallback<textarea name="fallback_message" defaultValue={typedAgent.fallback_message ?? ''} className="mt-2" /></label>
          <label className="block text-sm font-semibold">Información del negocio JSON<textarea name="business_info" defaultValue={pretty(typedAgent.business_info)} className="mt-2 font-mono text-xs" /></label>
          <label className="block text-sm font-semibold">Servicios JSON<textarea name="services" defaultValue={pretty(typedAgent.services)} className="mt-2 font-mono text-xs" /></label>
          <label className="block text-sm font-semibold">Productos JSON<textarea name="products" defaultValue={pretty(typedAgent.products)} className="mt-2 font-mono text-xs" /></label>
          <label className="block text-sm font-semibold">FAQs JSON<textarea name="faqs" defaultValue={pretty(typedAgent.faqs)} className="mt-2 font-mono text-xs" /></label>
          <label className="block text-sm font-semibold">Políticas JSON<textarea name="policies" defaultValue={pretty(typedAgent.policies)} className="mt-2 font-mono text-xs" /></label>
          <label className="block text-sm font-semibold">Horarios JSON<textarea name="business_hours" defaultValue={pretty(typedAgent.business_hours)} className="mt-2 font-mono text-xs" /></label>
          <button className="btn-primary" type="submit">Guardar agente</button>
        </form>

        <div className="space-y-6">
          <form action={updateSurveyConfigAction} className="card space-y-4 p-6">
            <h2 className="text-xl font-black">Encuesta de resolutividad</h2>
            <label className="flex items-center gap-2 text-sm font-semibold"><input className="w-auto" type="checkbox" name="enabled" defaultChecked={typedSurvey.enabled ?? true} /> Encuesta activa</label>
            <label className="block text-sm font-semibold">Pregunta previa<input name="pre_close_question" defaultValue={typedSurvey.pre_close_question ?? ''} className="mt-2" /></label>
            <label className="block text-sm font-semibold">Pregunta resolutividad<input name="resolution_question" defaultValue={typedSurvey.resolution_question ?? ''} className="mt-2" /></label>
            <label className="block text-sm font-semibold">Gracias positivo<textarea name="positive_thanks_message" defaultValue={typedSurvey.positive_thanks_message ?? ''} className="mt-2" /></label>
            <label className="block text-sm font-semibold">Pregunta feedback negativo<textarea name="negative_feedback_question" defaultValue={typedSurvey.negative_feedback_question ?? ''} className="mt-2" /></label>
            <label className="block text-sm font-semibold">Gracias negativo<textarea name="negative_thanks_message" defaultValue={typedSurvey.negative_thanks_message ?? ''} className="mt-2" /></label>
            <label className="block text-sm font-semibold">Mensaje expiración<textarea name="expired_message" defaultValue={typedSurvey.expired_message ?? 'Gracias por contactarnos.'} className="mt-2" /></label>
            <label className="block text-sm font-semibold">Timeout encuesta minutos<input name="timeout_minutes" type="number" min={1} max={1440} defaultValue={typedSurvey.timeout_minutes} className="mt-2" /></label>
            <button className="btn-primary" type="submit">Guardar encuesta</button>
          </form>
          <AgentSandbox />
        </div>
      </div>
    </div>
  );
}
