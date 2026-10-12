# HANDOFF — Finanzas Personales (traspaso a Claude Code)

Actualizado el 2026-10-12, con las categorías sugeridas y el borrado masivo ya probados (sesión de Claude Code). Léelo entero antes de tocar nada.

## 1. Proyecto y reglas de trabajo

App web de finanzas personales: Next.js 16 (App Router) + TypeScript estricto + Supabase (Postgres, RLS, RPC) + Tailwind v4 + Vitest. Desplegada en Vercel (`finanzas-personales-roan.vercel.app`); cada `git push` a `main` despliega.

Metodología **SDD (Spec-Driven Development)**, obligatoria:

1. Cero código de implementación sin una spec validada por Terry (`specs/*.md`; el modo demo vive en `docs/demo/`).
2. Todo desarrollo se divide en tareas atómicas.
3. TypeScript estricto: cero `any`, cero `@ts-ignore`, errores manejados de forma exhaustiva, sin placeholders.
4. Tras cada decisión de arquitectura, recordarle a Terry que actualice los documentos del Project "App Finanzas Personales" en claude.ai (specs y `qa/checklist-control-calidad.md`).
5. UI: minimalismo estructural. Tarjetas `bg-card rounded-2xl p-6 shadow-sm` sin bordes, CTAs `rounded-full`, whitespace antes que color, importes en `font-sans` (nunca monoespaciada), gasto en `rose-500`, ingreso en `emerald-600`, todo alineado con Flexbox/Grid, solo tokens semánticos (`bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`; nunca `bg-white`/`text-gray-*` sueltos, para no romper el modo oscuro).

Verificación antes de dar nada por terminado: `npx tsc --noEmit`, `npm run lint`, `npx vitest run` (220 tests en verde a 2026-10-12) y, si tocas rutas, `npm run build` (en local pasa).

Entorno de Terry: Windows + PowerShell, sin Python ni Docker. El CLI de Supabase solo está como devDependency (`npx supabase ...`); `supabase db dump` y `db pull` no funcionan.

**Antes de `git push`**: ejecuta `git fetch` y enseña a Terry la lista de commits pendientes (`git log origin/main..HEAD`). En esta carpeta pueden trabajar dos sesiones de Claude a la vez sobre `main` y ya ocurrió que un push arrastró commits de la otra. Pide confirmación a Terry antes de cada push.

## 2. Reglas de oro sobre la base de datos

- **No uses `supabase db push`.** Las migraciones se aplican pegando el SQL en el SQL Editor de Supabase. Para cambios nuevos: crea el archivo en `supabase/migrations/` y pásale a Terry el SQL para que lo pegue; después él ejecuta `npx supabase migration repair --status applied <número>`. Nunca ejecutes SQL contra producción sin su confirmación.
- Numeración vigente: `0012`–`0021` (dashboard y multi-moneda), `0022`–`0026` (modo demo), `0027` (snapshot documental del esquema, no se ejecuta jamás), `0028` (`transactions.import_key`), `0029` (`budget_alert_emails`, renombrada en la `0030`), `0030` (`budget_alert_notifications` con `channel` + `push_subscriptions`). La siguiente libre es `0031`.
- Las migraciones `0001`–`0011` existen como archivo en `src/lib/supabase/migrations/` (carpeta fuera de la que lee la CLI; decisión de Terry: se quedan ahí). `0027` es la referencia verificada contra producción.
- Los tipos se generan a mano en `src/types/supabase.ts`; al cambiar una función o tabla, actualízalo en el mismo cambio.
- Todas las RPC del Dashboard reciben `p_rates jsonb` (mapa moneda→tasa hacia la moneda base) y convierten al vuelo. Ver `specs/conversion-moneda-base-al-vuelo.md` (vive en el Project).
- Si cambias una función con distinta firma o columnas de retorno: `DROP FUNCTION` + `CREATE FUNCTION`, no `CREATE OR REPLACE` (error 42P13).
- El editor SQL de Supabase da una falsa alarma de RLS si el texto contiene `CREATE TABLE public.`, aunque sea dentro de un string. En consultas de solo lectura elige "Run without RLS".
- Una clave foránea no comprueba la propiedad: si una acción recibe un `category_id` del cliente, verifica que sea visible para el usuario (RLS) antes de insertar (ver `confirmImport`).

## 3. Estado actual

Hecho y verificado en producción por Terry:

