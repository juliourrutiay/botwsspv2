# Guía de implementación cloud-first

Esta es la guía principal. Está pensada para que no tengas que ejecutar el sistema localmente. El flujo correcto es:

```text
ZIP descargado → GitHub → Vercel → Supabase → Meta WhatsApp → OpenRouter → cron-job.org → pruebas reales
```

---

## Fase 0 — Qué cuentas necesitas tener creadas

Antes de partir, crea o ten disponibles estas cuentas:

| Plataforma | Para qué se usa |
|---|---|
| GitHub | Guardar el código fuente |
| Vercel | Ejecutar la app, APIs y webhooks |
| Supabase | Base de datos, Auth, RLS y persistencia |
| Meta Developers / Meta Business | WhatsApp Cloud API |
| OpenRouter.ai | Modelos de IA para el bot |
| cron-job.org | Ejecutar cada 5 minutos el cierre de encuestas vencidas |

Importante: Vercel Hobby no permite cron jobs cada 5 minutos. Por eso el proyecto mantiene el endpoint `/api/cron/expire-surveys`, pero la ejecución periódica la hará cron-job.org.

---

## Fase 1 — Subir archivos a GitHub

1. Descarga el ZIP entregado.
2. Descomprime la carpeta.
3. Crea un repositorio vacío en GitHub.
4. Sube todos los archivos del proyecto al repositorio.

Puedes hacerlo desde la web de GitHub:

```text
GitHub → New repository → nombre del repo → Create repository → Add file → Upload files
```

O desde terminal:

```bash
cd botclinica-whatsapp-mvp
git init
git add .
git commit -m "Initial WhatsApp automation MVP"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
git push -u origin main
```

No subas ningún archivo `.env.local` con claves reales.

---

## Fase 2 — Crear proyecto en Supabase

1. Entra a Supabase.
2. Crea un nuevo proyecto.
3. Define nombre, región y contraseña de base de datos.
4. Espera a que el proyecto quede activo.

### Ejecutar migración SQL

1. En Supabase, abre tu proyecto.
2. Ve a **SQL Editor**.
3. Abre en el repositorio el archivo:

```text
supabase/migrations/0001_initial_schema.sql
```

4. Copia todo el contenido.
5. Pégalo en SQL Editor.
6. Ejecuta el script.

Esto creará:

- tablas
- índices
- RLS
- políticas
- trigger para crear organización al registrar usuario
- configuración inicial del agente
- configuración inicial de encuestas

### Obtener datos de Supabase para Vercel

Ve a:

```text
Supabase → Project Settings → Data API / API Settings / API Keys
```

Copia estos valores:

| Dato en Supabase | Variable en Vercel | Comentario |
|---|---|---|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` | URL pública del proyecto |
| anon/public o publishable key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Se usa en cliente y server auth |
| service_role o secret key | `SUPABASE_SERVICE_ROLE_KEY` | Solo servidor/webhooks |

Nota: Supabase puede mostrar `publishable` y `secret` keys en proyectos nuevos, además de claves legacy. Este proyecto usa el nombre `NEXT_PUBLIC_SUPABASE_ANON_KEY` para la clave pública compatible con cliente, y `SUPABASE_SERVICE_ROLE_KEY` para la clave secreta de servidor.

---

## Fase 3 — Configurar Auth en Supabase

Ve a:

```text
Supabase → Authentication → URL Configuration
```

Agrega como Site URL:

```text
https://TU-PROYECTO.vercel.app
```

Agrega como Redirect URL:

```text
https://TU-PROYECTO.vercel.app/callback
```

Importante: este proyecto usa la ruta real:

```text
/callback
```

No uses `/auth/callback` salvo que agregues una ruta nueva.

Mientras aún no tienes dominio de Vercel, puedes dejar este paso pendiente y volver después del primer deploy.

---

## Fase 4 — Crear API Key en OpenRouter

1. Entra a OpenRouter.ai.
2. Inicia sesión.
3. Ve a **Keys** o **API Keys**.
4. Crea una nueva key.
5. Copia la key.
6. Esta key se pega en Vercel como:

```text
OPENROUTER_API_KEY
```

El modelo del bot se configura dentro de la app, en `/personalizacion`. El modelo por defecto es:

```text
openai/gpt-4o-mini
```

Puedes cambiarlo por otro model string válido de OpenRouter.

---

## Fase 5 — Importar repositorio en Vercel

1. Entra a Vercel.
2. Clic en **Add New Project**.
3. Importa el repositorio desde GitHub.
4. Framework Preset: **Next.js**.
5. Antes de desplegar, agrega variables de entorno.

Ve a:

```text
Vercel → Project → Settings → Environment Variables
```

Agrega:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENROUTER_API_KEY=
ENCRYPTION_KEY=
NEXT_PUBLIC_APP_URL=
CRON_SECRET=
```

