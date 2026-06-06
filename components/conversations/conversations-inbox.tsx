'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowClockwise,
  ChatCircleDots,
  CheckCircle,
  Circle,
  MagnifyingGlass,
  PaperPlaneTilt,
  PauseCircle,
  Robot,
  UserCircle
} from '@phosphor-icons/react';
import { finalizeConversationAction, sendHumanMessageAction, toggleBotAction } from '@/app/actions/conversations';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { InboxConversation, MessageRow } from '@/lib/conversations/types';
import { cn, formatDateTime } from '@/lib/utils';

type ConversationFilter = 'active' | 'survey' | 'closed' | 'all';

type ConversationsInboxProps = {
  organizationId: string;
  conversations: InboxConversation[];
  selectedConversation: InboxConversation | null;
  messages: MessageRow[];
};

const filters: Array<{ value: ConversationFilter; label: string }> = [
  { value: 'active', label: 'Activos' },
  { value: 'survey', label: 'Encuesta' },
  { value: 'closed', label: 'Cerradas' },
  { value: 'all', label: 'Todas' }
];

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function getConversationName(conversation: InboxConversation): string {
  return conversation.contacts?.full_name || conversation.contacts?.wa_phone || 'Cliente';
}

function getConversationInitial(conversation: InboxConversation): string {
  return getConversationName(conversation).slice(0, 1).toUpperCase();
}

function getLastMessageText(conversation: InboxConversation): string {
  const content = conversation.last_message?.content?.trim();
  if (!content) return 'Sin mensajes todavía';
  return content.length > 86 ? `${content.slice(0, 86)}…` : content;
}

function getStatusLabel(status?: string | null): string {
  const labels: Record<string, string> = {
    open: 'Abierta',
    pending_human: 'Requiere humano',
    survey_pending: 'Encuesta pendiente',
    survey_feedback_pending: 'Esperando feedback',
    closed: 'Cerrada'
  };
  return labels[status ?? 'open'] ?? status ?? 'Abierta';
}

function getStatusClass(status?: string | null): string {
  if (status === 'closed') return 'border-[#374151] bg-[#111827] text-[#9CA3AF]';
  if (status === 'pending_human') return 'border-[#F59E0B]/40 bg-[#F59E0B]/10 text-[#FBBF24]';
  if (status === 'survey_pending' || status === 'survey_feedback_pending') return 'border-[#38BDF8]/40 bg-[#38BDF8]/10 text-[#7DD3FC]';
  return 'border-[#22C55E]/40 bg-[#22C55E]/10 text-[#86EFAC]';
}

function isSurveyStatus(status?: string | null): boolean {
  return status === 'survey_pending' || status === 'survey_feedback_pending';
}


function getFilterForConversation(conversation: InboxConversation | null): ConversationFilter {
  if (!conversation) return 'active';
  if (conversation.status === 'closed') return 'closed';
  if (isSurveyStatus(conversation.status)) return 'survey';
  return 'active';
}

function getFilterCount(conversations: InboxConversation[], filter: ConversationFilter): number {
  return conversations.filter((conversation) => matchesFilter(conversation, filter)).length;
}

function matchesFilter(conversation: InboxConversation, filter: ConversationFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'active') return conversation.status !== 'closed' && !isSurveyStatus(conversation.status);
  if (filter === 'survey') return isSurveyStatus(conversation.status);
  if (filter === 'closed') return conversation.status === 'closed';
  return true;
}

function getPayloadConversationId(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const newRecord = record.new && typeof record.new === 'object' ? (record.new as Record<string, unknown>) : null;
  const oldRecord = record.old && typeof record.old === 'object' ? (record.old as Record<string, unknown>) : null;
  const id = newRecord?.conversation_id ?? oldRecord?.conversation_id ?? newRecord?.id ?? oldRecord?.id;
  return typeof id === 'string' ? id : null;
}

