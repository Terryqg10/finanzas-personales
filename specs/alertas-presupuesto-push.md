# Spec — Aviso de presupuesto por notificación push (alertas, fase C)

Estado: **VALIDADA por Terry el 2026-10-07**, con su logo y con la demo abierta (ver sección 5).

Depende de `specs/alertas-presupuesto.md` (toast), `specs/alertas-presupuesto-email.md` (email) y `specs/alertas-presupuesto-edicion.md` (edición): reutiliza su detección de cruce y sus disparadores (crear y editar un gasto).

## 1. Objetivo

Además del toast y del email, enviar una **notificación push** al dispositivo del usuario cuando un gasto cruza el umbral o el límite de un presupuesto, incluso con la app cerrada. Es la última fase de las alertas.

## 2. Qué implica (y qué no cuesta)

- **Coste: ninguno.** Las notificaciones push web usan los servicios gratuitos de cada navegador (Google, Apple, Mozilla). No hay cuota ni trámites con terceros. Las claves VAPID se generan en local.
- **Dependencia nueva:** `web-push` (la librería estándar de Node para firmar y enviar push). Implementar el protocolo a mano es frágil y de alto riesgo.
- **La web pasa a ser instalable (PWA mínima):** manifiesto, iconos y un service worker que solo atiende notificaciones. **Sin caché offline** (no se intercepta ninguna petición), para no introducir errores de datos obsoletos.
- **iPhone:** iOS (16.4 o superior) solo permite notificaciones push a las webs **añadidas a la pantalla de inicio** ("Compartir → Añadir a pantalla de inicio") y abiertas desde ese icono. En Android y en ordenador funciona desde el navegador.

## 3. Reglas

- Se envía cuando se envía el email: gasto creado o editado que **cruza** un nivel (`detectBudgetAlert`), nunca por estar ya por encima.
- **No repetición:** como mucho una push por usuario, presupuesto, mes y nivel, igual que el email. Se reserva con la misma tabla (ver 4.1) pero **por canal**, de modo que desactivar el email no impide la push ni al revés.
- Se envía a **todos los dispositivos suscritos** del usuario.
- No se envía si el usuario no tiene ninguna suscripción, es anónimo (demo) o tiene `user_settings.notify_push = false`. Esa columna ya existe (por defecto `true`, sin uso hoy) y actúa como interruptor global; la suscripción por dispositivo es el consentimiento real.
- Es **secundaria**: si falla (claves ausentes, servicio de push caído, suscripción caducada), el gasto, el toast y el email no se ven afectados; solo queda una línea `[budget-alert-push]` en los logs.
- Una suscripción rechazada con `404` o `410` por el servicio de push (dispositivo que ya no existe o permiso revocado) se **borra** automáticamente.

## 4. Diseño

### 4.1 Base de datos (migración `0030`, SQL que Terry pega en el SQL Editor)

1. **Tabla nueva `public.push_subscriptions`**: `id uuid` PK, `user_id uuid` NOT NULL (FK a `auth.users` ON DELETE CASCADE), `endpoint text` NOT NULL, `p256dh text` NOT NULL, `auth text` NOT NULL, `user_agent text` (para que el usuario reconozca el dispositivo), `created_at`. **UNIQUE (endpoint)**. RLS activada con política de propietario (`user_id = auth.uid()`, USING y WITH CHECK).
2. **Generalizar la reserva por canal:** `budget_alert_emails` pasa a llamarse `budget_alert_notifications` y gana `channel text NOT NULL DEFAULT 'email'` con `CHECK (channel IN ('email', 'push'))`. El índice único pasa a `(user_id, budget_id, month, level, channel)`. Las filas existentes quedan como `email`. Se actualizan a mano los tipos (`src/types/supabase.ts`) y las referencias del código en el mismo cambio.
3. Sin tocar `budgets`, `transactions` ni `user_settings`.

### 4.2 Claves VAPID

- Se generan una vez con `npx web-push generate-vapid-keys` (en el ordenador de Terry; la privada no se pega en el chat).
- `NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY` (la pública, la necesita el navegador para suscribirse) y `WEB_PUSH_PRIVATE_KEY` (secreta, solo servidor), en Vercel (Production, la privada como Sensitive) y en `.env.local`. `.env.example` se actualiza con los nombres.
- `WEB_PUSH_SUBJECT` constante en el código: `mailto:contacto@terryq.com`.

### 4.3 Piezas de la PWA

