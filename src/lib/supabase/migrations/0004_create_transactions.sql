-- =============================================================
-- 0004_create_transactions.sql
-- Fase 2, Tarea 2.3 — Tabla de movimientos (ingresos/gastos)
-- =============================================================

CREATE TYPE transaction_type AS ENUM ('income', 'expense');
CREATE TYPE transaction_source AS ENUM ('manual', 'imported', 'recurring');

CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories (id) ON DELETE RESTRICT,
  type transaction_type NOT NULL,
  description text NOT NULL CHECK (char_length(trim(description)) > 0),
  date date NOT NULL,
  amount_original numeric(14, 4) NOT NULL CHECK (amount_original > 0),
  currency_original char(3) NOT NULL CHECK (currency_original ~ '^[A-Z]{3}$'),
  currency_base char(3) NOT NULL CHECK (currency_base ~ '^[A-Z]{3}$'),
  exchange_rate_used numeric(18, 8) NOT NULL CHECK (exchange_rate_used > 0),
  amount_base numeric(14, 4) GENERATED ALWAYS AS (amount_original * exchange_rate_used) STORED,
  source transaction_source NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.transactions IS
  'Movimientos de ingresos y gastos, con conversión a moneda base congelada al momento del registro.';
COMMENT ON COLUMN public.transactions.amount_original IS
  'Siempre positivo. El signo (ingreso/gasto) lo indica la columna type, nunca el monto.';
COMMENT ON COLUMN public.transactions.exchange_rate_used IS
  '1 unidad de currency_original = exchange_rate_used unidades de currency_base. Si ambas monedas coinciden, debe ser 1.';
COMMENT ON COLUMN public.transactions.amount_base IS
  'Calculado automáticamente por Postgres (columna generada). Nunca se inserta manualmente.';
COMMENT ON COLUMN public.transactions.category_id IS
  'ON DELETE RESTRICT a propósito: no se puede borrar una categoría con movimientos asociados sin reasignarlos primero (lo resuelve la app en la Fase 5).';

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;