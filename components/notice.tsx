export function Notice({ message, error }: { message?: string | null; error?: string | null }) {
  if (!message && !error) return null;
  return (
    <div className={`mb-5 rounded-xl border p-4 text-sm ${error ? 'border-red-500/30 bg-red-500/10 text-red-200' : 'border-green-500/30 bg-green-500/10 text-green-200'}`}>
      {error || message}
    </div>
  );
}
