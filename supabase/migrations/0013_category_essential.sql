-- =============================================================
-- 0013_category_essential.sql
-- Fase 12, Tarea 12.1 — Distinción esencial/discrecional por categoría
-- =============================================================

ALTER TABLE public.categories
  ADD COLUMN is_essential boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.categories.is_essential IS
  'Marca si el gasto en esta categoría se considera esencial (vivienda, salud, suministros) o discrecional. Base para las recomendaciones de gasto de la Fase 12.';

UPDATE public.categories SET is_essential = true
  WHERE user_id IS NULL AND name IN ('Vivienda', 'Salud', 'Suscripciones');
