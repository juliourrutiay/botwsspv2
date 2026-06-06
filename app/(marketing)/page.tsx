import Link from 'next/link';

export default function MarketingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-10">
      <header className="flex items-center justify-between">
        <div className="text-xl font-black">BotClínica</div>
        <div className="flex gap-3">
          <Link className="btn-secondary" href="/login">Entrar</Link>
          <Link className="btn-primary" href="/signup">Crear cuenta</Link>
        </div>
      </header>

      <section className="grid flex-1 items-center gap-10 py-20 lg:grid-cols-2">
        <div>
          <span className="badge">WhatsApp + IA + Resolutividad</span>
          <h1 className="mt-6 text-5xl font-black leading-tight tracking-tight text-white">
            Automatiza la atención de cualquier negocio por WhatsApp.
          </h1>
          <p className="mt-6 text-lg leading-8 text-[#9CA3AF]">
            Centraliza conversaciones, responde con IA vía OpenRouter, deriva a humano cuando sea necesario y mide resolutividad con encuestas automáticas.
          </p>
          <div className="mt-8 flex gap-3">
            <Link className="btn-primary" href="/signup">Comenzar MVP</Link>
            <Link className="btn-secondary" href="/login">Ya tengo cuenta</Link>
          </div>
        </div>
        <div className="card p-6">
          <div className="grid gap-4">
            {['Webhook WhatsApp seguro', 'Bot configurable por negocio', 'Handoff humano', 'Encuestas con timeout 30 min', 'KPIs de resolutividad'].map((item) => (
              <div key={item} className="rounded-2xl border border-[#1F2937] bg-[#0D1117] p-4 text-sm font-semibold text-white">
                <span className="mr-2 text-[#22C55E]">●</span>{item}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
