# BotClínica WhatsApp MVP

Plataforma SaaS multi-tenant para automatizar atención al cliente por WhatsApp con dashboard, agente IA, intervención humana, encuestas de resolutividad y KPIs.

Este proyecto está pensado para una implementación **cloud-first**:

```text
GitHub        = contiene el código fuente
Vercel        = ejecuta la app Next.js, APIs y webhooks
Supabase      = base de datos, Auth, RLS y persistencia operativa
Meta          = WhatsApp Cloud API para recibir/enviar mensajes
OpenRouter.ai = proveedor de modelos IA para el bot conversacional
cron-job.org  = ejecuta periódicamente el cierre de encuestas vencidas
```

La ejecución local queda solo como alternativa técnica para desarrollo. El flujo recomendado es: **descargar ZIP → subir a GitHub → importar en Vercel → conectar Supabase, Meta, OpenRouter y cron-job.org**.

---

## Qué incluye

- Next.js 16.2.6 + App Router + TypeScript strict
- TailwindCSS v4
- Supabase Auth + Postgres + Row Level Security
- WhatsApp Cloud API oficial de Meta
- OpenRouter.ai como proveedor configurable de modelos conversacionales
- Dashboard oscuro con acentos verdes
- Conversaciones bot/humano
- Toggle de bot por conversación
- Respuesta humana desde el panel
- Webhook de WhatsApp con verificación HMAC SHA-256
- Cifrado AES-256-GCM para tokens de WhatsApp
- Encuestas de resolutividad
- Expiración automática de encuestas a los 30 minutos
- Mensaje automático “Gracias por contactarnos.” si el cliente no responde encuesta
- KPIs de encuestas enviadas, respondidas, expiradas y resolutividad
- Panel de aprendizajes con feedback negativo
- Endpoint protegido para que cron-job.org cierre encuestas vencidas cada 5 minutos

No incluye todavía:

- Google Calendar
- citas/reservas
- pagos
- Shopify
- Dropi
- CRM externo
- campañas masivas
- flujos visuales complejos

---

## Rutas principales

| Ruta | Uso |
|---|---|
| `/` | Landing pública |
| `/signup` | Crear cuenta y organización |
| `/login` | Iniciar sesión |
| `/dashboard` | KPIs operativos y resolutividad |
| `/conversaciones` | Lista de conversaciones |
| `/conversaciones/[id]` | Detalle de chat, respuesta humana y cierre con encuesta |
| `/personalizacion` | Configurar agente, modelo, negocio y encuesta |
| `/integraciones` | Guardar credenciales de WhatsApp y probar OpenRouter |
| `/aprendizajes` | Feedback negativo de encuestas |
| `/api/webhooks/whatsapp` | Webhook público de Meta |
| `/api/cron/expire-surveys` | Endpoint protegido para expirar encuestas, llamado por cron-job.org |

---

## Archivos importantes

| Archivo | Para qué sirve |
|---|---|
| `.env.example` | Plantilla de variables para Vercel |
| `vercel.json` | Configuración de Vercel sin cron jobs, compatible con plan Hobby |
| `supabase/migrations/0001_initial_schema.sql` | Crea tablas, RLS, políticas e índices |
| `IMPLEMENTACION.md` | Guía cloud-first paso a paso |
| `GUIA_CREDENCIALES.md` | Dónde obtener cada ID/API key y dónde pegarlo |
| `AGENTS.md` | Reglas para continuar el proyecto |
| `app/api/webhooks/whatsapp/route.ts` | Webhook WhatsApp GET/POST |
| `app/api/cron/expire-surveys/route.ts` | Cierre automático de encuestas vencidas |
| `lib/whatsapp/send-message.ts` | Envío outbound por WhatsApp |
| `lib/agent/openrouter.ts` | Cliente OpenRouter |
| `lib/surveys/service.ts` | Lógica de encuestas y expiración |

---

## Variables de entorno necesarias en Vercel

Estas variables no deben ir con valores reales en GitHub. Debes pegarlas en:

```text
Vercel → Project → Settings → Environment Variables
```

| Variable | Dónde se obtiene | Uso |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → Data API / API Settings | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API Keys | Cliente público de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API Keys → secret/service role | Operaciones server-side/webhook |
| `OPENROUTER_API_KEY` | OpenRouter → Keys | Ejecutar el bot IA |
| `ENCRYPTION_KEY` | Generada por ti con `openssl rand -base64 32` | Cifrar tokens WhatsApp |
| `NEXT_PUBLIC_APP_URL` | Dominio público de Vercel | Redirect Auth y URLs públicas |
| `CRON_SECRET` | Generada por ti con `openssl rand -hex 32` | Proteger el endpoint de expiración de encuestas |

---

## Datos que se guardan dentro del panel `/integraciones`

Estos datos **no van en Vercel** porque son por organización/negocio y quedan cifrados en Supabase cuando corresponde.

| Dato | Dónde se obtiene | Dónde pegarlo |
|---|---|---|
| `PHONE_NUMBER_ID` | Meta Developers → App → WhatsApp → API Setup | `/integraciones` |
| `WABA_ID` | Meta Developers → WhatsApp → API Setup o Business Manager | `/integraciones` |
| `ACCESS_TOKEN` | Meta Business Settings → System Users → Generate Token | `/integraciones` |
| `VERIFY_TOKEN` | Lo defines tú | `/integraciones` y Meta Webhook |
| `APP_SECRET` | Meta Developers → App Settings → Basic | `/integraciones` |

---

## Implementación recomendada

Sigue la guía completa en:

```text
IMPLEMENTACION.md
```

Resumen del orden correcto:

