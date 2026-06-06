import { after, type NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { decrypt } from '@/lib/crypto';
import { extractPhoneNumberId, parsePayload } from '@/lib/whatsapp/parse-payload';
import { verifyMetaSignature } from '@/lib/whatsapp/verify-signature';
import { processWhatsAppWebhook } from '@/lib/whatsapp/process-webhook';
import type { Database } from '@/lib/database.types';

type WhatsAppConfig = Database['public']['Tables']['whatsapp_configs']['Row'];

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode !== 'subscribe' || !token || !challenge) {
    return new Response('Bad Request', { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: config } = await supabase
    .from('whatsapp_configs')
    .select('verify_token')
    .eq('verify_token', token)
    .maybeSingle();

  if (!config) {
    return new Response('Forbidden', { status: 403 });
  }

  return new Response(challenge, { status: 200 });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  let phoneNumberId: string | null = null;

  try {
    phoneNumberId = extractPhoneNumberId(parsePayload(rawBody));
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  if (!phoneNumberId) {
    return new Response('Missing phone_number_id', { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: config, error } = await supabase
    .from('whatsapp_configs')
    .select('*')
    .eq('phone_number_id', phoneNumberId)
    .maybeSingle();

  const typedConfig = config as unknown as WhatsAppConfig | null;
  if (error || !typedConfig) {
    return new Response('Unknown phone_number_id', { status: 404 });
  }

  const signature = request.headers.get('x-hub-signature-256');
  const appSecret = decrypt(typedConfig.app_secret_encrypted);

  if (!verifyMetaSignature(rawBody, signature, appSecret)) {
    return new Response('Invalid signature', { status: 401 });
  }

  after(async () => {
    await processWhatsAppWebhook(rawBody, typedConfig.organization_id);
  });

  return Response.json({ received: true });
}
