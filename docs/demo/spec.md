# Spec — Acceso de prueba (modo demo) · Finanzas Personales

> Estado: **implementado** · Fecha: 2026-10-05 · Autor: Terry (con Claude)
> Repo: `finanzas-personales` · Despliegue: https://finanzas-personales-roan.vercel.app
> Stack: Next.js (App Router) + TypeScript + Supabase (`@supabase/ssr`) + Vercel

---

## 1. Contexto y objetivo

La app es de uso personal y el registro está cerrado. Para enseñarla en el portfolio (clientes y recruiters), cualquier visitante debe poder **probarla en un clic, sin registrarse**, con datos de ejemplo realistas y **sin ninguna posibilidad de ver los datos reales del propietario**.

**Objetivo:** botón "Probar la demo" en el login → el visitante entra en un panel ya lleno de datos de ejemplo de los últimos 3 meses → sus datos se borran solos a los 7 días.

### Fuera de alcance

- Convertir un usuario demo en una cuenta permanente (el registro sigue cerrado).
- Cambios en las funcionalidades existentes de la app.

---

## 2. Estado actual verificado (2026-10-05)

| Aspecto         | Estado                                                                                                                                                                                                                                                                                        |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RLS             | Activado en las 6 tablas públicas                                                                                                                                                                                                                                                             |
| Políticas       | `categories`, `transactions`, `recurring_rules`, `budgets` y `user_settings` filtran por `user_id = auth.uid()`. `categories` permite además leer filas con `user_id IS NULL` (categorías globales). `exchange_rate_snapshots`: solo lectura para `authenticated`; sin políticas de escritura |
| Claves foráneas | Las 5 tablas de usuario hacen `ON DELETE CASCADE` desde `auth.users`. Probado: borrar un usuario con datos funciona sin errores                                                                                                                                                               |
| `user_settings` | Tiene políticas SELECT y UPDATE, pero **ninguna de INSERT**. Probablemente la fila se crea con un trigger sobre `auth.users` (se verifica en T0)                                                                                                                                              |
| Enums           | `transaction_type`: income, expense · `transaction_source`: manual, imported, recurring · `recurring_frequency`: weekly, monthly, yearly · `recurring_status`: active, paused                                                                                                                 |
| Auth            | Registro con email **desactivado** (o pendiente de desactivar) en Supabase. Inicios de sesión anónimos **desactivados**                                                                                                                                                                       |

**Conclusión de seguridad:** con estas políticas, un usuario anónimo (rol `authenticated` con un `auth.uid()` propio) **solo puede ver y modificar sus propias filas** y las categorías globales. Nunca ve los datos del propietario.

---

## 3. Decisiones de diseño

| #   | Decisión                                                                                                                                     | Motivo                                                                                                                                                             |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1  | **Usuarios anónimos de Supabase** (`signInAnonymously`), no una cuenta demo compartida                                                       | Cada visitante tiene su espacio aislado; se reutilizan las políticas RLS existentes sin cambios                                                                    |
| D2  | **Sembrado en base de datos** con un trigger `AFTER INSERT ON auth.users WHEN (NEW.is_anonymous)` que llama a una función `SECURITY DEFINER` | Es atómico (el usuario nunca ve el panel vacío), no depende del cliente y no expone lógica en el frontend                                                          |
| D3  | **Fechas relativas a `current_date`** (mes actual + 2 anteriores)                                                                            | La demo siempre muestra "este mes" con datos, sin mantenimiento                                                                                                    |
| D4  | **Before User Created Hook** que solo permite usuarios anónimos                                                                              | Cierra el registro con email **en el backend** aunque "Allow new users to sign up" tenga que estar activado para que funcionen los anónimos                        |
| D5  | **Limpieza con `pg_cron`** cada noche: borra los anónimos con más de 7 días                                                                  | Gracias al `ON DELETE CASCADE`, sus datos se borran solos                                                                                                          |
| D6  | Captcha (Cloudflare Turnstile) **en fase 2**                                                                                                 | Activarlo en Supabase obliga a enviar token también en el login con contraseña. En v1 se usan los límites de peticiones de Supabase (Authentication → Rate Limits) |
| D7  | Moneda de la demo: **EUR**, tipo de cambio 1                                                                                                 | Público principal en España; evita depender de `exchange_rate_snapshots`                                                                                           |

