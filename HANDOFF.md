# HANDOFF — Finanzas Personales (traspaso a Claude Code)

Actualizado el 2026-10-06 (sesión de Claude Code). Léelo entero antes de tocar nada.

## 1. Proyecto y reglas de trabajo

App web de finanzas personales: Next.js 16 (App Router) + TypeScript estricto + Supabase (Postgres, RLS, RPC) + Tailwind v4 + Vitest. Desplegada en Vercel (`finanzas-personales-roan.vercel.app`); cada `git push` a `main` despliega.

Metodología **SDD (Spec-Driven Development)**, obligatoria:

1. Cero código de implementación sin una spec validada por Terry (`specs/*.md`; el modo demo vive en `docs/demo/`).
2. Todo desarrollo se divide en tareas atómicas.
3. TypeScript estricto: cero `any`, cero `@ts-ignore`, errores manejados de forma exhaustiva, sin placeholders.
4. Tras cada decisión de arquitectura, recordarle a Terry que actualice los documentos del Project "App Finanzas Personales" en claude.ai (specs y `qa/checklist-control-calidad.md`).
5. UI: minimalismo estructural. Tarjetas `bg-card rounded-2xl p-6 shadow-sm` sin bordes, CTAs `rounded-full`, whitespace antes que color, importes en `font-sans` (nunca monoespaciada), gasto en `rose-500`, ingreso en `emerald-600`, todo alineado con Flexbox/Grid, solo tokens semánticos (`bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`; nunca `bg-white`/`text-gray-*` sueltos, para no romper el modo oscuro).

Verificación antes de dar nada por terminado: `npx tsc --noEmit`, `npm run lint`, `npx vitest run` (120 tests en verde a 2026-10-06) y, si tocas rutas, `npm run build` (en local pasa).

Entorno de Terry: Windows + PowerShell, sin Python ni Docker. El CLI de Supabase solo está como devDependency (`npx supabase ...`); `supabase db dump` y `db pull` no funcionan.

**Antes de `git push`**: ejecuta `git fetch` y enseña a Terry la lista de commits pendientes (`git log origin/main..HEAD`). En esta carpeta pueden trabajar dos sesiones de Claude a la vez sobre `main` y ya ocurrió que un push arrastró commits de la otra. Pide confirmación a Terry antes de cada push.

## 2. Reglas de oro sobre la base de datos

- **No uses `supabase db push`.** Las migraciones se aplican pegando el SQL en el SQL Editor de Supabase. Para cambios nuevos: crea el archivo en `supabase/migrations/` y pásale a Terry el SQL para que lo pegue; después él ejecuta `npx supabase migration repair --status applied <número>`. Nunca ejecutes SQL contra producción sin su confirmación.
- Numeración vigente: `0012`–`0021` (dashboard y multi-moneda), `0022`–`0026` (modo demo), `0027` (snapshot documental del esquema, no se ejecuta jamás), `0028` (`transactions.import_key`). La siguiente libre es `0029`.
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
- **Aislamiento entre usuarios** (2026-10-05): comprobado a nivel de RLS con una segunda cuenta; no ve ninguna fila de la cuenta principal en `transactions`, `budgets`, `recurring_rules`, `categories` ni `user_settings`. Solo se probó lectura, no escritura.
- **Importación de extractos de Imagin** (`specs/importacion-extractos.md`, commit `20d8ed6`, `0028`): Movimientos → Importar extracto. Acepta el CSV de la **cuenta** (`Concepto;Fecha;Importe;Saldo`), rechaza el de tarjetas, vista previa con categoría por fila, transferencias a huchas desmarcadas, deduplicación por `import_key`, bloqueada en modo demo. Probada de extremo a extremo con datos reales (importar, reimportar, rechazo de tarjetas). Código en `src/lib/import/`, `src/app/(app)/movimientos/importar/`, `src/components/import/`.
- `supabase/config.toml` generado con `supabase init` (commit `f54e6b7`). Nunca ejecutes `supabase config push`: cambiaría producción.
- SMTP de Resend configurado en Supabase (Authentication → Emails). El remitente es `onboarding@resend.dev`, que solo entrega al correo dueño de la cuenta de Resend; para enviar a otros usuarios hace falta un dominio propio verificado.
- Variables de Vercel `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` existen y están marcadas para Production. `EXCHANGE_RATE_API_KEY`, `RESEND_API_KEY` y `WEB_PUSH_*` aparecen en `.env.example` pero el código aún no las lee.

