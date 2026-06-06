import 'server-only';
import { generateText } from 'ai';
import type { Database } from '@/lib/database.types';
import { getOpenRouterModel } from '@/lib/agent/openrouter';
import { buildAgentPrompt } from '@/lib/agent/prompt';

type AgentConfig = Database['public']['Tables']['agent_configs']['Row'];
type SurveyConfig = Database['public']['Tables']['survey_configs']['Row'];
type Message = Pick<Database['public']['Tables']['messages']['Row'], 'sender' | 'content'>;

export type AgentAction = 'reply' | 'ask_pre_close' | 'handoff';

export type AgentResult = {
  reply: string;
  action: AgentAction;
  reason?: string;
};

function parseAgentJson(text: string): AgentResult | null {
  const cleaned = text.trim().replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
  try {
    const parsed = JSON.parse(cleaned) as Partial<AgentResult>;
    if (!parsed.reply || !parsed.action) return null;
    if (!['reply', 'ask_pre_close', 'handoff'].includes(parsed.action)) return null;
    return {
      reply: parsed.reply,
      action: parsed.action,
      reason: parsed.reason
    };
  } catch {
    return null;
  }
}

export async function runAgent({
  agentConfig,
  surveyConfig,
  recentMessages,
  latestCustomerMessage
}: {
  agentConfig: AgentConfig;
  surveyConfig: SurveyConfig | null;
  recentMessages: Message[];
  latestCustomerMessage: string;
}): Promise<AgentResult> {
  const system = buildAgentPrompt({ agentConfig, surveyConfig, recentMessages });
  const fallbackMessage = agentConfig.fallback_message ?? 'No tengo suficiente información para responder con seguridad. Te contactaré con una persona del equipo.';

  try {
    const response = await generateText({
      model: getOpenRouterModel(agentConfig.agent_model),
      system,
      prompt: `Último mensaje del cliente: ${latestCustomerMessage}`,
      temperature: 0.3
    });

    const parsed = parseAgentJson(response.text);
    if (parsed) return parsed;

    return {
      reply: fallbackMessage,
      action: 'handoff',
      reason: 'Respuesta del modelo no fue JSON válido.'
    };
  } catch (error) {
    console.error(
      JSON.stringify({
        event: 'agent_error',
        message: error instanceof Error ? error.message : 'Unknown agent error'
      })
    );

    return {
      reply: fallbackMessage,
      action: 'handoff',
      reason: 'Error al invocar OpenRouter.'
    };
  }
}
