'use client';

import { useState } from 'react';

type AgentResponse = {
  reply?: string;
  action?: string;
  reason?: string;
  error?: string;
};

export function AgentSandbox() {
  const [message, setMessage] = useState('Hola, quiero saber qué servicios tienen.');
  const [response, setResponse] = useState<AgentResponse | null>(null);
  const [loading, setLoading] = useState(false);

  async function testAgent() {
    setLoading(true);
    setResponse(null);
    const res = await fetch('/api/agent/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
    const data = (await res.json()) as AgentResponse;
    setResponse(data);
    setLoading(false);
  }

  return (
    <div className="card p-6">
      <h2 className="mb-2 text-lg font-black">Sandbox del agente</h2>
      <p className="mb-4 text-sm text-[#9CA3AF]">Prueba el agente sin enviar mensajes reales por WhatsApp.</p>
      <textarea value={message} onChange={(event) => setMessage(event.target.value)} />
      <button className="btn-primary mt-3" type="button" onClick={testAgent} disabled={loading}>{loading ? 'Probando...' : 'Probar agente'}</button>
      {response ? (
        <pre className="mt-4 overflow-auto rounded-xl border border-[#1F2937] bg-[#0D1117] p-4 text-xs text-[#DCFCE7]">
          {JSON.stringify(response, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}
