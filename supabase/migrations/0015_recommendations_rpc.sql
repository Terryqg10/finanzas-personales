-- =============================================================
-- 0015_recommendations_rpc.sql
-- Fase 12, Tarea 12.3 — RPCs para recomendaciones de gasto
-- =============================================================

-- get_pending_recurring_reminders cambia su forma de retorno (añade
-- category_id e is_essential), así que hay que recrearla en vez de
-- solo reemplazarla.
DROP FUNCTION IF EXISTS public.get_pending_recurring_reminders();

CREATE FUNCTION public.get_pending_recurring_reminders()
RETURNS TABLE (
  rule_id uuid,
  description text,
  amount numeric,
  currency text,
  type text,
  category_id uuid,
  category_name text,
  category_color text,
  is_essential boolean,
  next_due_date date
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    r.id, r.description, r.amount, r.currency, r.type::text,
    c.id, c.name, c.color, c.is_essential, r.next_due_date
  FROM public.recurring_rules r
  JOIN public.categories c ON c.id = r.category_id
  WHERE r.user_id = auth.uid()
    AND r.status = 'active'
    AND r.next_due_date <= CURRENT_DATE
  ORDER BY r.next_due_date;
$$;

COMMENT ON FUNCTION public.get_pending_recurring_reminders() IS
  'Recordatorios de movimientos recurrentes ya vencidos, pendientes de confirmación manual (Fase 10). Devuelve category_id/is_essential desde la Fase 12 para poder distinguir gasto esencial de discrecional.';

CREATE FUNCTION public.get_weekend_spending_recommendation(p_currency text)
RETURNS TABLE (
  month_income numeric,
  essential_spent numeric,
  discretionary_spent numeric,
  essential_pending_recurring numeric,
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
  pending_essential AS (
    SELECT r.amount
    FROM public.recurring_rules r
    JOIN public.categories c ON c.id = r.category_id
    WHERE r.user_id = auth.uid()
      AND r.status = 'active'
      AND r.type = 'expense'
      AND r.currency = p_currency
      AND c.is_essential = true
      AND r.next_due_date >= date_trunc('month', CURRENT_DATE)
      AND r.next_due_date <= (date_trunc('month', CURRENT_DATE) + interval '1 month' - interval '1 day')
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
    COALESCE((SELECT SUM(amount) FROM pending_essential), 0),
    COALESCE((SELECT SUM(GREATEST(monthly_limit - spent, 0)) FROM discretionary_budgets), 0),
    EXISTS (SELECT 1 FROM discretionary_budgets);
$$;

COMMENT ON FUNCTION public.get_weekend_spending_recommendation(text) IS
  'Fase 12 — Agrega ingresos y gastos esenciales/discrecionales del mes en curso, más lo pendiente esencial y lo que queda de presupuestos discrecionales, como base para calcular cuánto queda disponible para gasto de ocio. El objetivo de ahorro y el reparto por fin de semana se calculan en la capa de aplicación (savings_rate_target es configurable por usuario).';
