-- =============================================================
-- 0025_demo_trigger_order.sql
-- Modo demo — corrección de T4: orden de triggers sobre auth.users.
--
-- Postgres ejecuta los triggers del mismo evento por orden alfabético de
-- nombre. on_anonymous_user_created ("on_an...") corría ANTES que el
-- trigger existente on_auth_user_created ("on_au..."), que crea la fila
-- de user_settings con un INSERT simple: al haberla sembrado ya la demo,
-- fallaba con duplicate key en user_settings_pkey y el alta del usuario
-- anónimo devolvía 500.
--
-- Se renombra el trigger a un nombre que ordena DESPUÉS de
-- on_auth_user_created. seed_demo_data ya hace upsert de user_settings,
-- así que actualiza la fila que haya creado el otro trigger.
-- =============================================================

DROP TRIGGER IF EXISTS on_anonymous_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created_seed_demo
  AFTER INSERT ON auth.users
  FOR EACH ROW
  WHEN (NEW.is_anonymous)
  EXECUTE FUNCTION public.handle_anonymous_user_created();
