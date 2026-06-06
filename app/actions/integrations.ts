'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { encrypt } from '@/lib/crypto';
import { GRAPH_API_VERSION } from '@/lib/constants';
import type { Database } from '@/lib/database.types';

type ProfileOrganization = Pick<Database['public']['Tables']['profiles']['Row'], 'organization_id'>;
type WhatsAppConfig = Database['public']['Tables']['whatsapp_configs']['Row'];

const WhatsAppConfigSchema = z.object({
  phone_number_id: z.string().min(2),
  waba_id: z.string().min(2),
  access_token: z.string().min(10),
  verify_token: z.string().min(4),
  app_secret: z.string().min(10)
});

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

export async function saveWhatsAppConfigAction(formData: FormData) {
  const parsed = WhatsAppConfigSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect('/integraciones?error=Completa todos los campos de WhatsApp correctamente.');
  }

  const { supabase, organizationId } = await getOrganizationId();

  const { error } = await supabase.from('whatsapp_configs').upsert({
    organization_id: organizationId,
    phone_number_id: parsed.data.phone_number_id,
    waba_id: parsed.data.waba_id,
    access_token_encrypted: encrypt(parsed.data.access_token),
    verify_token: parsed.data.verify_token,
    app_secret_encrypted: encrypt(parsed.data.app_secret),
    webhook_enabled: true,
    updated_at: new Date().toISOString()
  });

  if (error) {
    redirect(`/integraciones?error=${encodeURIComponent(error.message)}`);
  }

  redirect('/integraciones?message=Configuración de WhatsApp guardada.');
}

export async function testWhatsAppConnectionAction() {
  const { supabase, organizationId } = await getOrganizationId();
  const { data: config } = await supabase
    .from('whatsapp_configs')
    .select('*')
    .eq('organization_id', organizationId)
    .single();

  const typedConfig = config as unknown as WhatsAppConfig | null;
  if (!typedConfig) {
    redirect('/integraciones?error=Primero guarda la configuración de WhatsApp.');
  }

  const { decrypt } = await import('@/lib/crypto');

  const response = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${typedConfig.phone_number_id}`, {
    headers: {
      Authorization: `Bearer ${decrypt(typedConfig.access_token_encrypted)}`
    }
  });

  if (!response.ok) {
    redirect('/integraciones?error=No se pudo validar la conexión con WhatsApp. Revisa token y Phone Number ID.');
  }

  await supabase
    .from('whatsapp_configs')
    .update({ last_test_at: new Date().toISOString() })
    .eq('organization_id', organizationId);

  redirect('/integraciones?message=Conexión WhatsApp validada correctamente.');
}