- Smoke test completo (Auth, Movimientos, Categorías, Presupuestos, Gastos Fijos, Recordatorios, Dashboard, Configuración, multi-moneda, error optimista).
- Multi-moneda por conversión al vuelo (`0020`, `0021`; `src/lib/data/user-currencies.ts`).
- Error boundaries `src/app/(app)/error.tsx`, `src/app/error.tsx`, `src/app/global-error.tsx` (probado `(app)` en oscuro; los otros dos revisados solo por código).
- **Modo demo** (`docs/demo/spec.md`, migraciones `0022`–`0026`): usuarios anónimos con datos sembrados, banner, limpieza programada. El registro público está cerrado: la ruta `/signup` se eliminó y un hook `before user created` solo deja pasar altas anónimas. `config.toml` tiene `enable_anonymous_sign_ins = true` por esto.
- **Aislamiento entre usuarios** (2026-10-05): comprobado a nivel de RLS con una segunda cuenta; no ve ninguna fila de la cuenta principal en `transactions`, `budgets`, `recurring_rules`, `categories` ni `user_settings`. Además, el 2026-10-12 se probó la **escritura**: la cuenta B no pudo modificar ni borrar filas de A en `transactions`, `budgets`, `recurring_rules`, `categories`, `user_settings`, `push_subscriptions` ni `budget_alert_notifications` (0 filas afectadas, con datos reales en A), ni tocar las categorías globales, y los `INSERT` a nombre de A (movimientos, categorías, categoría global y suscripción push) quedaron bloqueados por RLS. La prueba fue un bloque SQL que simula a B con `SET LOCAL ROLE authenticated` y termina con un error intencionado para que nada se guarde; si se cambia el esquema de RLS conviene repetirla.
- **Importación de extractos de Imagin** (`specs/importacion-extractos.md`, commit `20d8ed6`, `0028`): Movimientos → Importar extracto. Acepta el CSV de la **cuenta** (`Concepto;Fecha;Importe;Saldo`), rechaza el de tarjetas, vista previa con categoría por fila, transferencias a huchas desmarcadas, deduplicación por `import_key`, bloqueada en modo demo. Probada de extremo a extremo con datos reales (importar, reimportar, rechazo de tarjetas). Código en `src/lib/import/`, `src/app/(app)/movimientos/importar/`, `src/components/import/`.
- `supabase/config.toml` generado con `supabase init` (commit `f54e6b7`). Nunca ejecutes `supabase config push`: cambiaría producción.
- **Aviso de presupuesto al registrar un gasto** (`specs/alertas-presupuesto.md`, commit `b1668f9`, sin migración): `createTransaction` devuelve `budgetAlert` si el gasto cruza el umbral o el límite de su categoría en el mes en curso, y el diálogo lo muestra como toast. Código en `src/lib/budget-alerts.ts` y `src/lib/data/budget-alerts.ts`. Los indicadores permanentes ya existían en Presupuestos y Dashboard. Probado por Terry en producción.
- **Aviso de presupuesto por email** (`specs/alertas-presupuesto-email.md`, commit `563c3ce`, migración `0029`): al cruzar un nivel se envía además un email por Resend (`fetch` a la API, sin dependencias), como mucho **uno por usuario, presupuesto, mes y nivel**. La reserva es una fila en `budget_alert_notifications` (UNIQUE por usuario, presupuesto, mes, nivel y canal; RLS), insertada antes de enviar; solo la llamada de red va en `after()`. No se envía a usuarios demo, sin email o con `user_settings.notify_email = false`; el interruptor está en Configuración (`/api/settings/notify-email`). El envío es secundario: si falla o falta `RESEND_API_KEY`, el gasto y el toast no se ven afectados y solo hay una línea `[budget-alert-email]` en los logs de Vercel. Código en `src/lib/email/` y `src/lib/data/budget-alert-notifications.ts`; el encolado de ambos canales vive en `src/lib/data/queue-budget-alert-notifications.ts`. Probado por Terry en producción.
- **Avisos también al editar** (`specs/alertas-presupuesto-edicion.md`, commit `bdf2f5b`, sin migración): `updateTransaction` lee el gasto antes de modificarlo y avisa por el **aumento neto** en la categoría resultante (`computeBudgetIncrease` en `src/lib/budget-alerts.ts`; creación y edición comparten `getBudgetAlertForChange`). Bajar, no cambiar, sacar el gasto del mes en curso o volverlo ingreso nunca avisa. El toast no tiene memoria; el email mantiene su límite de uno por nivel y mes. La edición no cambia la moneda original del gasto (el `update` la ignora). Terry validó la spec; los casos del archivo de QA de edición están pendientes de marcar.
- **Notificaciones push** (`specs/alertas-presupuesto-push.md`, commit `ca40461`, migración `0030`): al cruzar un nivel, además del toast y el email, se envía una push a los dispositivos suscritos del usuario (librería `web-push`, claves VAPID). Misma regla de no repetición que el email pero **por canal** (`channel` en `budget_alert_notifications`), así que desactivar uno no bloquea el otro. Se activa **por dispositivo** en Configuración → Notificaciones push (`push-notifications-form.tsx`, rutas `/api/push/subscribe` y `/api/push/unsubscribe`, tabla `push_subscriptions` con RLS). `user_settings.notify_push` es un interruptor global (sin UI). Las suscripciones caducadas (404/410) se borran solas; si otra cuenta se suscribe desde el mismo navegador, la suscripción anterior se borra con el cliente admin (privacidad). La notificación no lleva importes. No se envía a usuarios de la demo (la demo sigue abierta para visitantes). Código en `src/lib/push/`, `src/lib/data/push-subscriptions.ts` y `public/sw.js`. Limitación conocida: cerrar sesión no borra la suscripción del dispositivo (se quita desde Configuración con Desactivar). Probado por Terry en producción.
- **PWA instalable:** `src/app/manifest.ts`, `public/sw.js` (solo push y clic en la notificación; sin caché ni `fetch`) e iconos derivados del logo de Terry (cartera con gráfico, blanco sobre verde `#266260`) en `public/icons/` (192, 512, maskable y `apple-touch-icon`). En iPhone las push solo funcionan con la web añadida a la pantalla de inicio y abierta desde ese icono; si Safari muestra una "F" genérica, es caché: usar una pestaña privada. El filtro de autenticación (`src/middleware.ts`) ya deja pasar cualquier ruta con extensión, por eso `/sw.js`, el manifiesto y los `.png` no piden sesión.
- **Categorías sugeridas al importar** (`specs/importacion-categorias-automaticas.md`, commit `ec3caf3`, sin migración): la vista previa de la importación preselecciona la categoría que Terry ya usó para el mismo concepto normalizado **y el mismo tipo** (gasto o ingreso): la más usada, y en empate la más reciente. Aprende sola del historial (sus últimos 5000 movimientos, `getCategoryHistory`), sin tabla de reglas. Solo es una sugerencia editable; se etiqueta únicamente si difiere de la categoría por defecto ("Otros"/"Ingresos"); si el historial no se puede leer, la vista previa sale con las categorías por defecto. Código en `src/lib/import/suggest-categories.ts` y `import-flow.tsx`. Una posible mejora futura es una tabla de reglas explícitas por patrón (descartada por ahora). Probado por Terry.
- **Borrado masivo de movimientos** (`specs/borrado-masivo-movimientos.md`, commit `9bdace9`, sin migración): en Movimientos hay un modo **Seleccionar** (casillas, barra de acciones por encima de la barra flotante en móvil, máximo 500, la selección se vacía al cambiar de página o filtro porque la página remonta la lista con una `key`) y un diálogo **Borrar por fechas** en dos pasos (periodo y confirmación con el recuento; casilla opcional "solo los importados"). Un único botón de confirmar, sin palabra de seguridad (decisión de Terry). Un único `DELETE` por operación y el servidor revalida el rango (`transaction-bulk.ts`). Ambos ofrecen, sin obligar, **descargar una copia en CSV** (`;`, BOM, coma decimal y apóstrofe delante de `=`, `+`, `-`, `@` contra fórmulas de Excel): la de la selección se genera en el navegador y la del rango en `GET /api/transactions/export` (tope de 20 000 filas). No hay papelera ni deshacer. Si una página queda vacía tras borrar, se vuelve a la primera conservando los filtros. Código en `src/lib/export/`, `src/lib/data/export-transactions.ts`, `delete-selected-dialog.tsx` y `delete-range-dialog.tsx`. Probado por Terry en producción (selección, borrado por fechas, casilla de importados, copia en CSV abierta en Excel, reimportar tras borrar, Dashboard actualizado, modo oscuro y móvil); sin probar aún: periodo vacío, borrar la última fila de una página y la copia con red cortada. Casos en `qa/casos-qa-borrado-masivo.md`.
- **Doble toque en la barra inferior** (`specs/scroll-al-inicio-barra-inferior.md`, commit `ed83a7b`): en móvil, dos toques seguidos (menos de 300 ms, marca de tiempo propia porque `event.detail` no es fiable en Safari iOS) en cualquier icono suben al principio de la página. `src/lib/scroll.ts` y `app-bottom-nav.tsx`. Probado por Terry.
- **Correo propio:** dominio `terryq.com` (Cloudflare) verificado en Resend (región Irlanda), con DMARC. SMTP de Resend en Supabase (Authentication → Emails) con remitente `Finanzas Personales <no-reply@terryq.com>`; verificado con un correo de recuperación a Terry y a otra cuenta (llega, al principio a spam por ser un dominio nuevo). `contacto@terryq.com` es solo para recibir (Email Routing de Cloudflare); no se usa para enviar. Los avisos de presupuesto usan **otra clave de Resend, de solo envío**, guardada como `RESEND_API_KEY` secreta (Sensitive) en Vercel para Production y Preview; la clave del SMTP de Supabase es distinta.
- Variables de Vercel `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` y `RESEND_API_KEY` existen y están marcadas para Production. `NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY` (tipo Config, porque el navegador la necesita) y `WEB_PUSH_PRIVATE_KEY` (Secret) también están en Vercel; son un par generado con `npx web-push generate-vapid-keys` y siempre deben cambiarse juntas (si no coinciden, el servicio de push rechaza los envíos). `EXCHANGE_RATE_API_KEY` aparece en `.env.example` pero el código aún no la lee. `APP_URL` (enlaces de los emails) y `EMAIL_FROM` son constantes en `src/lib/email/config.ts`: cámbialas si se usa un dominio propio para la app.

