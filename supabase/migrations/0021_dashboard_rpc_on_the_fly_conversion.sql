-- =============================================================
-- 0021_dashboard_rpc_on_the_fly_conversion.sql
-- Opción B de conversión de moneda base ("al vuelo") — paso 2.
--
-- Las 6 funciones de agregación del Dashboard filtraban
-- `WHERE currency_base = p_currency` (o su equivalente para
-- budgets/recurring_rules), excluyendo en silencio cualquier fila que no
-- coincidiera con la moneda base ACTUAL del usuario. Se reemplaza ese
-- filtro por una conversión en el momento de la consulta: cada monto se
-- multiplica por la tasa `moneda_original -> p_currency` que la app
-- calcula de antemano (con getExchangeRate) y envía como `p_rates` (jsonb,
-- ej. {"EUR": 1.08}). Nunca se toca nada guardado.
--
-- Como cambia la lista de parámetros, hay que DROP + CREATE en vez de
-- CREATE OR REPLACE (Postgres identifica una función por nombre + tipos de
-- argumentos; con un argumento nuevo se crearía un overload duplicado en
-- vez de reemplazar la versión vieja).
--
-- Ver specs/conversion-moneda-base-al-vuelo.md para el diseño completo.
-- =============================================================

DROP FUNCTION IF EXISTS public.get_balance_summary(text);
DROP FUNCTION IF EXISTS public.get_category_breakdown(text, date, date);
DROP FUNCTION IF EXISTS public.get_monthly_evolution(text, int);
DROP FUNCTION IF EXISTS public.get_budget_progress(text);
DROP FUNCTION IF EXISTS public.get_period_summary(text, date, date);
DROP FUNCTION IF EXISTS public.get_weekend_spending_recommendation(text);

CREATE FUNCTION public.get_balance_summary(p_currency text, p_rates jsonb)
RETURNS TABLE (income numeric, expense numeric, other_currency_count bigint)
LANGUAGE sql
STABLE
AS $$
  SELECT
    COALESCE(SUM(
      amount_original * CASE
        WHEN currency_original = p_currency THEN 1
        ELSE (p_rates ->> currency_original)::numeric
      END
    ) FILTER (WHERE type = 'income'), 0) AS income,
    COALESCE(SUM(
      amount_original * CASE
        WHEN currency_original = p_currency THEN 1
        ELSE (p_rates ->> currency_original)::numeric
      END
    ) FILTER (WHERE type = 'expense'), 0) AS expense,
    -- Ahora significa "no se pudo convertir de verdad" (sin tasa
    -- disponible), no "está en otra moneda" — con la conversión al vuelo
    -- eso ya no debería excluir nada por sí solo.
    COUNT(*) FILTER (
      WHERE currency_original <> p_currency
        AND (p_rates ->> currency_original) IS NULL
    ) AS other_currency_count
  FROM public.transactions
  WHERE user_id = auth.uid();
$$;

CREATE FUNCTION public.get_category_breakdown(p_currency text, p_start date, p_end date, p_rates jsonb)
RETURNS TABLE (category_id uuid, category_name text, category_color text, total numeric)
LANGUAGE sql
STABLE
AS $$
  SELECT
    c.id,
    c.name,
    c.color,
    SUM(
      t.amount_original * CASE
        WHEN t.currency_original = p_currency THEN 1
        ELSE (p_rates ->> t.currency_original)::numeric
      END
    ) AS total
  FROM public.transactions t
  JOIN public.categories c ON c.id = t.category_id
  WHERE t.user_id = auth.uid()
    AND t.type = 'expense'
    AND t.date >= p_start
    AND t.date <= p_end
  GROUP BY c.id, c.name, c.color
  ORDER BY total DESC;
$$;

CREATE FUNCTION public.get_monthly_evolution(p_currency text, p_rates jsonb, p_months int DEFAULT 6)
RETURNS TABLE (month date, income numeric, expense numeric)
LANGUAGE sql
STABLE
AS $$
  SELECT
    date_trunc('month', t.date)::date AS month,
    COALESCE(SUM(
      t.amount_original * CASE
        WHEN t.currency_original = p_currency THEN 1
        ELSE (p_rates ->> t.currency_original)::numeric
      END
    ) FILTER (WHERE t.type = 'income'), 0) AS income,
    COALESCE(SUM(
      t.amount_original * CASE
        WHEN t.currency_original = p_currency THEN 1
        ELSE (p_rates ->> t.currency_original)::numeric
      END
    ) FILTER (WHERE t.type = 'expense'), 0) AS expense
  FROM public.transactions t
  WHERE t.user_id = auth.uid()
    AND t.date >= (CURRENT_DATE - (p_months || ' months')::interval)
  GROUP BY month
  ORDER BY month;
$$;

