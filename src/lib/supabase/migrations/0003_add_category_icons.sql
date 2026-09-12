-- =============================================================
-- 0003_add_category_icons.sql
-- Ampliación de la Tarea 2.1 — Íconos de categoría (mejora de UI)
-- =============================================================

ALTER TABLE public.categories ADD COLUMN icon text;

UPDATE public.categories SET icon = 'trending-up'  WHERE name = 'Ingresos'      AND user_id IS NULL;
UPDATE public.categories SET icon = 'utensils'      WHERE name = 'Comida'       AND user_id IS NULL;
UPDATE public.categories SET icon = 'car'           WHERE name = 'Transporte'   AND user_id IS NULL;
UPDATE public.categories SET icon = 'home'          WHERE name = 'Vivienda'     AND user_id IS NULL;
UPDATE public.categories SET icon = 'popcorn'       WHERE name = 'Ocio'         AND user_id IS NULL;
UPDATE public.categories SET icon = 'stethoscope'   WHERE name = 'Salud'        AND user_id IS NULL;
UPDATE public.categories SET icon = 'repeat'        WHERE name = 'Suscripciones' AND user_id IS NULL;
UPDATE public.categories SET icon = 'shapes'        WHERE name = 'Otros'        AND user_id IS NULL;

ALTER TABLE public.categories ALTER COLUMN icon SET NOT NULL;
ALTER TABLE public.categories ALTER COLUMN icon SET DEFAULT 'shapes';

ALTER TABLE public.categories ADD CONSTRAINT categories_icon_allowed CHECK (
  icon IN (
    'trending-up', 'utensils', 'car', 'home', 'popcorn', 'stethoscope', 'repeat', 'shapes',
    'shopping-cart', 'gift', 'plane', 'graduation-cap', 'briefcase', 'piggy-bank',
    'credit-card', 'book-open', 'dumbbell', 'baby', 'paw-print', 'wrench', 'shirt', 'coffee'
  )
);