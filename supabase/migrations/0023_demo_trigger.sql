-- =============================================================
-- 0023_demo_trigger.sql
-- Modo demo (docs/demo/spec.md) — T4: trigger de sembrado.
--
-- Al crearse un usuario anónimo en auth.users se siembran sus datos de
-- ejemplo. La condición WHEN (NEW.is_anonymous) se evalúa en Postgres
-- antes de ejecutar nada: los usuarios normales (el propietario, altas
-- desde el panel) no disparan la función ni reciben datos.
--
-- Es AFTER INSERT para que la fila ya exista cuando las tablas de usuario
-- (FK a auth.users) reciben sus filas. Si el sembrado falla, falla el
-- alta del usuario (atómico): el visitante nunca ve un panel vacío.
-- =============================================================

CREATE FUNCTION public.handle_anonymous_user_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM public.seed_demo_data(NEW.id);
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_anonymous_user_created() IS
  'Función disparadora de on_anonymous_user_created: siembra los datos de la demo para el usuario anónimo recién creado.';

REVOKE EXECUTE ON FUNCTION public.handle_anonymous_user_created() FROM public, anon, authenticated;

CREATE TRIGGER on_anonymous_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  WHEN (NEW.is_anonymous)
  EXECUTE FUNCTION public.handle_anonymous_user_created();