### Cómo generar `ENCRYPTION_KEY`

En tu computador ejecuta:

```bash
openssl rand -base64 32
```

Pega el resultado en Vercel como `ENCRYPTION_KEY`.

### Cómo generar `CRON_SECRET`

En tu computador ejecuta:

```bash
openssl rand -hex 32
```

Pega el resultado en Vercel como `CRON_SECRET`.

Este valor también se usará en cron-job.org como header de autorización.

### Qué poner en `NEXT_PUBLIC_APP_URL`

Después del primer deploy, Vercel te entregará algo como:

```text
https://tu-proyecto.vercel.app
```

Ese valor debe quedar en:

```text
NEXT_PUBLIC_APP_URL
```

Si cambias esta variable después del primer deploy, haz redeploy.

---

## Fase 6 — Primer deploy en Vercel

1. Guarda las variables.
2. Ejecuta deploy.
3. Si el deploy termina correctamente, abre la URL pública.
4. Vuelve a Supabase y configura Auth con esa URL:

```text
Site URL: https://TU-PROYECTO.vercel.app
Redirect URL: https://TU-PROYECTO.vercel.app/callback
```

5. En Vercel, redeploy si cambiaste `NEXT_PUBLIC_APP_URL`.

### Importante sobre `vercel.json`

El archivo `vercel.json` no debe contener cron jobs frecuentes. Debe quedar sin la sección `crons`, porque Vercel Hobby rechaza schedules como:

```text
*/5 * * * *
```

La ejecución periódica de encuestas vencidas la hará cron-job.org.

---

## Fase 7 — Crear usuario y organización

1. Abre:

```text
https://TU-PROYECTO.vercel.app/signup
```

2. Crea una cuenta.
3. Al registrarte, Supabase ejecuta el trigger `handle_new_user()`.
4. Esto crea automáticamente:

- organización
- perfil
- configuración inicial del agente
- configuración inicial de encuesta

Si la confirmación de correo está activa, revisa tu correo. Para pruebas iniciales puedes desactivar confirmación en Supabase Auth.

---

## Fase 8 — Configurar WhatsApp Cloud API en Meta

### 8.1 Crear App Meta

1. Entra a Meta Developers.
2. Crea una app.
3. Agrega el producto **WhatsApp**.
4. Entra al panel de WhatsApp de la app.

### 8.2 Obtener `PHONE_NUMBER_ID`

Ruta habitual:

```text
Meta Developers → Tu App → WhatsApp → API Setup → Phone number ID
```

Pégalo en:

```text
Tu app desplegada → /integraciones → Phone Number ID
```

### 8.3 Obtener `WABA_ID`

Ruta habitual:

```text
Meta Developers → Tu App → WhatsApp → API Setup → WhatsApp Business Account ID
```

También puede verse en:

```text
Meta Business Settings → Accounts → WhatsApp Accounts
```

Pégalo en:

```text
Tu app desplegada → /integraciones → WABA ID
```

### 8.4 Obtener `ACCESS_TOKEN`

Para pruebas, Meta puede mostrar un token temporal en WhatsApp → API Setup.

Para producción, usa System User:

```text
Meta Business Settings → Users → System Users
```

Pasos:

1. Crea o selecciona un System User.
2. Asígnale acceso al WhatsApp Business Account.
3. Genera token.
4. Permisos mínimos:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
5. Copia el token.
6. Pégalo en:

