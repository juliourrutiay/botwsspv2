import { saveWhatsAppConfigAction, testWhatsAppConnectionAction } from '@/app/actions/integrations';
import { Notice } from '@/components/notice';
import { PageHeader } from '@/components/page-header';
import { GRAPH_API_VERSION } from '@/lib/constants';
import { getAppUrl } from '@/lib/env';
import { getUserContext } from '@/lib/supabase/user-context';
import { formatDateTime } from '@/lib/utils';
import type { Database } from '@/lib/database.types';

type WhatsAppConfig = Database['public']['Tables']['whatsapp_configs']['Row'];

export default async function IntegracionesPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const params = await searchParams;
  const { supabase, profile } = await getUserContext();
  const { data: config } = await supabase
    .from('whatsapp_configs')
    .select('*')
    .eq('organization_id', profile.organization_id)
    .maybeSingle();

  const typedConfig = config as unknown as WhatsAppConfig | null;
  const webhookUrl = `${getAppUrl()}/api/webhooks/whatsapp`;

  return (
    <div>
      <PageHeader title="Integraciones" description="Conecta WhatsApp Cloud API y valida que OpenRouter esté configurado en el entorno." />
      <Notice error={params.error} message={params.message} />

      <div className="grid gap-6 xl:grid-cols-2">
        <form action={saveWhatsAppConfigAction} className="card space-y-4 p-6">
          <h2 className="text-xl font-black">WhatsApp Cloud API</h2>
          <p className="text-sm text-[#9CA3AF]">Endpoint Graph API: {GRAPH_API_VERSION}</p>
          <label className="block text-sm font-semibold">Phone Number ID<input name="phone_number_id" defaultValue={typedConfig?.phone_number_id ?? ''} className="mt-2" /></label>
          <label className="block text-sm font-semibold">WABA ID<input name="waba_id" defaultValue={typedConfig?.waba_id ?? ''} className="mt-2" /></label>
          <label className="block text-sm font-semibold">Access Token<input name="access_token" type="password" placeholder="Pega el token completo" className="mt-2" /></label>
          <label className="block text-sm font-semibold">Verify Token<input name="verify_token" defaultValue={typedConfig?.verify_token ?? ''} className="mt-2" /></label>
          <label className="block text-sm font-semibold">App Secret<input name="app_secret" type="password" placeholder="Pega el app secret completo" className="mt-2" /></label>
          <div className="rounded-xl border border-[#1F2937] bg-[#0D1117] p-4 text-sm text-[#9CA3AF]">
            <p className="font-bold text-white">Webhook URL</p>
            <p className="mt-2 break-all font-mono text-[#DCFCE7]">{webhookUrl}</p>
          </div>
          <button className="btn-primary" type="submit">Guardar WhatsApp</button>
        </form>

        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-xl font-black">Estado WhatsApp</h2>
            <div className="mt-4 space-y-2 text-sm text-[#9CA3AF]">
              <p>Configuración: <span className="text-white">{typedConfig ? 'Guardada' : 'Pendiente'}</span></p>
              <p>Última prueba: <span className="text-white">{formatDateTime(typedConfig?.last_test_at)}</span></p>
              <p>Webhook activo: <span className="text-white">{typedConfig?.webhook_enabled ? 'Sí' : 'No'}</span></p>
            </div>
            <form action={testWhatsAppConnectionAction} className="mt-5">
              <button className="btn-secondary" type="submit">Probar conexión</button>
            </form>
          </div>

          <div className="card p-6">
            <h2 className="text-xl font-black">OpenRouter</h2>
            <p className="mt-3 text-sm text-[#9CA3AF]">La API key se configura en variable de entorno `OPENROUTER_API_KEY`. No se muestra ni se guarda en frontend.</p>
            <p className="mt-4">Estado: <span className="badge">{process.env.OPENROUTER_API_KEY ? 'Configurada' : 'Pendiente'}</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}
