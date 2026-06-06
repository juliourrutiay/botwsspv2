import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

export function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(value));
}

export function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function toJsonFromTextarea(value: string, fallback: unknown): unknown {
  if (!value.trim()) return fallback;
  const parsed = safeJsonParse(value);
  return parsed ?? fallback;
}
