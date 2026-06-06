'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { toJsonFromTextarea } from '@/lib/utils';
import type { Database, Json } from '@/lib/database.types';

type ProfileOrganization = Pick<Database['public']['Tables']['profiles']['Row'], 'organization_id'>;

async function getOrganizationId() {
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

const AgentSchema = z.object({
  agent_name: z.string().min(1),
  agent_model: z.string().min(1),
  tone: z.string().min(1),
  system_prompt: z.string().min(20),
  handoff_message: z.string().min(1),
  fallback_message: z.string().min(1),
  business_info: z.string(),
  services: z.string(),
  products: z.string(),
  faqs: z.string(),
  policies: z.string(),
  business_hours: z.string()
});

export async function updateAgentConfigAction(formData: FormData) {
  const parsed = AgentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect('/personalizacion?error=Revisa los campos del agente.');
  }

  const { supabase, organizationId } = await getOrganizationId();
  const data = parsed.data;

  const { error } = await supabase
    .from('agent_configs')
    .update({
      agent_name: data.agent_name,
      agent_model: data.agent_model,
      tone: data.tone,
      system_prompt: data.system_prompt,
      handoff_message: data.handoff_message,
      fallback_message: data.fallback_message,
      business_info: toJsonFromTextarea(data.business_info, {}) as Json,
      services: toJsonFromTextarea(data.services, []) as Json,
      products: toJsonFromTextarea(data.products, []) as Json,
      faqs: toJsonFromTextarea(data.faqs, []) as Json,
      policies: toJsonFromTextarea(data.policies, {}) as Json,
      business_hours: toJsonFromTextarea(data.business_hours, {}) as Json,
      updated_at: new Date().toISOString()
    })
    .eq('organization_id', organizationId);

  if (error) redirect(`/personalizacion?error=${encodeURIComponent(error.message)}`);
  redirect('/personalizacion?message=Agente actualizado correctamente.');
}

const SurveyConfigSchema = z.object({
  enabled: z.string().optional(),
  pre_close_question: z.string().min(1),
  resolution_question: z.string().min(1),
  positive_thanks_message: z.string().min(1),
  negative_feedback_question: z.string().min(1),
  negative_thanks_message: z.string().min(1),
  expired_message: z.string().min(1),
  timeout_minutes: z.coerce.number().min(1).max(1440)
});

export async function updateSurveyConfigAction(formData: FormData) {
  const parsed = SurveyConfigSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect('/personalizacion?error=Revisa los campos de encuesta.');
  }

  const { supabase, organizationId } = await getOrganizationId();
  const data = parsed.data;

  const { error } = await supabase
    .from('survey_configs')
    .update({
      enabled: data.enabled === 'on',
      pre_close_question: data.pre_close_question,
      resolution_question: data.resolution_question,
      positive_thanks_message: data.positive_thanks_message,
      negative_feedback_question: data.negative_feedback_question,
      negative_thanks_message: data.negative_thanks_message,
      expired_message: data.expired_message,
      timeout_minutes: data.timeout_minutes,
      updated_at: new Date().toISOString()
    })
    .eq('organization_id', organizationId);

  if (error) redirect(`/personalizacion?error=${encodeURIComponent(error.message)}`);
  redirect('/personalizacion?message=Encuesta actualizada correctamente.');
}

export async function updateOrganizationAction(formData: FormData) {
  const { supabase, organizationId } = await getOrganizationId();
  const name = String(formData.get('name') ?? '').trim();
  const timezone = String(formData.get('timezone') ?? 'America/Santiago').trim();
  const businessType = String(formData.get('business_type') ?? '').trim();

  if (!name) redirect('/configuracion?error=El nombre es obligatorio.');

  const { error } = await supabase
    .from('organizations')
    .update({ name, timezone, business_type: businessType || null })
    .eq('id', organizationId);

  if (error) redirect(`/configuracion?error=${encodeURIComponent(error.message)}`);
  redirect('/configuracion?message=Organización actualizada.');
}
