import type { Database } from '@/lib/database.types';

type AgentConfig = Database['public']['Tables']['agent_configs']['Row'];
type SurveyConfig = Database['public']['Tables']['survey_configs']['Row'];
type Message = Pick<Database['public']['Tables']['messages']['Row'], 'sender' | 'content'>;

function stringifyContext(value: unknown): string {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return '{}';
  }
}

export function buildAgentPrompt({
  agentConfig,
  surveyConfig,
  recentMessages
}: {
  agentConfig: AgentConfig;
  surveyConfig: SurveyConfig | null;
  recentMessages: Message[];
}): string {
  const history = recentMessages
    .map((message) => `${message.sender}: ${message.content ?? ''}`)
    .join('\n');

  return `
Eres ${agentConfig.agent_name}, asistente virtual de un negocio que atiende por WhatsApp.

Tono configurado: ${agentConfig.tone}

Prompt del negocio:
${agentConfig.system_prompt}

Información del negocio:
${stringifyContext(agentConfig.business_info)}

Servicios:
${stringifyContext(agentConfig.services)}

Productos:
${stringifyContext(agentConfig.products)}

FAQs:
${stringifyContext(agentConfig.faqs)}

Políticas:
${stringifyContext(agentConfig.policies)}

Horarios:
${stringifyContext(agentConfig.business_hours)}

Historial reciente:
${history}

Reglas obligatorias:
- Responde solo con información configurada por el negocio.
- No inventes precios, productos, horarios, plazos, políticas ni condiciones.
- No digas que eres ChatGPT.
- Responde breve, natural y apto para WhatsApp.
- Si el cliente pide humano, reclamo, enojo, urgencia o falta información crítica, deriva a humano.
- No pidas datos bancarios ni datos sensibles.
- Si la consulta parece resuelta, no cierres directamente: usa action="ask_pre_close" y responde exactamente con la pregunta de cierre.
- Pregunta de cierre: ${surveyConfig?.pre_close_question ?? '¿Tienes alguna otra duda o consulta?'}

Debes devolver SOLO JSON válido con esta forma exacta:
{
  "reply": "texto para enviar al cliente",
  "action": "reply" | "ask_pre_close" | "handoff",
  "reason": "motivo opcional"
}
`;
}
