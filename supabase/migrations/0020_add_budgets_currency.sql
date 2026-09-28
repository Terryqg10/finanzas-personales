-- =============================================================
-- 0020_add_budgets_currency.sql
-- Opción B de conversión de moneda base ("al vuelo") — paso 1.
--
-- `budgets.monthly_limit` no tenía ninguna columna de moneda propia (a
-- diferencia de transactions.currency_original y recurring_rules.currency),
-- así que no se podía saber en qué moneda convertirlo al leer. Se añade
-- `currency`, con backfill explícito a 'EUR' confirmado por el usuario para
-- los presupuestos ya existentes (no se infiere de user_settings.base_currency,
-- que en este momento no refleja la moneda real de esos datos).
--
-- Ver specs/conversion-moneda-base-al-vuelo.md para el diseño completo.
-- =============================================================

ALTER TABLE public.budgets
  ADD COLUMN currency char(3);

UPDATE public.budgets SET currency = 'EUR' WHERE currency IS NULL;

ALTER TABLE public.budgets
  ALTER COLUMN currency SET NOT NULL,
  ADD CONSTRAINT budgets_currency_format CHECK (currency ~ '^[A-Z]{3}$');

COMMENT ON COLUMN public.budgets.currency IS
  'Moneda en la que se definió monthly_limit, fijada al crear el presupuesto (igual que transactions.currency_original). Backfill inicial a EUR para los presupuestos creados antes de esta columna.';

-- Universo de monedas distintas que usa el usuario, para que la app pueda
-- calcular de una vez todas las tasas necesarias antes de llamar a las
-- funciones de agregación del Dashboard.
CREATE FUNCTION public.get_user_currencies()
RETURNS TABLE (currency text)
LANGUAGE sql
STABLE
AS $$
  SELECT currency_original AS currency FROM public.transactions WHERE user_id = auth.uid()
  UNION
  SELECT currency FROM public.budgets WHERE user_id = auth.uid()
  UNION
  SELECT currency FROM public.recurring_rules WHERE user_id = auth.uid();
$$;

COMMENT ON FUNCTION public.get_user_currencies() IS
  'Monedas distintas presentes en los datos del usuario (movimientos, presupuestos, reglas recurrentes). Se usa para calcular de antemano las tasas de conversión hacia la moneda base actual antes de consultar el Dashboard.';
