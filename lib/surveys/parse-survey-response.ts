export type SurveyResponseIntent = 'yes' | 'no' | 'unknown';

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const yesValues = new Set([
  '1',
  'si',
  'sii',
  'sip',
  'correcto',
  'claro',
  'resuelto',
  'me ayudaron',
  'todo bien',
  'ok',
  'okay',
  'vale',
  'gracias si',
  'si gracias'
]);

const noValues = new Set([
  '2',
  'no',
  'aun no',
  'todavia no',
  'no se resolvio',
  'sigo igual',
  'no me ayudaron',
  'no era eso',
  'no quedo claro',
  'no gracias',
  'ninguna'
]);

export function parseSurveyResponse(value: string): SurveyResponseIntent {
  const normalized = normalize(value);
  if (!normalized) return 'unknown';
  if (yesValues.has(normalized)) return 'yes';
  if (noValues.has(normalized)) return 'no';
  if (/^(si|sii|sip)\b/.test(normalized)) return 'yes';
  if (/^(no|nop)\b/.test(normalized)) return 'no';
  if (normalized.includes('resuelto') || normalized.includes('todo bien')) return 'yes';
  if (normalized.includes('no se') || normalized.includes('sigo') || normalized.includes('problema')) return 'no';
  return 'unknown';
}

export function parsePreCloseResponse(value: string): 'has_more_questions' | 'no_more_questions' | 'unknown' {
  const parsed = parseSurveyResponse(value);
  if (parsed === 'yes') return 'has_more_questions';
  if (parsed === 'no') return 'no_more_questions';
  return 'unknown';
}