Los documentos de referencia (checklist QA, specs de otras funciones, decisión de diseño) viven en el Project de claude.ai, **no en este repo**.

## 4. Tareas pendientes, en orden

### Tarea A — Cosas que solo puede hacer Terry

Guíalo paso a paso, sin darlas por hechas:

1. `npx supabase migration repair --status applied 0022 0023 0024 0025 0026 0027` (y `0028` si aún no lo hizo). Comprobar con `npx supabase migration list` que no queda ninguna pendiente.
2. Confirmar que `NEXT_PUBLIC_SUPABASE_URL` en Vercel vale exactamente `https://qlakyhkxamlhelbhlikb.supabase.co`.
3. Revisión visual final en modo claro y oscuro de todas las pantallas (la revisión de código no encontró colores sueltos; falta verlo) y de la pantalla de importación.
4. Probar orientación horizontal en móvil, si la usa.
5. Opcional: prueba de escritura entre cuentas (que la cuenta B no pueda insertar, actualizar ni borrar filas de A).
6. Actualizar el Project: spec de importación, `qa/checklist-control-calidad.md` (aislamiento, boundary en oscuro, demo, importación: reimportar, fila inválida, divisa distinta de la base, demo bloqueada, rechazo de tarjetas) y las reglas de UI con tokens semánticos.

### Tarea B — Decisiones y cabos sueltos del repo

- Sigue sin commitear el borrado de `src/lib/currency-conversion.ts` y `.test.ts`: Terry debe confirmar si es intencionado (la conversión al vuelo del commit `9f9ba91` vive en `user-currencies.ts`) antes de commitearlo o restaurarlo.
- Valorar si el color de texto del filtro de categorías (`filter-bar.tsx`, `text-white` sobre el color de la categoría) necesita calcularse por luminosidad.

### Tarea C — Roadmap (cada punto exige spec antes de código)

1. **Alertas de presupuesto por push/email.** Ya existe `budgets.alert_threshold`. Falta decidir canal (Web Push con `WEB_PUSH_*`, email con Resend) y disparador (al registrar un movimiento o programado). Ojo: con `onboarding@resend.dev` el email solo llegaría a Terry.
2. **Fase 2:** GoCardless Bank Account Data, consentimiento de 90 días, deduplicación (la importación manual de `0028` ya usa `source = 'imported'`).
3. **Fase 3:** multiusuario con políticas RLS abiertas y `MULTI_USER_SIGNUP_ENABLED`. Hoy el registro público está cerrado y la ruta `/signup` ya no existe; habría que reabrirla y ajustar el hook `before user created`.

## 5. Cómo colaborar con Terry

- Responde en español y con texto breve. Cuando te pida construir algo, que quede muy bien trabajado y sea intuitivo, no una respuesta rápida genérica.
- Explícale qué hace cada bloque clave y por qué, pero sin pedirle permiso para cada paso mecánico.
- Antes de `git push` o de cualquier cambio en producción, confírmalo con él. Los commits van con mensajes descriptivos del porqué.
- No te pegará contraseñas ni claves y tú no debes pedírselas ni introducirlas; guíalo para que lo haga él.
- Terry ha preguntado por términos de infraestructura (CSV, Resend, SMTP): explícalos con un ejemplo cuando aparezcan por primera vez.
- Cuando cierres una tarea, indícale qué documento del Project debe actualizar.
