import { updateOrganizationAction } from '@/app/actions/settings';
import { Notice } from '@/components/notice';
import { PageHeader } from '@/components/page-header';
import { getUserContext } from '@/lib/supabase/user-context';

export default async function ConfiguracionPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const params = await searchParams;
  const { organization } = await getUserContext();

  return (
    <div>
      <PageHeader title="Configuración" description="Datos generales de la organización y preferencias base." />
      <Notice error={params.error} message={params.message} />
      <form action={updateOrganizationAction} className="card max-w-2xl space-y-5 p-6">
        <label className="block text-sm font-semibold">Nombre organización<input name="name" defaultValue={organization?.name ?? ''} className="mt-2" /></label>
        <label className="block text-sm font-semibold">Tipo de negocio<input name="business_type" defaultValue={organization?.business_type ?? ''} className="mt-2" placeholder="Tienda, restaurante, clínica, servicio técnico..." /></label>
        <label className="block text-sm font-semibold">Timezone<input name="timezone" defaultValue={organization?.timezone ?? 'America/Santiago'} className="mt-2" /></label>
        <button className="btn-primary" type="submit">Guardar configuración</button>
      </form>
    </div>
  );
}
