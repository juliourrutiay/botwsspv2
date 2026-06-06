import type { NextRequest } from 'next/server';
import { expirePendingSurveys } from '@/lib/surveys/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return new Response('Unauthorized', { status: 401 });
  }

  const result = await expirePendingSurveys();
  return Response.json({ ok: true, ...result });
}
