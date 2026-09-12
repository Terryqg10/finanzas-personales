-- =============================================================
-- 0008_create_user_settings.sql
-- Fase 2, Tarea 2.7 — Configuración por usuario
-- =============================================================

CREATE TABLE public.user_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  base_currency text NOT NULL DEFAULT 'EUR' CHECK (base_currency ~ '^[A-Z]{3}$'),
  theme_preference text NOT NULL DEFAULT 'system' CHECK (theme_preference IN ('light', 'dark', 'system')),
  notify_push boolean NOT NULL DEFAULT true,
  notify_email boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.user_settings IS
  'Configuración personal de cada usuario. Se crea automáticamente al registrarse (ver trigger on_auth_user_created).';
COMMENT ON COLUMN public.user_settings.theme_preference IS
  '"system" sigue la preferencia del sistema operativo hasta que el usuario elija explícitamente claro u oscuro.';

CREATE TRIGGER set_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_settings (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();