Los documentos de referencia (checklist QA, specs de otras funciones, decisión de diseño) viven en el Project de claude.ai, **no en este repo**.

## 4. Tareas pendientes, en orden

### Tarea A — Cosas que solo puede hacer Terry

Guíalo paso a paso, sin darlas por hechas:

Hechos por Terry (2026-10-06 a 2026-10-09): el `migration repair` de `0022`–`0030`, el valor de `NEXT_PUBLIC_SUPABASE_URL` en Vercel, la revisión visual de las pantallas, la orientación horizontal en móvil, el registro DMARC de `terryq.com`, la comprobación de que el correo llega a otra cuenta (cae en spam al principio), las variables VAPID en Vercel, la activación de las notificaciones en su iPhone y la prueba de que llegan, y la prueba del doble toque. Quedan:

1. Subir al Project (carpeta `specs`) las specs `alertas-presupuesto-email.md`, `alertas-presupuesto-edicion.md`, `alertas-presupuesto-push.md`, `scroll-al-inicio-barra-inferior.md`, `importacion-categorias-automaticas.md` y `borrado-masivo-movimientos.md`, y los casos de QA nuevos (avisos por email y al editar, push, doble toque, categorías sugeridas y borrado masivo) en `qa/`. Ya subidos: `casos-qa-categorias.md` y `casos-qa-borrado-masivo.md`.
2. Marcar como probados los casos `[ ]` de los archivos de QA que aún no se hayan ejecutado (fila inválida en el CSV, divisa distinta de la base, gasto de un mes pasado sin aviso, avisos al editar, usuario demo sin avisos, falta de claves).
3. Confirmar que las reglas de UI del Project dicen tokens semánticos y no `bg-white`/`text-slate-900`.

