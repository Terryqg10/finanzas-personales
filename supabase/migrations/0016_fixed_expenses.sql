-- =============================================================
-- 0016_fixed_expenses.sql
-- Fase 13, Tarea 13.1 — Gastos fijos mensuales garantizados
-- =============================================================

-- Lectura para la pantalla de gestión de "Gastos Fijos": todas las
-- recurring_rules de tipo gasto del usuario, con los datos de su
-- categoría ya resueltos (mismo patrón que el resto de RPCs del
-- dashboard, en vez de un select anidado desde el cliente).
CREATE OR REPLACE FUNCTION public.get_fixed_expenses()
RETURNS TABLE (
  rule_id uuid,
  description text,
  amount numeric,
  currency text,
  frequency text,
  status text,
  next_due_date date,
  category_id uuid,
  category_name text,
  category_color text,
  category_icon text,
  is_essential boolean
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    r.id, r.description, r.amount, r.currency, r.frequency::text, r.status::text,
    r.next_due_date, c.id, c.name, c.color, c.icon, c.is_essential
  FROM public.recurring_rules r
  JOIN public.categories c ON c.id = r.category_id
  WHERE r.user_id = auth.uid()
    AND r.type = 'expense'
  ORDER BY r.next_due_date;
$$;

COMMENT ON FUNCTION public.get_fixed_expenses() IS
  'Fase 13 — Gastos fijos (recurring_rules de tipo gasto) del usuario, con datos de categoría resueltos, para la pantalla de gestión /gastos-fijos.';

-- get_weekend_spending_recommendation cambia de "solo esencial
-- pendiente por fecha de vencimiento" a "todo gasto fijo mensual
-- activo que aún no se ha registrado como movimiento este mes",
-- que es lo que Terry pidió: que los gastos fijos (alquiler, luz,
-- móvil...) se descuenten sí o sí, salvo que ya estén pagados. El
-- resultado tiene las mismas columnas salvo el renombrado de
-- essential_pending_recurring a pending_fixed_expenses. Postgres no
-- permite cambiar los OUT parameters de una función existente con
-- CREATE OR REPLACE (error 42P13), así que hay que borrarla primero.
DROP FUNCTION IF EXISTS public.get_weekend_spending_recommendation(text);

CREATE FUNCTION public.get_weekend_spending_recommendation(p_currency text)
RETURNS TABLE (
  month_income numeric,
  essential_spent numeric,
  discretionary_spent numeric,
  pending_fixed_expenses numeric,
  discretionary_budget_remaining numeric,
  has_discretionary_budget boolean
)
LANGUAGE sql
STABLE
AS $$
  WITH month_transactions AS (
    SELECT t.type, t.amount_base, c.is_essential
    FROM public.transactions t
    JOIN public.categories c ON c.id = t.category_id
    WHERE t.user_id = auth.uid()
      AND t.currency_base = p_currency
      AND date_trunc('month', t.date) = date_trunc('month', CURRENT_DATE)
  ),
  pending_fixed AS (
    -- Gastos fijos (mensuales, activos) de este mes que TODAVÍA no
    -- tienen un movimiento vinculado (transactions.recurring_rule_id)
    -- registrado este mes. Aplica tanto a categorías esenciales como
    -- discrecionales: ambas restan por igual del dinero disponible.
    SELECT r.amount
    FROM public.recurring_rules r
    WHERE r.user_id = auth.uid()
      AND r.status = 'active'
      AND r.type = 'expense'
      AND r.currency = p_currency
      AND r.frequency = 'monthly'
      AND NOT EXISTS (
        SELECT 1 FROM public.transactions t
        WHERE t.recurring_rule_id = r.id
          AND date_trunc('month', t.date) = date_trunc('month', CURRENT_DATE)
      )
  ),
  discretionary_budgets AS (
    SELECT
      b.id,
      b.monthly_limit,
      COALESCE(SUM(t.amount_base) FILTER (
        WHERE t.type = 'expense'
          AND t.currency_base = p_currency
          AND date_trunc('month', t.date) = date_trunc('month', CURRENT_DATE)
      ), 0) AS spent
    FROM public.budgets b
    JOIN public.categories c ON c.id = b.category_id
    LEFT JOIN public.transactions t
      ON t.category_id = b.category_id AND t.user_id = b.user_id
    WHERE b.user_id = auth.uid()
      AND c.is_essential = false
    GROUP BY b.id, b.monthly_limit
  )
  SELECT
    COALESCE((SELECT SUM(amount_base) FROM month_transactions WHERE type = 'income'), 0),
    COALESCE((SELECT SUM(amount_base) FROM month_transactions WHERE type = 'expense' AND is_essential = true), 0),
    COALESCE((SELECT SUM(amount_base) FROM month_transactions WHERE type = 'expense' AND is_essential = false), 0),
    COALESCE((SELECT SUM(amount) FROM pending_fixed), 0),
    COALESCE((SELECT SUM(GREATEST(monthly_limit - spent, 0)) FROM discretionary_budgets), 0),
    EXISTS (SELECT 1 FROM discretionary_budgets);
$$;

COMMENT ON FUNCTION public.get_weekend_spending_recommendation(text) IS
  'Fase 12/13 — Agrega ingresos y gastos del mes en curso, más los gastos fijos mensuales todavía no pagados (pending_fixed_expenses) y lo que queda de presupuestos discrecionales, como base para calcular cuánto queda disponible para gasto de ocio.';
