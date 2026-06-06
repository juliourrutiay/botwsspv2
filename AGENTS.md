# AGENTS.md — Reglas para continuar el proyecto

Este repositorio es el MVP de BotClínica WhatsApp.

## Reglas obligatorias

- El flujo principal del proyecto es cloud-first: GitHub contiene código, Vercel ejecuta app/APIs/cron, Supabase guarda datos/Auth/RLS, Meta entrega WhatsApp y OpenRouter entrega IA.
- La ejecución local debe tratarse como opcional, no como camino principal para Julio.
- La ruta real de callback de Supabase Auth es `/callback`, no `/auth/callback`.

- Mantener TypeScript en modo strict.
- No usar claves hard-coded.
- No exponer `SUPABASE_SERVICE_ROLE_KEY` ni `OPENROUTER_API_KEY` al cliente.
- Usar RLS y filtrar todo por `organization_id`.
- WhatsApp Cloud API debe verificar `X-Hub-Signature-256`.
- Tokens de WhatsApp deben cifrarse con AES-256-GCM.
- No implementar Google Calendar, citas, pagos, Shopify, Dropi o CRM externo hasta que se solicite.
- Mantener el diseño oscuro con acentos verdes.
- Las encuestas de resolutividad expiran a los 30 minutos.
- Si una encuesta expira, enviar “Gracias por contactarnos.” y cerrar conversación.
- Si el cliente vuelve a escribir después de cierre, se crea una nueva conversación operativa.

## Prioridad del MVP

1. WhatsApp inbound funcional.
2. Conversaciones visibles en dashboard.
3. Respuesta humana outbound funcional.
4. Bot con OpenRouter funcional.
5. Encuestas y KPIs funcionales.
6. Pulido visual.

## Convenciones

- Componentes UI simples en `components/`.
- Lógica server-only en `lib/`.
- Acciones en `app/actions/`.
- Webhooks en `app/api/webhooks/`.
- Cron jobs en `app/api/cron/`.
- Migraciones Supabase en `supabase/migrations/`.
