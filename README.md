# Finanzas Personales

App de finanzas personales (Next.js App Router · TypeScript · Supabase). Producción: https://finanzas-personales-roan.vercel.app

## Modo demo

Cualquier visitante puede probar la app en un clic desde `/login` con **"Probar la demo"**, sin registrarse y sin ver nunca los datos del propietario.

### Cómo funciona

1. El botón ejecuta la Server Action `startDemo()` (`src/app/login/actions.ts`), que llama a `supabase.auth.signInAnonymously()` y redirige a `/`.
2. Un **Before User Created Hook** (`public.hook_before_user_created`) solo deja crear usuarios anónimos; cualquier alta con email se rechaza con 403 "Registro cerrado". La ruta `/signup` no existe.
3. Al crearse el usuario anónimo, el trigger `on_auth_user_created_seed_demo` llama a `public.seed_demo_data()`, que siembra datos de ejemplo en EUR (3 meses de movimientos, categorías, reglas recurrentes y presupuestos). Las fechas son relativas a `current_date`, y en el mes actual Ocio queda al 85 % de su presupuesto para que salte la alerta.
4. Mientras dura la sesión, el layout privado muestra `<DemoBanner />` (solo si `user.is_anonymous`) con el botón "Salir de la demo".
5. Aislamiento: cada visitante es un usuario distinto y las políticas RLS filtran por `user_id = auth.uid()`; no hay datos compartidos.

### Limpieza

Un job de `pg_cron` (`demo-cleanup`, cada día a las 03:00 UTC) borra los usuarios anónimos con más de 7 días. Sus datos se eliminan por `ON DELETE CASCADE`.

### Ajustes de Auth necesarios (Supabase)

- Authentication → Sign In / Providers: **Allow anonymous sign-ins** activado.
- **Allow new users to sign up** activado (los anónimos cuentan como altas; el hook mantiene el registro cerrado en el backend).
- Authentication → Hooks → **Before User Created** → `public.hook_before_user_created`.
- Authentication → Rate Limits: revisar el límite de inicios de sesión anónimos.
- Database → Extensions: `pg_cron` activado.

### Migraciones

`0022` función de sembrado · `0023` trigger · `0024` hook · `0025` orden del trigger (debe ejecutarse después de `on_auth_user_created`, que crea `user_settings`) · `0026` job de limpieza.

Diseño completo y tareas: `docs/demo/spec.md` y `docs/demo/tasks.md`.

---

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