### Tarea B — Cabos sueltos del repo

- Valorar si el color de texto del filtro de categorías (`filter-bar.tsx`, `text-white` sobre el color de la categoría) necesita calcularse por luminosidad.

### Tarea C — Roadmap

Las alertas de presupuesto (toast, email, edición y push) están completas. Decisiones de Terry (2026-10-07):

- **Fase 2 (GoCardless / conexión bancaria directa): descartada.** No quiere asumir trámites ni costes; la importación manual del extracto de Imagin cubre la necesidad. No proponerla de nuevo salvo que él la pida.
- **Fase 3 (multiusuario): aplazada.** Hoy el registro público está cerrado y la ruta `/signup` ya no existe; reabrirla exigiría ajustar el hook `before user created`, los límites de correo y revisar las políticas RLS. La demo anónima sigue abierta para visitantes y debe seguir así.
- Posibles disparadores de alertas aún fuera de alcance: importación de extractos y movimientos recurrentes.
- Cualquier trabajo nuevo exige spec validada antes de código.

## 5. Cómo colaborar con Terry

- Responde en español y con texto breve. Cuando te pida construir algo, que quede muy bien trabajado y sea intuitivo, no una respuesta rápida genérica.
- Explícale qué hace cada bloque clave y por qué, pero sin pedirle permiso para cada paso mecánico.
- Antes de `git push` o de cualquier cambio en producción, confírmalo con él. Los commits van con mensajes descriptivos del porqué.
- No te pegará contraseñas ni claves y tú no debes pedírselas ni introducirlas; guíalo para que lo haga él.
- Terry ha preguntado por términos de infraestructura (CSV, Resend, SMTP): explícalos con un ejemplo cuando aparezcan por primera vez.
- Cuando cierres una tarea, indícale qué documento del Project debe actualizar.
