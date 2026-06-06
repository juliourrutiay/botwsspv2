import 'server-only';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { requireEnv } from '@/lib/env';
import { DEFAULT_OPENROUTER_MODEL } from '@/lib/constants';

export function getOpenRouterModel(modelName?: string | null) {
  const openrouter = createOpenRouter({
    apiKey: requireEnv('OPENROUTER_API_KEY')
  });

  return openrouter.chat(modelName || DEFAULT_OPENROUTER_MODEL);
}
