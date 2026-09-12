CREATE TABLE public.budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories (id) ON DELETE RESTRICT,
  monthly_limit numeric(14, 4) NOT NULL CHECK (monthly_limit > 0),
  alert_threshold numeric(5, 2) NOT NULL DEFAULT 80 CHECK (alert_threshold > 0 AND alert_threshold <= 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.budgets IS
  'Presupuestos mensuales continuos por categoría, en la moneda base del usuario.';
COMMENT ON COLUMN public.budgets.alert_threshold IS
  'Porcentaje (0-100) al que se dispara la alerta "de aviso" (ej. 80). La alerta de "límite superado" (100%) es implícita, no configurable.';

CREATE UNIQUE INDEX budgets_user_category_unique
  ON public.budgets (user_id, category_id);

CREATE TRIGGER set_budgets_updated_at
  BEFORE UPDATE ON public.budgets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;