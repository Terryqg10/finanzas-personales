# Tasks — Acceso de prueba (modo demo)

> Se ejecutan **en orden**. Cada tarea es atómica: se implementa, se verifica su criterio y se hace commit antes de pasar a la siguiente.
> Referencia: `spec.md` (mismo directorio).

---

## Fase 0 · Verificación previa (sin cambios en producción)

### T0 — Verificar datos que faltan para el sembrado

Ejecutar en SQL Editor y anotar los resultados en `spec.md` §5:

1. ¿Hay categorías globales? → `select name, color, icon from public.categories where user_id is null;`
2. Formato de `color` e `icon` y unidades → `select color, icon from public.categories limit 5;` · `select alert_threshold from public.budgets limit 5;` · `select savings_rate_target from public.user_settings limit 5;`
3. Triggers existentes sobre `auth.users` → `select tgname, p.proname from pg_trigger t join pg_proc p on p.oid = t.tgfoid where tgrelid = 'auth.users'::regclass and not tgisinternal;`
4. Longitud de las columnas de moneda (`character(3)`) → `select table_name, column_name, character_maximum_length from information_schema.columns where table_schema='public' and column_name like '%currency%';`

**Hecho cuando:** las cuatro respuestas están anotadas en el spec y las decisiones de §5 confirmadas.

### T1 — Comprobar si los anónimos funcionan con el registro cerrado

1. Con "Allow new users to sign up" **desactivado**, activar temporalmente "Allow anonymous sign-ins".
2. Probar `signInAnonymously()` desde una página local de pruebas o la consola del navegador en `localhost`.
3. Anotar el resultado: ¿funciona o devuelve "Signups not allowed"?
4. Volver a desactivar los anónimos.

**Hecho cuando:** sabemos si hace falta el hook (T5). Si los anónimos funcionan con el registro cerrado, T5 pasa a ser opcional.

---

## Fase 1 · Base de datos (migración `<timestamp>_demo_access.sql`)

### T2 — Función `public.seed_demo_data(p_user_id uuid)`

- `SECURITY DEFINER`, `set search_path = ''`, nombres cualificados (`public.categories`…).
- Inserta, en este orden: `user_settings` (upsert) → `categories` → `recurring_rules` → `transactions` → `budgets`, según `spec.md` §5.
- Fechas relativas a `current_date`; importes con patrón fijo.
- `revoke execute ... from public, anon, authenticated` (solo la usa el trigger).

**Hecho cuando:** la migración se aplica sin errores.

### T3 — Probar la función de forma aislada

1. Crear un usuario de prueba desde Authentication → Add user.
2. `select public.seed_demo_data('<uuid del usuario>');`
3. Entrar en la app con ese usuario y revisar el panel: 3 meses de datos y la alerta de Ocio activa.
4. Borrar el usuario y comprobar que sus datos desaparecen.

**Hecho cuando:** CA3 se cumple con el usuario de prueba.

### T4 — Trigger `on_anonymous_user_created`

- `AFTER INSERT ON auth.users FOR EACH ROW WHEN (NEW.is_anonymous)` → llama a `seed_demo_data(NEW.id)`.
- Revisar su orden respecto al trigger existente (resultado de T0.3).

**Hecho cuando:** la migración se aplica y crear un usuario normal desde el panel **no** siembra datos.

### T5 — Before User Created Hook (si T1 lo hace necesario)

- Función `public.hook_before_user_created(event jsonb) returns jsonb`.
- Si `event->'user'->>'is_anonymous'` es `true` → devuelve `'{}'::jsonb` (permite).
- Si no → devuelve un error 403 con el mensaje "Registro cerrado".
- `grant execute ... to supabase_auth_admin`; `revoke ... from authenticated, anon, public`.
- Activarlo en Dashboard → Authentication → Hooks → Before User Created.

**Hecho cuando:** CA4 se cumple (un `signUp` con email da error).

### T6 — Job de limpieza con `pg_cron`

- Activar la extensión `pg_cron` si no lo está.
- Programar `demo-cleanup` cada día a las 03:00 UTC: borra de `auth.users` los usuarios con `is_anonymous` y `created_at < now() - interval '7 days'`.

**Hecho cuando:** CA5 se cumple. Para probarlo: crear un anónimo, cambiar su `created_at` a hace 8 días y ejecutar el comando del job a mano.

---

## Fase 2 · Frontend

### T7 — Server Action `startDemo()`

- En `app/(auth)/login/actions.ts`, con el cliente **de servidor** (`@supabase/ssr`).
- Llama a `signInAnonymously()`; si hay error, devuelve un estado con un mensaje legible ("No se pudo iniciar la demo, inténtalo de nuevo"); si va bien, `redirect('/dashboard')`.
- Tipado estricto del estado devuelto (sin `any`).

**Hecho cuando:** la acción funciona en local y los errores se muestran en la UI.

### T8 — Botón "Probar la demo" en el login

- Botón secundario bajo el formulario, separado por un divisor "o".
- Texto de apoyo: "Sin registro · datos de ejemplo".
- Estado de carga mientras se envía (deshabilitado y texto "Preparando la demo…").

**Hecho cuando:** CA1 se cumple en escritorio y en móvil, y el botón se usa con teclado.

### T9 — `<DemoBanner/>`

- Server Component en el layout de la zona privada; solo se renderiza si `user.is_anonymous`.
- Texto según RF3 y botón "Salir de la demo" (Server Action de `signOut` + redirect a `/login`).
- `role="status"`, contraste AA, compacto (una línea en escritorio).

**Hecho cuando:** CA6 y CA7 se cumplen.

---

## Fase 3 · Activación y QA

### T10 — Activar en producción

1. Aplicar las migraciones en producción.
2. Ajustes de Auth: activar "Allow anonymous sign-ins"; "Allow new users to sign up" según T1 (activado solo si el hook de T5 está funcionando).
3. Revisar en Authentication → Rate Limits el límite de inicios anónimos.
4. Desplegar el frontend en Vercel.

### T11 — QA final

- [x] CA1–CA7 verificados (CA1 y CA6 en producción; CA2 por SQL con RLS simulado; CA3 y CA7 en local; CA4 y CA5 en la base de datos).
- [x] Prueba de seguridad CA2: simulando al anónimo (`set local role authenticated` + claims) sobre las 5 tablas de usuario: 0 filas ajenas en todas (transactions 51 de 319, budgets 3 de 19, recurring_rules 4 de 27, user_settings 1 de 9, categories propias 8 de 53).
- [x] Login del propietario sin cambios (CA6).
- [x] Botón y banner revisados en móvil, con teclado y en tema claro y oscuro.
- [x] Sin `any` ni `@ts-ignore`; `tsc --noEmit` y lint en verde.
- [x] Sin enlaces muertos: "Salir de la demo" va a `/login`, `/signup` se eliminó y el "logo" es solo texto (no es un enlace).

### T12 — Documentación

- Actualizar el README de la app: sección "Modo demo" (cómo funciona, limpieza, ajustes de Auth).
- Anotar en el doc del portfolio (`docs/00-fase-0-descubrimiento.md`) que la app ya tiene acceso de prueba.

---

## Fase 4 (opcional, más adelante)

- **T13** — Captcha con Cloudflare Turnstile: activarlo en Supabase (Attack Protection) y añadir el widget **al botón de demo y al login con contraseña**.