function useInboxRealtime(organizationId: string, selectedConversationId?: string) {
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();
  const [lastRealtimeAt, setLastRealtimeAt] = useState<Date | null>(null);
  const [unreadByConversation, setUnreadByConversation] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!selectedConversationId) return;
    setUnreadByConversation((current) => ({ ...current, [selectedConversationId]: 0 }));
  }, [selectedConversationId]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleRefresh = () => {
      setLastRealtimeAt(new Date());
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        startTransition(() => router.refresh());
      }, 250);
    };

    const channel = supabase
      .channel(`inbox:${organizationId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations', filter: `organization_id=eq.${organizationId}` },
        () => {
          scheduleRefresh();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `organization_id=eq.${organizationId}` },
        (payload) => {
          const conversationId = getPayloadConversationId(payload);
          if (conversationId && conversationId !== selectedConversationId) {
            setUnreadByConversation((current) => ({
              ...current,
              [conversationId]: (current[conversationId] ?? 0) + 1
            }));
          }
          scheduleRefresh();
        }
      )
      .subscribe();

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      void supabase.removeChannel(channel);
    };
  }, [organizationId, router, selectedConversationId]);

  return { unreadByConversation, isRefreshing, lastRealtimeAt };
}


function getMessageSenderLabel(message: MessageRow, selectedConversation: InboxConversation): string {
  if (message.sender === 'bot') return 'BOT';
  if (message.sender === 'human') return 'AGENTE';
  if (message.sender === 'system') return 'SISTEMA';
  return getConversationName(selectedConversation).toUpperCase();
}

function getMessageSenderIcon(message: MessageRow) {
  return message.sender === 'contact' ? <UserCircle size={14} weight="fill" /> : <Robot size={14} weight="fill" />;
}

export function ConversationsInbox({ organizationId, conversations, selectedConversation, messages }: ConversationsInboxProps) {
  const selectedId = selectedConversation?.id;
  const [filter, setFilter] = useState<ConversationFilter>(() => getFilterForConversation(selectedConversation));
  const previousSelectedIdRef = useRef<string | undefined>(selectedId);
  const [query, setQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const { unreadByConversation, isRefreshing, lastRealtimeAt } = useInboxRealtime(organizationId, selectedId);

  useEffect(() => {
    const selectedChanged = previousSelectedIdRef.current !== selectedId;
    if (!selectedChanged) return;

    previousSelectedIdRef.current = selectedId;
    if (!selectedConversation) return;

    setFilter((currentFilter) => {
      if (matchesFilter(selectedConversation, currentFilter)) return currentFilter;
      return getFilterForConversation(selectedConversation);
    });
  }, [selectedId, selectedConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, selectedId]);

  const visibleConversations = useMemo(() => {
    const normalizedQuery = normalize(query.trim());

    return conversations.filter((conversation) => {
      if (!matchesFilter(conversation, filter)) return false;
      if (!normalizedQuery) return true;

      const searchable = normalize([
        getConversationName(conversation),
        conversation.contacts?.wa_phone ?? '',
        conversation.status ?? '',
        conversation.last_message?.content ?? ''
      ].join(' '));

      return searchable.includes(normalizedQuery);
    });
  }, [conversations, filter, query]);

  const selectedIsClosed = selectedConversation?.status === 'closed';
  const selectedIsSurvey = isSurveyStatus(selectedConversation?.status);
  const canSendHumanMessage = Boolean(selectedConversation && !selectedIsClosed && !selectedIsSurvey);
  const canFinalize = Boolean(selectedConversation && selectedConversation.status !== 'closed' && !selectedIsSurvey);

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="eyebrow">BOTCLÍNICA MVP</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-white">Conversaciones</h1>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-[#1F2937] bg-[#0D1117] px-4 py-2 text-xs font-semibold text-[#9CA3AF]">
          <Circle size={10} weight="fill" className={cn(lastRealtimeAt ? 'text-[#22C55E]' : 'text-[#6B7280]')} />
          {isRefreshing ? 'Actualizando...' : lastRealtimeAt ? `Última actividad ${formatDateTime(lastRealtimeAt.toISOString())}` : 'Esperando actividad'}
        </div>
      </header>

      <section className="grid h-[calc(100vh-175px)] min-h-[560px] overflow-hidden rounded-3xl border border-[#1F2937] bg-[#0B0F14] shadow-2xl shadow-black/20 xl:grid-cols-[390px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col border-b border-[#1F2937] bg-[#070A0D] xl:border-b-0 xl:border-r">
          <div className="border-b border-[#1F2937] p-4">
            <div className="relative">
              <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" size={18} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar cliente, teléfono o mensaje..."
                className="pl-10"
              />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-2 2xl:grid-cols-4">
              {filters.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setFilter(item.value)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-center text-xs font-bold transition',
                    filter === item.value
                      ? 'border-[#22C55E] bg-[#22C55E] text-[#031008]'
                      : 'border-[#1F2937] bg-[#111827] text-[#9CA3AF] hover:border-[#22C55E]/60 hover:text-white'
                  )}
                >
                  {item.label} {getFilterCount(conversations, item.value)}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {visibleConversations.map((conversation) => {
              const isSelected = conversation.id === selectedId;
              const unreadCount = unreadByConversation[conversation.id] ?? 0;
              const isClosed = conversation.status === 'closed';
              const requiresHuman = conversation.status === 'pending_human';

              return (
                <Link
                  key={conversation.id}
                  href={`/conversaciones/${conversation.id}` as Route}
                  className={cn(
                    'block border-b border-[#1F2937] p-4 transition hover:bg-[#111827]/80',
                    isSelected && 'bg-[#111827] ring-1 ring-inset ring-[#22C55E]/40',
                    unreadCount > 0 && !isSelected && 'bg-[#102018]'
                  )}
                >
                  <div className="flex gap-3">
                    <div className={cn('relative grid h-12 w-12 shrink-0 place-items-center rounded-full font-black', isClosed ? 'bg-[#1F2937] text-[#9CA3AF]' : 'bg-[#22C55E] text-[#031008]')}>
                      {getConversationInitial(conversation)}
                      {unreadCount > 0 && !isSelected ? (
                        <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-[#EF4444] px-1 text-[10px] font-black text-white">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-black text-white">{getConversationName(conversation)}</p>
                          <p className="mt-0.5 text-xs text-[#9CA3AF]">{formatDateTime(conversation.last_message_at)}</p>
                        </div>
                        {requiresHuman ? <PauseCircle className="shrink-0 text-[#FBBF24]" size={20} weight="fill" /> : null}
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm leading-5 text-[#9CA3AF]">{getLastMessageText(conversation)}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className={cn('rounded-full border px-2 py-1 text-[11px] font-bold', getStatusClass(conversation.status))}>
                          {getStatusLabel(conversation.status)}
                        </span>
                        <span className={cn('rounded-full border px-2 py-1 text-[11px] font-bold', conversation.bot_active ? 'border-[#22C55E]/40 bg-[#22C55E]/10 text-[#86EFAC]' : 'border-[#EF4444]/40 bg-[#EF4444]/10 text-[#FCA5A5]')}>
                          {conversation.bot_active ? 'Bot activo' : 'Bot inactivo'}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}

            {visibleConversations.length === 0 ? (
              <div className="p-6 text-sm leading-6 text-[#9CA3AF]">
                No hay conversaciones para este filtro. Cuando entren mensajes por WhatsApp, aparecerán aquí automáticamente.
              </div>
            ) : null}
          </div>
        </aside>

        <main className="flex min-h-0 flex-col bg-gradient-to-b from-[#0B1220] to-[#070A0D]">
          {selectedConversation ? (
            <>
              <div className="flex flex-col gap-4 border-b border-[#1F2937] bg-[#0D1117]/80 p-5 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#22C55E] font-black text-[#031008]">
                    {getConversationInitial(selectedConversation)}
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate text-xl font-black text-white">{getConversationName(selectedConversation)}</h2>
                    <p className="mt-1 text-sm text-[#9CA3AF]">
                      {selectedConversation.contacts?.wa_phone ?? 'Sin teléfono'} · Último mensaje {formatDateTime(selectedConversation.last_message_at)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className={cn('rounded-full border px-3 py-1.5 text-xs font-bold', getStatusClass(selectedConversation.status))}>
                    {getStatusLabel(selectedConversation.status)}
                  </span>
                  <span className={cn('rounded-full border px-3 py-1.5 text-xs font-bold', selectedConversation.bot_active ? 'border-[#22C55E]/40 bg-[#22C55E]/10 text-[#86EFAC]' : 'border-[#EF4444]/40 bg-[#EF4444]/10 text-[#FCA5A5]')}>
                    {selectedConversation.bot_active ? 'Bot activo' : 'Bot inactivo'}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 border-b border-[#1F2937] bg-[#070A0D] p-4">
                <form action={toggleBotAction}>
                  <input type="hidden" name="conversation_id" value={selectedConversation.id} />
                  <input type="hidden" name="bot_active" value={String(selectedConversation.bot_active)} />
                  <button className="btn-secondary" type="submit" disabled={selectedIsClosed || selectedIsSurvey}>
                    <Robot size={18} weight="bold" /> {selectedConversation.bot_active ? 'Desactivar bot' : 'Activar bot'}
                  </button>
                </form>
                <form action={finalizeConversationAction}>
                  <input type="hidden" name="conversation_id" value={selectedConversation.id} />
                  <button className="btn-primary" type="submit" disabled={!canFinalize}>
                    <CheckCircle size={18} weight="bold" /> Finalizar y enviar encuesta
                  </button>
                </form>
              </div>

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-5">
                {messages.map((message) => {
                  const outbound = message.direction === 'outbound';
                  const isBot = message.sender === 'bot';
                  const isSystem = message.sender === 'system';

                  return (
                    <div key={message.id} className={cn('flex', outbound ? 'justify-end' : 'justify-start')}>
                      <div
                        className={cn(
                          'max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-lg',
                          outbound && !isBot && !isSystem && 'bg-[#22C55E] text-[#031008] shadow-[#22C55E]/10',
                          outbound && isBot && 'border border-[#16A34A]/40 bg-[#102018] text-[#DCFCE7]',
                          outbound && isSystem && 'border border-[#38BDF8]/40 bg-[#0B1B2A] text-[#BAE6FD]',
                          !outbound && 'border border-[#1F2937] bg-[#111827] text-white'
                        )}
                      >
                        <div className="mb-1 flex items-center gap-2 text-[11px] font-black uppercase tracking-wide opacity-70">
                          {getMessageSenderIcon(message)}
                          {getMessageSenderLabel(message, selectedConversation)}
                        </div>
                        <p className="whitespace-pre-wrap">{message.content || 'Mensaje sin contenido textual'}</p>
                        <p className="mt-2 text-[10px] opacity-60">{formatDateTime(message.created_at)}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <div className="border-t border-[#1F2937] bg-[#0D1117] p-4">
                {selectedIsClosed ? (
                  <div className="rounded-2xl border border-[#1F2937] bg-[#111827] p-4 text-sm text-[#9CA3AF]">
                    Esta conversación está cerrada. Si el cliente vuelve a escribir, el sistema creará una nueva conversación operativa.
                  </div>
                ) : selectedIsSurvey ? (
                  <div className="rounded-2xl border border-[#38BDF8]/40 bg-[#38BDF8]/10 p-4 text-sm text-[#BAE6FD]">
                    La conversación está en flujo de encuesta. El bot solo gestionará la respuesta de resolutividad o feedback del cliente.
                  </div>
                ) : (
                  <form action={sendHumanMessageAction}>
                    <input type="hidden" name="conversation_id" value={selectedConversation.id} />
                    <div className="flex gap-3">
                      <input name="message" placeholder="Escribe como humano..." autoComplete="off" disabled={!canSendHumanMessage} />
                      <button className="btn-primary whitespace-nowrap" type="submit" disabled={!canSendHumanMessage}>
                        <PaperPlaneTilt size={18} weight="bold" /> Enviar
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </>
          ) : (
            <div className="grid flex-1 place-items-center p-8 text-center">
              <div className="max-w-md">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-[#22C55E]/10 text-[#22C55E]">
                  <ChatCircleDots size={34} weight="fill" />
                </div>
                <h2 className="mt-5 text-2xl font-black text-white">Selecciona una conversación</h2>
                <p className="mt-3 text-sm leading-6 text-[#9CA3AF]">
                  Cuando lleguen mensajes por WhatsApp, verás la conversación en la bandeja lateral. Haz clic para revisar el historial y responder.
                </p>
                <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#1F2937] px-4 py-2 text-xs font-bold text-[#9CA3AF]">
                  <ArrowClockwise size={14} /> Actualización automática activa
                </div>
              </div>
            </div>
          )}
        </main>
      </section>
    </div>
  );
}
