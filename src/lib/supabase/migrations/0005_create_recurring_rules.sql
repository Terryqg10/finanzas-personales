-- =============================================================
-- 0005_create_recurring_rules.sql
-- Fase 2, Tarea 2.4 — Reglas de movimientos recurrentes
-- =============================================================

CREATE TYPE recurring_frequency AS ENUM ('weekly', 'monthly', 'yearly');
CREATE TYPE recurring_status AS ENUM ('active', 'paused');

CREATE TABLE public.recurring_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories (id) ON DELETE RESTRICT,
  type transaction_type NOT NULL,
  description text NOT NULL CHECK (char_length(trim(description)) > 0),
  amount numeric(14, 4) NOT NULL CHECK (amount > 0),
  currency char(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  frequency recurring_frequency NOT NULL,
  next_due_date date NOT NULL,
  status recurring_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.recurring_rules IS
  'Reglas de movimientos recurrentes. Solo generan recordatorio — nunca crean un movimiento real sin confirmación explícita del usuario.';
COMMENT ON COLUMN public.recurring_rules.next_due_date IS
  'Próxima fecha en la que el job periódico (Fase 10) debe generar un recordatorio.';
COMMENT ON COLUMN public.recurring_rules.type IS
  'Reutiliza el mismo enum transaction_type que la tabla transactions, para que al confirmar el recordatorio los datos encajen directamente.';

CREATE TRIGGER set_recurring_rules_updated_at
  BEFORE UPDATE ON public.recurring_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.recurring_rules ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.transactions
  ADD COLUMN recurring_rule_id uuid REFERENCES public.recurring_rules (id) ON DELETE SET NULL;

COMMENT ON COLUMN public.transactions.recurring_rule_id IS
  'NULL si el movimiento es manual o importado. Obligatorio cuando source = recurring.';

ALTER TABLE public.transactions ADD CONSTRAINT transactions_recurring_consistency CHECK (
  (source = 'recurring' AND recurring_rule_id IS NOT NULL) OR
  (source <> 'recurring' AND recurring_rule_id IS NULL)
);