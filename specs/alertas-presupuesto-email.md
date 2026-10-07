# Spec — Aviso de presupuesto por email (alertas, fase B)

Estado: **VALIDADA por Terry el 2026-10-07.**

Depende de `specs/alertas-presupuesto.md` (fase A, ya implementada): reutiliza su detección de cruce de umbral o límite.

## 1. Objetivo

Cuando un gasto recién registrado hace cruzar el umbral o el límite de un presupuesto (el mismo evento que hoy muestra un toast), enviar además un email al usuario. Se envía **como mucho un email por presupuesto, nivel y mes**, y el usuario puede desactivarlo en Configuración.

## 2. Decisiones de Terry (2026-10-07)

1. **Cuándo:** justo al registrar el gasto que cruza el nivel, en `createTransaction`. Sin tareas programadas.
2. **Cuántos:** un email por cruce y por mes, y un interruptor en Configuración para desactivarlos.

## 3. Reglas

- Se envía solo si el gasto cruza un nivel (`detectBudgetAlert` devuelve aviso), es decir, nunca por estar ya por encima.
- Clave de no repetición: **(usuario, presupuesto, mes, nivel)**. Dentro de un mes, el umbral puede avisar una vez y el límite otra; no hay más.
- No se envía si: el usuario tiene `notify_email = false`, es anónimo (demo) o su cuenta no tiene email.
- Alcance: solo gastos creados a mano (`createTransaction`). Fuera: importación de extractos, edición, movimientos recurrentes.
- El email es **secundario**: si falla (clave ausente, Resend caído), el gasto ya está guardado, el toast se muestra igual y el fallo solo se registra en el log del servidor.

## 4. Diseño

### 4.1 Base de datos (migración `0029`, SQL que Terry pega en el SQL Editor)

Tabla `public.budget_alert_emails`:

| Columna      | Tipo          | Notas                                               |
| ------------ | ------------- | --------------------------------------------------- |
| `id`         | `uuid`        | PK, `gen_random_uuid()`                             |
| `user_id`    | `uuid`        | NOT NULL, FK a `auth.users(id)` ON DELETE CASCADE   |
| `budget_id`  | `uuid`        | NOT NULL, FK a `budgets(id)` ON DELETE CASCADE      |
| `month`      | `date`        | NOT NULL, primer día del mes en curso               |
| `level`      | `text`        | NOT NULL, `CHECK (level IN ('threshold', 'limit'))` |
| `created_at` | `timestamptz` | NOT NULL, `now()`                                   |

- `UNIQUE (user_id, budget_id, month, level)`: es la garantía de no repetición y evita el doble envío si dos gastos cruzan a la vez.
- **RLS activada, definida antes de usarla:** una política `budget_alert_emails_owner_policy FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())`, igual que `transactions`. Se escribe con el cliente del propio usuario, sin clave de servicio.
- `notify_email` ya existe en `user_settings`: sin migración para el interruptor.
- Actualizar `src/types/supabase.ts` a mano en el mismo cambio.

### 4.2 Reserva antes de enviar

Se **inserta la fila primero** y solo se envía si el insert tiene éxito. Si falla por `23505` (ya existe), se omite el envío. Así la unicidad decide quién envía, también ante dos gastos simultáneos. Si el envío falla después, la fila se queda (el cruce ya ocurrió y `detectBudgetAlert` no volvería a dispararse por él).

### 4.3 Envío

- Llamada `fetch` a la API de Resend (`POST https://api.resend.com/emails`), sin añadir dependencias.
- Remitente fijo: `Finanzas Personales <no-reply@terryq.com>` (dominio ya verificado). Destinatario: el email del usuario autenticado.
- Variable de entorno nueva **`RESEND_API_KEY`**: Terry crea una clave de Resend de solo envío, **distinta** de la que usa Supabase para el SMTP, y la añade en Vercel (Production) y en `.env.local`. Si falta, el envío se omite con un aviso en el log, sin error visible.
- Se ejecuta con `after()` de Next.js: la respuesta al usuario no espera al envío.

### 4.4 Contenido del email

- Asunto: `Superaste el límite de {categoría}` / `Vas por el {n}% de tu límite de {categoría}`.
- Cuerpo en texto y HTML con estilos en línea (los clientes de correo no entienden Tailwind ni modo oscuro): categoría, gastado de límite en la moneda base, porcentaje y un enlace a `/presupuestos`.
- `BudgetAlert` gana los campos `spent` y `monthlyLimit` para poder mostrar los importes; `detectBudgetAlert` los rellena.
- Sin imágenes ni enlaces de seguimiento, para ayudar a la entrega. El enlace usa una constante `APP_URL` (hoy `https://finanzas-personales-roan.vercel.app`).

### 4.5 Capas

| Archivo                                         | Tipo             | Responsabilidad                                                             |
| ----------------------------------------------- | ---------------- | --------------------------------------------------------------------------- |
| `src/lib/budget-alerts.ts`                      | Función pura     | Ampliar `BudgetAlert` con `spent` y `monthlyLimit`                          |
| `src/lib/email/budget-alert-email.ts`           | Función pura     | `buildBudgetAlertEmail(alert, currency)` → asunto, texto y HTML             |
| `src/lib/email/send-email.ts`                   | Servidor         | Cliente mínimo de Resend con `fetch` inyectable para tests                  |
| `src/lib/data/budget-alert-emails.ts`           | Datos            | Reservar la clave `(usuario, presupuesto, mes, nivel)`; leer `notify_email` |
| `src/app/(app)/movimientos/actions.ts`          | Server Action    | Tras el toast, lanzar el envío con `after()`                                |
| `src/app/api/settings/notify-email/route.ts`    | Route Handler    | Activar o desactivar `notify_email` (mismo patrón que `savings-rate`)       |
| `src/components/settings/notify-email-form.tsx` | Client Component | Interruptor en Configuración                                                |

El interruptor de Configuración incluye la nota: "Te enviamos un email la primera vez que un presupuesto cruza su umbral o su límite cada mes."

### 4.6 Demo y seguridad

- Usuarios anónimos: nunca se envía.
- Nada del email se construye con texto libre del usuario sin escapar: el nombre de la categoría se escapa en el HTML.
- La clave de Resend solo se lee en el servidor (no lleva `NEXT_PUBLIC_`).

## 5. Tareas atómicas (tras validar la spec)

1. Migración `0029` + `src/types/supabase.ts`. Terry ejecuta el SQL y el `migration repair`.
2. Ampliar `BudgetAlert` y sus tests.
3. `buildBudgetAlertEmail` + tests (asunto y cuerpo de umbral y de límite, escape de HTML).
4. `send-email.ts` + tests con `fetch` simulado (éxito, error de Resend, clave ausente).
5. Capa de datos y reserva de la clave + integración en `createTransaction` con `after()`.
6. Interruptor en Configuración (ruta + formulario).
7. Verificación: `npx tsc --noEmit`, `npm run lint`, `npx vitest run`, `npm run build`.
8. Terry: crea la clave de Resend, la añade en Vercel y en `.env.local`, y prueba (gasto que cruza el umbral, otro que cruza el límite, otro gasto después: sin segundo email; con el interruptor apagado: sin email).

## 6. Fuera de alcance

Importación, edición y recurrentes como disparadores; push; resumen semanal; plantillas con marca o imágenes; reintento de envíos fallidos.

## 7. Documentos del Project a actualizar tras validar

Esta spec y `casos-qa-2026-10.md` (cruce de umbral con email, cruce de límite, sin segundo email en el mismo mes, interruptor apagado, usuario demo, falta de clave).
