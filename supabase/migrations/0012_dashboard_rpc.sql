-- =============================================================
-- 0012_dashboard_rpc.sql
-- Fase 8 — Funciones de agregación para el dashboard
-- =============================================================

CREATE OR REPLACE FUNCTION public.get_balance_summary(p_currency text)
RETURNS TABLE (income numeric, expense numeric, other_currency_count bigint)
LANGUAGE sql
STABLE
AS $$
  SELECT
    COALESCE(SUM(amount_base) FILTER (WHERE type = 'income' AND currency_base = p_currency), 0) AS income,
    COALESCE(SUM(amount_base) FILTER (WHERE type = 'expense' AND currency_base = p_currency), 0) AS expense,
    COUNT(*) FILTER (WHERE currency_base <> p_currency) AS other_currency_count
  FROM public.transactions
  WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_category_breakdown(p_currency text, p_start date, p_end date)
RETURNS TABLE (category_id uuid, category_name text, category_color text, total numeric)
LANGUAGE sql
STABLE
AS $$
  SELECT c.id, c.name, c.color, SUM(t.amount_base) AS total
  FROM public.transactions t
  JOIN public.categories c ON c.id = t.category_id
  WHERE t.user_id = auth.uid()
    AND t.type = 'expense'
    AND t.currency_base = p_currency
    AND t.date >= p_start
    AND t.date <= p_end
  GROUP BY c.id, c.name, c.color
  ORDER BY total DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_monthly_evolution(p_currency text, p_months int DEFAULT 6)
RETURNS TABLE (month date, income numeric, expense numeric)
LANGUAGE sql
STABLE
AS $$
  SELECT
    date_trunc('month', t.date)::date AS month,
    COALESCE(SUM(t.amount_base) FILTER (WHERE t.type = 'income'), 0) AS income,
    COALESCE(SUM(t.amount_base) FILTER (WHERE t.type = 'expense'), 0) AS expense
  FROM public.transactions t
  WHERE t.user_id = auth.uid()
    AND t.currency_base = p_currency
    AND t.date >= (CURRENT_DATE - (p_months || ' months')::interval)
  GROUP BY month
  ORDER BY month;
$$;

CREATE OR REPLACE FUNCTION public.get_budget_progress(p_currency text)
RETURNS TABLE (
  budget_id uuid,
  category_id uuid,
  category_name text,
  category_color text,
  monthly_limit numeric,
  alert_threshold numeric,
  spent numeric
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    b.id,
    c.id,
    c.name,
    c.color,
    b.monthly_limit,
    b.alert_threshold,
    COALESCE(SUM(t.amount_base) FILTER (
      WHERE t.type = 'expense'
        AND t.currency_base = p_currency
        AND date_trunc('month', t.date) = date_trunc('month', CURRENT_DATE)
    ), 0) AS spent
  FROM public.budgets b
  JOIN public.categories c ON c.id = b.category_id
  LEFT JOIN public.transactions t ON t.category_id = b.category_id AND t.user_id = b.user_id
  WHERE b.user_id = auth.uid()
  GROUP BY b.id, c.id, c.name, c.color, b.monthly_limit, b.alert_threshold;
$$;

CREATE OR REPLACE FUNCTION public.get_pending_recurring_reminders()
RETURNS TABLE (
  rule_id uuid,
  description text,
  amount numeric,
  currency text,
  type text,
  category_name text,
  category_color text,
  next_due_date date
)
LANGUAGE sql
STABLE
AS $$
  SELECT r.id, r.description, r.amount, r.currency, r.type::text, c.name, c.color, r.next_due_date
  FROM public.recurring_rules r
  JOIN public.categories c ON c.id = r.category_id
  WHERE r.user_id = auth.uid()
    AND r.status = 'active'
    AND r.next_due_date <= CURRENT_DATE
  ORDER BY r.next_due_date;
$$;