CREATE FUNCTION public.get_budget_progress(p_currency text, p_rates jsonb)
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
    b.monthly_limit * CASE
      WHEN b.currency = p_currency THEN 1
      ELSE (p_rates ->> b.currency)::numeric
    END,
    b.alert_threshold,
    COALESCE(SUM(t.amount_original * CASE
        WHEN t.currency_original = p_currency THEN 1
        ELSE (p_rates ->> t.currency_original)::numeric
      END
    ) FILTER (
      WHERE t.type = 'expense'
        AND date_trunc('month', t.date) = date_trunc('month', CURRENT_DATE)
    ), 0) AS spent
  FROM public.budgets b
  JOIN public.categories c ON c.id = b.category_id
  LEFT JOIN public.transactions t ON t.category_id = b.category_id AND t.user_id = b.user_id
  WHERE b.user_id = auth.uid()
  GROUP BY b.id, c.id, c.name, c.color, b.monthly_limit, b.alert_threshold, b.currency;
$$;

CREATE FUNCTION public.get_period_summary(p_currency text, p_start date, p_end date, p_rates jsonb)
RETURNS TABLE (income numeric, expense numeric)
LANGUAGE sql
STABLE
AS $$
  SELECT
    COALESCE(SUM(
      amount_original * CASE
        WHEN currency_original = p_currency THEN 1
        ELSE (p_rates ->> currency_original)::numeric
      END
    ) FILTER (WHERE type = 'income'), 0) AS income,
    COALESCE(SUM(
      amount_original * CASE
        WHEN currency_original = p_currency THEN 1
        ELSE (p_rates ->> currency_original)::numeric
      END
    ) FILTER (WHERE type = 'expense'), 0) AS expense
  FROM public.transactions
  WHERE user_id = auth.uid()
    AND date >= p_start
    AND date <= p_end;
$$;

CREATE FUNCTION public.get_weekend_spending_recommendation(p_currency text, p_rates jsonb)
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
    SELECT
      t.type,
      t.amount_original * CASE
        WHEN t.currency_original = p_currency THEN 1
        ELSE (p_rates ->> t.currency_original)::numeric
      END AS amount_converted,
      c.is_essential
    FROM public.transactions t
    JOIN public.categories c ON c.id = t.category_id
    WHERE t.user_id = auth.uid()
      AND date_trunc('month', t.date) = date_trunc('month', CURRENT_DATE)
  ),
  pending_essential AS (
    SELECT
      r.amount * CASE
        WHEN r.currency = p_currency THEN 1
        ELSE (p_rates ->> r.currency)::numeric
      END AS amount_converted
    FROM public.recurring_rules r
    JOIN public.categories c ON c.id = r.category_id
    WHERE r.user_id = auth.uid()
      AND r.status = 'active'
      AND r.type = 'expense'
      AND c.is_essential = true
      AND r.next_due_date >= date_trunc('month', CURRENT_DATE)
      AND r.next_due_date <= (date_trunc('month', CURRENT_DATE) + interval '1 month' - interval '1 day')
  ),
  discretionary_budgets AS (
    SELECT
      b.id,
      b.monthly_limit * CASE
        WHEN b.currency = p_currency THEN 1
        ELSE (p_rates ->> b.currency)::numeric
      END AS monthly_limit_converted,
      COALESCE(SUM(t.amount_original * CASE
          WHEN t.currency_original = p_currency THEN 1
          ELSE (p_rates ->> t.currency_original)::numeric
        END
      ) FILTER (
        WHERE t.type = 'expense'
          AND date_trunc('month', t.date) = date_trunc('month', CURRENT_DATE)
      ), 0) AS spent
    FROM public.budgets b
    JOIN public.categories c ON c.id = b.category_id
    LEFT JOIN public.transactions t
      ON t.category_id = b.category_id AND t.user_id = b.user_id
    WHERE b.user_id = auth.uid()
      AND c.is_essential = false
    GROUP BY b.id, b.monthly_limit, b.currency
  )
  SELECT
    COALESCE((SELECT SUM(amount_converted) FROM month_transactions WHERE type = 'income'), 0),
    COALESCE((SELECT SUM(amount_converted) FROM month_transactions WHERE type = 'expense' AND is_essential = true), 0),
    COALESCE((SELECT SUM(amount_converted) FROM month_transactions WHERE type = 'expense' AND is_essential = false), 0),
    COALESCE((SELECT SUM(amount_converted) FROM pending_essential), 0),
    COALESCE((SELECT SUM(GREATEST(monthly_limit_converted - spent, 0)) FROM discretionary_budgets), 0),
    EXISTS (SELECT 1 FROM discretionary_budgets);
$$;

COMMENT ON FUNCTION public.get_balance_summary(text, jsonb) IS
  'Saldo histórico total, convirtiendo cada movimiento desde su currency_original hacia p_currency usando p_rates en vez de excluir monedas distintas.';
COMMENT ON FUNCTION public.get_weekend_spending_recommendation(text, jsonb) IS
  'Fase 12 — igual que antes, pero convierte movimientos, reglas recurrentes y presupuestos al vuelo con p_rates en vez de filtrar por moneda.';