```text
Tu app desplegada → /integraciones → Access Token
```

### 8.5 Definir `VERIFY_TOKEN`

Este valor lo inventas tú. Ejemplo:

```text
botclinica_webhook_2026_seguro
```

Debe quedar exactamente igual en dos lugares:

1. En tu app:

```text
/integraciones → Verify Token
```

2. En Meta Webhook:

```text
Meta Developers → WhatsApp → Configuration → Verify Token
```

Si no coinciden, Meta no podrá verificar el webhook.

### 8.6 Obtener `APP_SECRET`

Ruta habitual:

```text
Meta Developers → Tu App → App Settings → Basic → App Secret
```

Pégalo en:

```text
Tu app desplegada → /integraciones → App Secret
```

Se usa para validar la firma `X-Hub-Signature-256`.

---

## Fase 9 — Guardar credenciales WhatsApp en el panel

Entra a:

```text
https://TU-PROYECTO.vercel.app/integraciones
```

Completa:

| Campo en el panel | Valor que debes pegar |
|---|---|
| Phone Number ID | `PHONE_NUMBER_ID` de Meta |
| WABA ID | `WABA_ID` de Meta |
| Access Token | Token de System User de Meta |
| Verify Token | Token creado por ti |
| App Secret | App Secret de Meta |

Presiona guardar.

Los datos sensibles se cifran antes de guardarse en Supabase.

---

## Fase 10 — Configurar webhook en Meta

En Meta Developers, ve a:

```text
Tu App → WhatsApp → Configuration / Webhooks
```

Configura:

| Campo Meta | Valor |
|---|---|
| Callback URL | `https://TU-PROYECTO.vercel.app/api/webhooks/whatsapp` |
| Verify Token | El mismo token guardado en `/integraciones` |

Luego suscribe el campo:

```text
messages
```

Meta hará una llamada GET al webhook. Si el verify token coincide, la verificación quedará lista.

---

## Fase 11 — Configurar cron-job.org para encuestas vencidas

Este paso reemplaza el cron de Vercel. Es obligatorio para que las encuestas que no se respondan se cierren después de 30 minutos.

### 11.1 Verifica que tengas `CRON_SECRET` en Vercel

En Vercel revisa:

```text
Project → Settings → Environment Variables → CRON_SECRET
```

Debe tener un valor largo y seguro, por ejemplo generado con:

```bash
openssl rand -hex 32
```

### 11.2 Crear cron en cron-job.org

1. Entra a cron-job.org.
2. Crea una cuenta o inicia sesión.
3. Crea un nuevo cron job.
4. Configura la URL:

```text
https://TU-PROYECTO.vercel.app/api/cron/expire-surveys
```

5. Método:

```text
GET
```

6. Frecuencia:

```text
Cada 5 minutos
```

7. Agrega header HTTP:

```text
Authorization: Bearer TU_CRON_SECRET
```

Donde `TU_CRON_SECRET` es exactamente el mismo valor configurado en Vercel.

### 11.3 Probar cron

Ejecuta manualmente el cron desde cron-job.org si la plataforma lo permite.

Resultado esperado:

- Si responde `200`, el endpoint está correctamente protegido y operativo.
- Si responde `401`, falta el header o el valor no coincide con `CRON_SECRET`.
- Si responde `500`, revisa logs en Vercel y la configuración de Supabase/WhatsApp.

### 11.4 Qué hace este cron

Cada 5 minutos llama a:

```text
/api/cron/expire-surveys
```

Ese endpoint busca encuestas con:

```text
status = pending
expires_at < now()
```

Y por cada encuesta vencida:

- marca la encuesta como `expired`
- registra `expired_at`
- envía por WhatsApp: `Gracias por contactarnos.`
- cierra la conversación
- registra el mensaje saliente como `sender = system`
- actualiza los KPIs de encuestas expiradas/no respondidas

---

## Fase 12 — Probar WhatsApp inbound

1. Desde WhatsApp, escribe al número configurado.
2. Revisa en tu app:

```text
/conversaciones
```

