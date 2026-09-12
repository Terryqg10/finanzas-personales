CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users (id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(trim(name)) > 0),
  color text NOT NULL CHECK (color ~* '^#[0-9a-f]{6}$'),
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.categories IS
  'Categorías de movimientos. user_id NULL = categoría global predefinida.';
COMMENT ON COLUMN public.categories.user_id IS
  'NULL indica categoría predefinida global visible para todos los usuarios.';
COMMENT ON COLUMN public.categories.color IS
  'Color hexadecimal (#RRGGBB) usado para diferenciar la categoría en gráficos y UI.';

CREATE UNIQUE INDEX categories_global_name_unique
  ON public.categories (name)
  WHERE user_id IS NULL;

CREATE UNIQUE INDEX categories_user_name_unique
  ON public.categories (user_id, name)
  WHERE user_id IS NOT NULL;

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;