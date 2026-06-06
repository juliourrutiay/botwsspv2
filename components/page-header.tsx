export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-8">
      <p className="mb-2 text-sm font-bold uppercase tracking-[0.25em] text-[#22C55E]">BotClínica MVP</p>
      <h1 className="text-3xl font-black tracking-tight text-white">{title}</h1>
      {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-[#9CA3AF]">{description}</p> : null}
    </div>
  );
}
