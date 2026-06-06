import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { runAgent } from '@/lib/agent/run-agent';
import type { Database } from '@/lib/database.types';

type ProfileOrganization = Pick<Database['public']['Tables']['profiles']['Row'], 'organization_id'>;
type AgentConfig = Database['public']['Tables']['agent_configs']['Row'];
type SurveyConfig = Database['public']['Tables']['survey_configs']['Row'];

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BodySchema = z.object({
  message: z.string().min(1)
});

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const body = BodySchema.safeParse(await request.json());
  if (!body.success) {
    return Response.json({ error: body.error.flatten() }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single();

  const typedProfile = profile as unknown as ProfileOrganization | null;
  if (!typedProfile) {
    return new Response('Profile not found', { status: 404 });
  }

  const [{ data: agentConfig }, { data: surveyConfig }] = await Promise.all([
    supabase.from('agent_configs').select('*').eq('organization_id', typedProfile.organization_id).single(),
    supabase.from('survey_configs').select('*').eq('organization_id', typedProfile.organization_id).single()
  ]);

  const typedAgentConfig = agentConfig as unknown as AgentConfig | null;
  const typedSurveyConfig = surveyConfig as unknown as SurveyConfig | null;

  if (!typedAgentConfig) {
    return new Response('Agent config not found', { status: 404 });
  }

  const result = await runAgent({
    agentConfig: typedAgentConfig,
    surveyConfig: typedSurveyConfig,
    recentMessages: [{ sender: 'contact', content: body.data.message }],
    latestCustomerMessage: body.data.message
  });

  return Response.json(result);
}