| Archivo               | Función                                                                                                                                                                                                                                                                       |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/manifest.ts` | Manifiesto: nombre, `display: standalone`, colores del tema, iconos                                                                                                                                                                                                           |
| `public/icons/*.png`  | Iconos de la app derivados del logo de Terry (cartera con gráfico sobre verde `#266260`): `icon-192`, `icon-512`, `icon-maskable-512` (con zona segura) y `apple-touch-icon` (180). Archivos estáticos con extensión, para que el middleware de autenticación no los redirija |
| `public/sw.js`        | Service worker: solo `push` (muestra la notificación) y `notificationclick` (abre o enfoca `/presupuestos`); sin `fetch`, sin caché                                                                                                                                           |

El filtro actual del middleware ya excluye cualquier ruta con extensión, así que `/sw.js`, `/manifest.webmanifest` y los `.png` no exigen sesión y no hace falta tocarlo.

### 4.4 Suscripción (cliente) y servidor

| Archivo                                               | Tipo             | Responsabilidad                                                                                                                                     |
| ----------------------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/settings/push-notifications-form.tsx` | Client Component | Detecta soporte, estado del permiso y de la suscripción; botones **Activar** y **Desactivar** en este dispositivo; explica el caso de iPhone        |
| `src/app/api/push/subscribe/route.ts`                 | Route Handler    | Guarda o actualiza la suscripción del usuario (validada con Zod); rechaza anónimos                                                                  |
| `src/app/api/push/unsubscribe/route.ts`               | Route Handler    | Borra la suscripción del dispositivo                                                                                                                |
| `src/lib/validations/push.ts`                         | Zod              | Esquema de la suscripción (`endpoint` con `https`, claves)                                                                                          |
| `src/lib/push/budget-alert-push.ts`                   | Función pura     | Construye el payload (título, cuerpo, enlace, `tag` por presupuesto y nivel para que una notificación nueva sustituya a otra del mismo presupuesto) |
| `src/lib/push/send-push.ts`                           | Servidor         | Envuelve `web-push` con el envío inyectable para tests; devuelve resultado tipado y marca para borrar las suscripciones `404`/`410`                 |
| `src/lib/data/push-subscriptions.ts`                  | Datos            | Leer las suscripciones del usuario, borrar una caducada                                                                                             |
| `src/app/(app)/movimientos/actions.ts`                | Server Action    | Junto a `queueBudgetAlertEmail`, un `queueBudgetAlertPush` con la misma reserva (canal `push`) y envío dentro de `after()`                          |

Los permisos del navegador **solo se piden al pulsar Activar** (nunca al cargar la página), como exigen Safari y Chrome.

### 4.5 Contenido de la notificación

Título: `Presupuesto de {categoría}`. Cuerpo: `Has superado el límite mensual.` o `Vas por el {n}% de tu límite.` Sin importes (la pantalla de bloqueo es visible). Al tocarla, abre `/presupuestos`.

### 4.6 Demo y seguridad

- Usuarios anónimos: no se les permite suscribirse (la API devuelve 403) ni se les envía nada.
- Las rutas de la API comprueban la sesión y escriben con el cliente del propio usuario (RLS); un usuario nunca puede ver ni borrar suscripciones ajenas.
- La clave privada solo se lee en el servidor (sin `NEXT_PUBLIC_`).

## 5. Decisiones de Terry (2026-10-07)

- **Icono:** se usa su logo (cartera con gráfico ascendente en blanco sobre verde `#266260`), recortado a pantalla completa porque el sistema aplica las esquinas redondeadas. La versión maskable lleva el dibujo más pequeño para que ninguna máscara circular lo recorte.
- **Demo abierta:** el acceso de prueba para visitantes **no se toca**. Solo se excluye a los usuarios anónimos de recibir y activar notificaciones, porque no tienen email ni consentimiento; entran y usan la app igual que hasta ahora.
- Se aceptan el resto de decisiones de la spec: sin coste, `web-push` como dependencia, reserva por canal con renombrado a `budget_alert_notifications`, push sin importes y borrado automático de suscripciones caducadas.

## 6. Tareas atómicas (tras validar la spec)

1. Migración `0030` + tipos y referencias del código (`budget_alert_emails` → `budget_alert_notifications` con `channel`). Terry ejecuta el SQL y el `migration repair`.
2. Añadir `web-push`; `src/lib/validations/push.ts`; `src/lib/push/budget-alert-push.ts` y `send-push.ts` con tests (payload, éxito, `410` marca para borrar, claves ausentes).
3. Capa de datos de suscripciones y rutas `subscribe` / `unsubscribe`.
4. Manifiesto, iconos y `public/sw.js`.
5. Componente de Configuración (activar y desactivar notificaciones en este dispositivo).
6. Integrar `queueBudgetAlertPush` en `createTransaction` y `updateTransaction`.
7. Verificación: `npx tsc --noEmit`, `npm run lint`, `npx vitest run`, `npm run build`.
8. Terry: genera las claves VAPID, las guarda en Vercel y `.env.local`, y prueba en su móvil (en iPhone, tras añadir la app a la pantalla de inicio).

## 7. Fuera de alcance

Funcionamiento sin conexión, insignias, horario de silencio, historial de notificaciones, importación y movimientos recurrentes como disparadores, y notificaciones desde otras funciones de la app.

## 8. Documentos del Project a actualizar tras validar

Esta spec y el archivo de QA (casos: activar, desactivar, cruce de umbral y de límite con la app cerrada, sin repetición, sin suscripción, demo, suscripción caducada, iPhone con y sin la app instalada).
