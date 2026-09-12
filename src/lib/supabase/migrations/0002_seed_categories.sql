INSERT INTO public.categories (name, color) VALUES
  ('Ingresos',      '#22C55E'),
  ('Comida',        '#F97316'),
  ('Transporte',    '#3B82F6'),
  ('Vivienda',      '#A855F7'),
  ('Ocio',          '#EC4899'),
  ('Salud',         '#14B8A6'),
  ('Suscripciones', '#6366F1'),
  ('Otros',         '#71717A')
ON CONFLICT (name) WHERE user_id IS NULL DO NOTHING;