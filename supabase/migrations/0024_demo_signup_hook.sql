-- =============================================================
-- 0024_demo_signup_hook.sql
-- Modo demo (docs/demo/spec.md) — T5: Before User Created Hook.
--
-- T1 confirmó que con "Allow new users to sign up" desactivado los
-- anónimos fallan ("Signups not allowed for this instance"). Hay que
-- activar ese ajuste, y este hook mantiene el registro cerrado en el
-- backend: solo deja pasar altas anónimas; cualquier otra (email,
-- teléfono, OAuth) se rechaza con 403.
--
-- Tras aplicar la migración, activarlo en Dashboard → Authentication →
-- Hooks → Before User Created → Postgres function →
-- public.hook_before_user_created.
-- =============================================================

CREATE FUNCTION public.hook_before_user_created(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF coalesce((event -> 'user' ->> 'is_anonymous')::boolean, false) THEN
    RETURN '{}'::jsonb;
  END IF;

  RETURN jsonb_build_object(
    'error', jsonb_build_object(
      'http_code', 403,
      'message', 'Registro cerrado'
    )
  );
END;
$$;

COMMENT ON FUNCTION public.hook_before_user_created(jsonb) IS
  'Before User Created Hook de Supabase Auth: permite solo altas anónimas (modo demo) y rechaza el resto con 403 "Registro cerrado".';

GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.hook_before_user_created(jsonb) TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.hook_before_user_created(jsonb) FROM authenticated, anon, public;
