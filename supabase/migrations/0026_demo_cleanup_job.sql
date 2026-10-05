-- =============================================================
-- 0026_demo_cleanup_job.sql
-- Modo demo (docs/demo/spec.md) — T6: limpieza con pg_cron.
--
-- Cada día a las 03:00 UTC borra los usuarios anónimos con más de 7 días.
-- Las tablas de usuario hacen ON DELETE CASCADE desde auth.users, así que
-- sus datos desaparecen con ellos. Solo afecta a is_anonymous = true: las
-- cuentas reales no se tocan.
-- =============================================================

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- Idempotente: si el job ya existía, se reprograma.
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'demo-cleanup';

SELECT cron.schedule(
  'demo-cleanup',
  '0 3 * * *',
  $job$
    DELETE FROM auth.users
    WHERE is_anonymous
      AND created_at < now() - interval '7 days'
  $job$
);