---

## 4. Arquitectura

```
[Login] ──click "Probar la demo"──▶ Server Action startDemo()
                                     └─ supabase (server, @supabase/ssr).auth.signInAnonymously()
                                            │
                     Supabase Auth ─────────┤ 1. Before User Created Hook → ¿is_anonymous? sí → permitir / no → rechazar
                                            │ 2. INSERT auth.users
                                            │ 3. Trigger on_anonymous_user_created → public.seed_demo_data(NEW.id)
                                            ▼
                                     redirect('/dashboard')  ── layout detecta user.is_anonymous ──▶ <DemoBanner/>

[pg_cron 03:00 UTC] ── delete from auth.users where is_anonymous and created_at < now() - 7 days ──▶ CASCADE
```

### Organización de archivos (adaptar a la estructura real del repo)

| Archivo                                           | Responsabilidad                                                             |
| ------------------------------------------------- | --------------------------------------------------------------------------- |
| `supabase/migrations/<timestamp>_demo_access.sql` | Función de sembrado, trigger, función del hook, permisos y job de `pg_cron` |
| `app/(auth)/login/actions.ts`                     | Server Action `startDemo()`                                                 |
| `app/(auth)/login/demo-button.tsx`                | Botón con estado de carga (`'use client'` solo si necesita `useFormStatus`) |
| `components/demo/demo-banner.tsx`                 | Banner de modo demo (Server Component)                                      |
| Layout de la zona privada                         | Muestra `<DemoBanner/>` si `user.is_anonymous`                              |

---

## 5. Datos de ejemplo (contenido de `seed_demo_data`)

Todas las fechas se calculan desde `current_date`. Importes en EUR (`amount_original = amount_base`, `exchange_rate_used = 1`).

**`user_settings`** (upsert, por si ya la crea otro trigger): `base_currency = 'EUR'`, `savings_rate_target` = 20 % (unidad a confirmar en T0: `0.20` o `20`).

**`categories`** (propias del usuario; si existen categorías globales con `user_id IS NULL`, decidir en T0 si se reutilizan):

| Nombre        | Esencial | Uso                 |
| ------------- | -------- | ------------------- |
| Nómina        | no       | ingreso             |
| Vivienda      | sí       | alquiler            |
| Supermercado  | sí       | compras             |
| Transporte    | sí       | abono, gasolina     |
| Salud         | sí       | farmacia            |
| Restaurantes  | no       | comidas fuera       |
| Ocio          | no       | fines de semana     |
| Suscripciones | no       | streaming, gimnasio |

`color` e `icon`: usar los mismos formatos que ya usa la app (se verifica en T0).

**`recurring_rules`** (`status = active`, `next_due_date` = próxima ocurrencia):

| Descripción | Tipo    | Importe  | Frecuencia       |
| ----------- | ------- | -------- | ---------------- |
| Nómina      | income  | 1.850,00 | monthly (día 1)  |
| Alquiler    | expense | 750,00   | monthly (día 3)  |
| Spotify     | expense | 10,99    | monthly (día 12) |
| Gimnasio    | expense | 34,90    | monthly (día 5)  |

**`transactions`** (3 meses: el actual hasta hoy y los 2 anteriores completos):

- Cada mes: las 4 recurrentes (`source = recurring`, con `recurring_rule_id`).
- Por semana: 1–2 compras de supermercado (35–90 €) y 1 de transporte (15–45 €).
- Fines de semana: 1–2 gastos de Ocio o Restaurantes (12–60 €).
- 1 gasto de Salud al mes (8–30 €).
- Los importes siguen un patrón fijo (arrays de valores), no aleatorio, para que la demo sea reproducible.
- **Mes actual:** Ocio debe quedar en ~85 % de su presupuesto, para que **salte la alerta**.

**`budgets`** (EUR): Ocio 150 € (umbral de alerta 80 %), Restaurantes 120 € (umbral 80 %), Supermercado 350 € (umbral 90 %). Unidad de `alert_threshold` a confirmar en T0.

---

## 6. Requisitos

### Funcionales

