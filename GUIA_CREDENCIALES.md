# Guía de credenciales, IDs y dónde configurarlos

Esta guía responde exactamente: **dónde obtengo cada dato y dónde lo dejo**.

---

## 1. Datos que van en Vercel

Ruta:

```text
Vercel → Project → Settings → Environment Variables
```

| Variable | Dónde obtenerla | Dónde pegarla | Sensible |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → Data API / API Settings → Project URL | Vercel Environment Variables | No crítica |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API Keys → anon/public/publishable key | Vercel Environment Variables | Pública controlada |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API Keys → service_role/secret key | Vercel Environment Variables | Sí |
| `OPENROUTER_API_KEY` | OpenRouter → Keys / API Keys → Create key | Vercel Environment Variables | Sí |
| `ENCRYPTION_KEY` | Generada por ti con `openssl rand -base64 32` | Vercel Environment Variables | Sí |
| `NEXT_PUBLIC_APP_URL` | URL del deploy en Vercel | Vercel Environment Variables | No crítica |
| `CRON_SECRET` | Generada por ti con `openssl rand -hex 32` | Vercel Environment Variables | Sí |

Nunca pegues estas claves con valores reales en GitHub.

---

## 2. Datos que van en Supabase

### Migración SQL

Ruta:

```text
Supabase → SQL Editor
```

Debes copiar y ejecutar:

```text
supabase/migrations/0001_initial_schema.sql
```

Esto crea toda la estructura.

### Configuración de Auth

Ruta:

```text
Supabase → Authentication → URL Configuration
```

Configurar:

```text
Site URL:
https://TU-PROYECTO.vercel.app

Redirect URL:
https://TU-PROYECTO.vercel.app/callback
```

La ruta correcta del proyecto es `/callback`.

---

## 3. Datos que van en el panel `/integraciones`

Ruta:

```text
Tu app en Vercel → /integraciones
```

| Campo panel | Dónde se obtiene | Comentario |
|---|---|---|
| Phone Number ID | Meta Developers → App → WhatsApp → API Setup → Phone number ID | Identifica el número de WhatsApp |
| WABA ID | Meta Developers → WhatsApp → API Setup → WhatsApp Business Account ID | Identifica la cuenta de WhatsApp Business |
| Access Token | Meta Business Settings → Users → System Users → Generate Token | Usar permisos `whatsapp_business_messaging` y `whatsapp_business_management` |
| Verify Token | Lo defines tú | Debe ser igual en app y Meta Webhook |
| App Secret | Meta Developers → App Settings → Basic → App Secret | Permite validar firma HMAC |

Estos valores se guardan en Supabase. El access token y app secret se cifran antes de guardarse.

---

## 4. Datos que van en Meta Developers

Ruta general:

```text
Meta Developers → Tu App → WhatsApp → Configuration / Webhooks
```

| Campo Meta | Valor que debes poner |
|---|---|
| Callback URL | `https://TU-PROYECTO.vercel.app/api/webhooks/whatsapp` |
| Verify Token | El mismo `VERIFY_TOKEN` que guardaste en `/integraciones` |
| Webhook field | `messages` |

Meta verificará el webhook con una llamada GET. Si el token coincide, quedará activo.

---

## 5. Cómo crear el System User Access Token de Meta

Ruta habitual:

```text
Meta Business Settings → Users → System Users
```

Pasos:

1. Crear o seleccionar un System User.
2. Asignar activos del WhatsApp Business Account.
3. Generar token.
4. Seleccionar permisos:

```text
whatsapp_business_messaging
whatsapp_business_management
```

5. Copiar el token.
6. Pegar en:

```text
/integraciones → Access Token
```

No uses token personal para producción.

---

## 6. Cómo crear OpenRouter API Key

Ruta:

```text
OpenRouter → Keys / API Keys
```

Pasos:

1. Crear una API key.
2. Copiarla.
3. Pegarla en Vercel como:

```text
OPENROUTER_API_KEY
```

El modelo conversacional no se pega en Vercel. Se configura en la app:

```text
/personalizacion → Modelo OpenRouter
```

Ejemplo:

```text
openai/gpt-4o-mini
```

---

## 7. Cómo generar `ENCRYPTION_KEY`

En tu computador:

```bash
openssl rand -base64 32
```

Pegar en Vercel:

```text
ENCRYPTION_KEY
```

Esta clave cifra tokens de WhatsApp en Supabase.

---

## 8. Cómo generar `CRON_SECRET`

En tu computador:

```bash
openssl rand -hex 32
```

Pegar en Vercel:

```text
CRON_SECRET
```

Sirve para proteger:

```text
/api/cron/expire-surveys
```

---

## 9. Qué NO debes subir a GitHub

No subir:

```text
.env.local
claves reales
access tokens
app secrets
service_role keys
OPENROUTER_API_KEY
```

El repositorio debe contener solo `.env.example` sin valores.

---

## 10. Mapa rápido

```text
Supabase URL/key       → Vercel env vars
OpenRouter API key     → Vercel env vars
Encryption/Cron secret → Vercel env vars
Meta Phone Number ID   → Panel /integraciones
Meta WABA ID           → Panel /integraciones
Meta Access Token      → Panel /integraciones
Meta App Secret        → Panel /integraciones
Verify Token           → Panel /integraciones y Meta webhook
Webhook URL            → Meta webhook
Migración SQL          → Supabase SQL Editor
Auth Redirect URL      → Supabase Auth URL Configuration
```
