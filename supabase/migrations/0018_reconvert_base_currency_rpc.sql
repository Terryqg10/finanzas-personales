-- =============================================================
-- 0018_reconvert_base_currency_rpc.sql
-- Conversión retroactiva al cambiar la moneda base del usuario.
--
-- Antes de esta migración, cambiar `user_settings.base_currency` dejaba
-- todos los movimientos y presupuestos existentes "congelados" en la
-- moneda base anterior (transactions.currency_base, budgets.monthly_limit
-- sin ninguna conversión), y las funciones RPC del Dashboard los excluían
-- silenciosamente por no coincidir con la nueva moneda base. Ver
-- specs/conversion-retroactiva-moneda-base.md para el detalle completo.
-- =============================================================

CREATE OR REPLACE FUNCTION public.apply_base_currency_conversion(
  p_new_currency text,
  p_transaction_rates jsonb,
  p_budget_rate numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_currency text;
  v_rate numeric;
BEGIN
  -- Reconvierte cada movimiento según la tasa de SU moneda original
  -- (currency_original) hacia la nueva moneda base — no se encadena desde
  -- amount_base ya redondeado, evitando arrastre de error de redondeo.
  -- amount_base es una columna GENERATED (amount_original *
  -- exchange_rate_used): se recalcula sola al escribir exchange_rate_used,
  -- nunca se escribe directamente.
  FOR v_currency, v_rate IN
    SELECT key, value::numeric FROM jsonb_each_text(p_transaction_rates)
  LOOP
    UPDATE public.transactions
    SET currency_base = p_new_currency,
        exchange_rate_used = v_rate
    WHERE user_id = auth.uid()
      AND currency_original = v_currency;
  END LOOP;

  -- budgets.monthly_limit no tiene una moneda "original" propia (siempre
  -- se guarda en la moneda base vigente al crearlo), así que se reconvierte
  -- con una única tasa: moneda_base_anterior -> moneda_base_nueva.
  IF p_budget_rate IS NOT NULL THEN
    UPDATE public.budgets
    SET monthly_limit = round(monthly_limit * p_budget_rate, 4)
    WHERE user_id = auth.uid();
  END IF;

  UPDATE public.user_settings
  SET base_currency = p_new_currency
  WHERE user_id = auth.uid();
END;
$$;

COMMENT ON FUNCTION public.apply_base_currency_conversion IS
  'Reconvierte de forma atómica transactions.exchange_rate_used/currency_base, budgets.monthly_limit y user_settings.base_currency al cambiar la moneda base. SECURITY INVOKER + filtro por auth.uid() en cada UPDATE, mismo patrón que el resto de funciones del Dashboard (RLS es la última línea de defensa, no la única).';