- **RF1** El login muestra un botón secundario "Probar la demo" con un texto de apoyo: "Sin registro · datos de ejemplo".
- **RF2** Al pulsarlo, el visitante entra en el panel en menos de 3 s y ve datos de los últimos 3 meses.
- **RF3** Durante toda la sesión demo se muestra un banner: "Modo demo · Estás viendo datos de ejemplo. Se borran automáticamente en 7 días." con el botón "Salir de la demo" (cierra sesión y vuelve al login).
- **RF4** El visitante puede usar todas las funciones (añadir movimientos, cambiar tema, moneda, presupuestos…) sobre sus propios datos.
- **RF5** Un registro con email (vía API) es **rechazado** con el mensaje "Registro cerrado".
- **RF6** Los usuarios anónimos con más de 7 días y todos sus datos se borran automáticamente cada noche.

### No funcionales

- **RNF1 Seguridad:** un usuario anónimo nunca puede leer ni modificar filas de otro usuario. Las funciones `SECURITY DEFINER` usan `set search_path = ''` y nombres totalmente cualificados. La función del hook solo la puede ejecutar `supabase_auth_admin`.
- **RNF2 TypeScript estricto:** cero `any` y cero `@ts-ignore`. Si se añade algo consumible desde el cliente, regenerar los tipos (`supabase gen types`).
- **RNF3 RSC primero:** el banner y el layout son Server Components; `'use client'` solo en el botón si necesita estado de envío.
- **RNF4 Accesibilidad:** el botón y el banner se pueden usar con teclado, contraste AA y el banner con `role="status"`.
- **RNF5 Sin regresiones:** el login con contraseña del propietario sigue funcionando igual.

---

## 7. Criterios de aceptación

| #   | Dado / Cuando / Entonces                                                                                                                         |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| CA1 | Dado el login, cuando pulso "Probar la demo", entonces llego al panel con movimientos de 3 meses y el banner visible                             |
| CA2 | Dado un usuario demo, cuando consulto `transactions` sin filtros desde el cliente, entonces solo recibo mis filas (0 filas de otros usuarios)    |
| CA3 | Dado el mes actual en la demo, cuando abro presupuestos, entonces Ocio muestra la alerta de umbral superado                                      |
| CA4 | Dado cualquier visitante, cuando llama a `signUp` con email y contraseña, entonces recibe un error y no se crea ningún usuario                   |
| CA5 | Dado un usuario anónimo con `created_at` de hace 8 días, cuando se ejecuta el job de limpieza, entonces el usuario y todas sus filas desaparecen |
| CA6 | Dado el propietario, cuando inicia sesión con su contraseña, entonces todo funciona como antes y no ve el banner                                 |
| CA7 | Dado "Salir de la demo", cuando lo pulso, entonces se cierra la sesión y vuelvo al login                                                         |

---

## 8. Riesgos y mitigaciones

| Riesgo                                                                           | Mitigación                                                                                                                                            |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Abuso: creación masiva de usuarios anónimos                                      | Límite de peticiones de Supabase para anónimos; limpieza a los 7 días; captcha en fase 2                                                              |
| El trigger de sembrado falla y bloquea la creación del usuario                   | Probar la función de forma aislada antes de enlazar el trigger (T3); el error se ve en los logs de Auth                                               |
| Orden de triggers sobre `auth.users` (si ya existe uno que crea `user_settings`) | El sembrado hace upsert de `user_settings`; los triggers del mismo evento se ejecutan en orden alfabético por nombre                                  |
| El hook bloquea por error al propietario                                         | El propietario ya existe (el hook solo actúa al **crear** usuarios); los usuarios nuevos se crean desde el panel de Supabase con la clave de servicio |
| `pg_cron` no activado                                                            | Activarlo en Database → Extensions (disponible en el plan gratuito)                                                                                   |

---

## 9. Referencias

- Supabase — Anonymous Sign-Ins: https://supabase.com/docs/guides/auth/auth-anonymous
- Supabase — Before User Created Hook: https://supabase.com/docs/guides/auth/auth-hooks/before-user-created-hook
- Supabase — pg_cron: https://supabase.com/docs/guides/database/extensions/pg_cron
