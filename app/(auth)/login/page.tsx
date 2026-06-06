import Link from 'next/link';
import { signInAction } from '@/app/actions/auth';
import { Notice } from '@/components/notice';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const params = await searchParams;
  return (
    <main className="grid min-h-screen place-items-center px-6 py-10">
      <div className="card w-full max-w-md p-8">
        <h1 className="text-2xl font-black">Entrar</h1>
        <p className="mt-2 text-sm text-[#9CA3AF]">Accede al panel de automatización por WhatsApp.</p>
        <div className="mt-5"><Notice error={params.error} message={params.message} /></div>
        <form action={signInAction} className="mt-6 space-y-4">
          <label className="block text-sm font-semibold">Email<input name="email" type="email" required className="mt-2" /></label>
          <label className="block text-sm font-semibold">Contraseña<input name="password" type="password" required className="mt-2" /></label>
          <button className="btn-primary w-full" type="submit">Entrar</button>
        </form>
        <p className="mt-5 text-sm text-[#9CA3AF]">¿No tienes cuenta? <Link className="text-[#22C55E]" href="/signup">Crear cuenta</Link></p>
      </div>
    </main>
  );
}
