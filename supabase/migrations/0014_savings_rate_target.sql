-- =============================================================
-- 0014_savings_rate_target.sql
-- Fase 12, Tarea 12.2 — Objetivo de ahorro configurable por usuario
-- =============================================================

ALTER TABLE public.user_settings
  ADD COLUMN savings_rate_target numeric(5, 2) NOT NULL DEFAULT 20
    CHECK (savings_rate_target >= 0 AND savings_rate_target <= 100);

COMMENT ON COLUMN public.user_settings.savings_rate_target IS
  'Porcentaje objetivo de ahorro mensual sobre los ingresos, definido por el usuario. Base para las recomendaciones de gasto de la Fase 12. Valor por defecto 20%, sugerido — no es asesoría financiera profesional.';