1. Descargar el ZIP.
2. Subir el contenido a GitHub.
3. Crear proyecto en Supabase.
4. Ejecutar `supabase/migrations/0001_initial_schema.sql` en Supabase SQL Editor.
5. Crear cuenta en OpenRouter y obtener `OPENROUTER_API_KEY`.
6. Importar el repositorio GitHub en Vercel.
7. Pegar variables de entorno en Vercel.
8. Deploy en Vercel.
9. Configurar redirect URL en Supabase Auth:

```text
https://TU-PROYECTO.vercel.app/callback
```

10. Entrar a tu app desplegada y crear cuenta desde `/signup`.
11. Configurar WhatsApp Cloud API en Meta.
12. Pegar credenciales WhatsApp en `/integraciones`.
13. Configurar webhook de Meta:

```text
https://TU-PROYECTO.vercel.app/api/webhooks/whatsapp
```

14. Suscribir el campo `messages`.
15. Configurar cron-job.org para llamar cada 5 minutos a:

```text
https://TU-PROYECTO.vercel.app/api/cron/expire-surveys
```

con header:

```text
Authorization: Bearer TU_CRON_SECRET
```

16. Probar mensaje entrante y respuesta humana.
17. Probar bot con OpenRouter.
18. Probar cierre de conversación y encuesta.
19. Revisar KPIs en `/dashboard` y feedback en `/aprendizajes`.

---

## Encuestas de resolutividad

Cuando el humano presiona **Finalizar conversación y enviar encuesta**, o cuando el flujo del bot inicia cierre, se envía:

```text
¿Logramos resolver tu consulta?
Responde con:
1. Sí
2. No
```

Reglas:

- Si responde `Sí`, se marca `resolved = true`, la encuesta queda `completed` y la conversación se cierra.
- Si responde `No`, se pide feedback abierto: `Cuéntanos qué nos faltó para ser más resolutivos.`
- El feedback queda disponible en `/aprendizajes`.
- Si no responde dentro de 30 minutos, la encuesta queda `expired`.
- Al expirar, el sistema envía: `Gracias por contactarnos.`
- Después de expirar, la conversación queda cerrada hasta que el cliente vuelva a escribir.

cron-job.org debe revisar encuestas vencidas cada 5 minutos llamando al endpoint protegido:

```text
/api/cron/expire-surveys
```

---

## Configurar cron-job.org para encuestas vencidas

En Vercel Hobby no se pueden ejecutar cron jobs cada 5 minutos. Por eso este proyecto usa cron-job.org como ejecutor externo.

Configura un cron externo así:

| Campo | Valor |
|---|---|
| URL | `https://TU-PROYECTO.vercel.app/api/cron/expire-surveys` |
| Método | `GET` |
| Frecuencia | Cada 5 minutos |
| Header | `Authorization: Bearer TU_CRON_SECRET` |

`TU_CRON_SECRET` debe ser exactamente el mismo valor configurado en Vercel como variable de entorno:

```text
CRON_SECRET
```

Si el endpoint responde `401`, el secreto no coincide o falta el header.  
Si responde `200`, el job quedó correctamente protegido y funcionando.

---


---

## Gestor de paquetes en Vercel

Este proyecto fuerza el uso de `pnpm` en Vercel mediante `vercel.json`:

```json
{
  "installCommand": "corepack enable && pnpm install --no-frozen-lockfile"
}
```

No subas `package-lock.json` al repositorio. Si existe en GitHub, elimínalo. Vercel debe instalar con `pnpm`, no con `npm install`.

Motivo: `npm install` puede fallar en Vercel con errores internos como `Exit handler never called`. Además, el lockfile npm anterior podía quedar acoplado a un entorno de instalación distinto.

## Ejecución local opcional

No es necesaria para tu flujo cloud-first, pero sirve para desarrollo técnico.

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

En local, `NEXT_PUBLIC_APP_URL` puede ser:

```text
http://localhost:3000
```

Para probar webhooks localmente necesitarías exponer localhost con ngrok o Cloudflare Tunnel. En la implementación recomendada no hace falta, porque Vercel te entrega una URL pública HTTPS.

---

## Criterios de aceptación

El MVP queda correcto cuando:

- El repo está en GitHub.
- Vercel despliega correctamente desde GitHub.
- Supabase tiene las tablas, RLS y trigger de creación de organización.
- Un usuario puede registrarse y entrar.
- Se crea una organización automáticamente.
- WhatsApp se configura desde `/integraciones`.
- Meta verifica el webhook.
- Un mensaje entrante aparece en `/conversaciones`.
- Un humano puede responder desde el dashboard.
- El bot responde usando OpenRouter cuando `bot_active = true`.
- El bot deja de responder si `bot_active = false`.
- El botón de finalizar conversación envía encuesta.
- El cliente puede responder Sí/No.
- El feedback negativo queda en `/aprendizajes`.
- Las encuestas sin respuesta expiran a los 30 minutos mediante cron-job.org.
- El dashboard muestra enviados, respondidos, expirados y resolutividad.

---

## Mejora de conversaciones en vivo

La pantalla `/conversaciones` funciona como una bandeja operativa tipo inbox:

- panel lateral con conversaciones ordenadas por actividad reciente
- detalle de chat a la derecha
- filtros por activas, humano, bot inactivo, encuesta y cerradas
- badge visual de mensajes nuevos mientras estás en otra conversación
- actualización automática mediante Supabase Realtime

Para que la actualización en vivo funcione, ejecuta también esta migración en Supabase SQL Editor si tu base ya fue creada antes de esta mejora:

```text
supabase/migrations/0002_enable_realtime_conversations.sql
```

Esta migración agrega las tablas `conversations` y `messages` a la publicación `supabase_realtime`.