3. Debe aparecer el contacto y la conversación.
4. Abre la conversación.
5. Verifica que el mensaje entrante esté guardado.

Si no aparece:

- revisa logs en Vercel
- confirma que Meta esté suscrito a `messages`
- confirma que `PHONE_NUMBER_ID` del payload exista en `/integraciones`
- confirma que el `APP_SECRET` sea correcto
- confirma que el token de Meta tenga permisos correctos

---

## Fase 13 — Probar respuesta humana

1. Abre una conversación.
2. Escribe desde el input del dashboard.
3. Envía.
4. El cliente debe recibir el mensaje en WhatsApp.
5. El mensaje debe quedar guardado como:

```text
sender = human
direction = outbound
```

---

## Fase 14 — Probar bot con OpenRouter

1. Entra a:

```text
/personalizacion
```

2. Configura:

- nombre del agente
- tono
- modelo OpenRouter
- información del negocio
- servicios/productos/FAQs/políticas

3. Usa el sandbox de prueba.
4. Luego envía un WhatsApp real.
5. Si `bot_active = true`, el bot debe responder.

Si falla:

- revisa `OPENROUTER_API_KEY` en Vercel
- revisa el model string configurado
- revisa logs en Vercel

---

## Fase 15 — Probar cierre con encuesta

1. Abre una conversación.
2. Presiona:

```text
Finalizar conversación y enviar encuesta
```

3. El cliente recibe:

```text
¿Logramos resolver tu consulta?
Responde con:
1. Sí
2. No
```

4. Si responde `1` o `Sí`:

- encuesta `completed`
- `resolved = true`
- conversación `closed`

5. Si responde `2` o `No`:

- se pide feedback abierto
- feedback queda en `/aprendizajes`
- conversación se cierra después del comentario

6. Si no responde en 30 minutos:

- cron-job.org llama al endpoint de expiración
- encuesta queda `expired`
- se envía `Gracias por contactarnos.`
- conversación queda cerrada
- KPI cuenta encuesta enviada/no respondida

---

## Fase 16 — Validación final

Marca cada punto:

- [ ] Repo subido a GitHub.
- [ ] Proyecto importado en Vercel.
- [ ] Variables configuradas en Vercel.
- [ ] Migración ejecutada en Supabase.
- [ ] Auth URL configurada en Supabase.
- [ ] Signup crea organización.
- [ ] Login funciona.
- [ ] WhatsApp config se guarda en `/integraciones`.
- [ ] Meta verifica webhook.
- [ ] cron-job.org llama correctamente a `/api/cron/expire-surveys`.
- [ ] Mensaje entrante aparece en `/conversaciones`.
- [ ] Humano puede responder desde el panel.
- [ ] Bot responde con OpenRouter.
- [ ] Bot se puede apagar por conversación.
- [ ] Finalizar conversación envía encuesta.
- [ ] Encuesta respondida actualiza KPI.
- [ ] Encuesta sin respuesta expira a los 30 minutos.
- [ ] Al expirar, se envía “Gracias por contactarnos.”
- [ ] Feedback negativo aparece en `/aprendizajes`.

---

## Ejecución local opcional

Solo para desarrollo técnico:

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

En local tendrías que configurar `NEXT_PUBLIC_APP_URL=http://localhost:3000` y usar ngrok/Cloudflare Tunnel para webhooks. No es el camino recomendado para tu implementación principal.

---

## Importante: instalación de dependencias en Vercel

Para evitar errores de instalación, este proyecto debe subirse a GitHub sin lockfiles generados en otros entornos.

No debe existir en GitHub:

```text
package-lock.json
pnpm-lock.yaml
yarn.lock
```

Debe existir en la raíz:

```text
package.json
.npmrc
vercel.json
```

En Vercel confirma:

```text
Settings → General → Node.js Version → 20.x
Settings → General → Root Directory → raíz del repositorio
```

El comando de instalación está definido en `vercel.json`:

```text
npm install --no-audit --no-fund --legacy-peer-deps
```

Después de subir estos cambios, ejecuta:

```text
Deployments → Redeploy → Redeploy without Build Cache
```
