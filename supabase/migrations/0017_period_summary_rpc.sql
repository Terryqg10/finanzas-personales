-- =============================================================
-- 0017_period_summary_rpc.sql
-- "Resumen del mes" del Dashboard — ingresos/gastos totales de un
-- rango de fechas arbitrario (a diferencia de get_balance_summary,
-- que es histórico total sin filtro de fecha).
-- =============================================================

CREATE OR REPLACE FUNCTION public.get_period_summary(p_currency text, p_start date, p_end date)
RETURNS TABLE (income numeric, expense numeric)
LANGUAGE sql
STABLE
AS $$
  SELECT
    COALESCE(SUM(amount_base) FILTER (WHERE type = 'income'), 0) AS income,
    COALESCE(SUM(amount_base) FILTER (WHERE type = 'expense'), 0) AS expense
  FROM public.transactions
  WHERE user_id = auth.uid()
    AND currency_base = p_currency
    AND date >= p_start
    AND date <= p_end;
$$;
