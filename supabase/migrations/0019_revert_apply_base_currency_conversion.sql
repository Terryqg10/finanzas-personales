-- =============================================================
-- 0019_revert_apply_base_currency_conversion.sql
-- Revierte 0018: se decidió no usar reconversión retroactiva
-- (Opción A) y explorar conversión "al vuelo" en su lugar
-- (Opción B) — ver specs/conversion-retroactiva-moneda-base.md
-- (marcado como revertido) y el spec de Opción B que lo sucede.
-- =============================================================

DROP FUNCTION IF EXISTS public.apply_base_currency_conversion(text, jsonb, numeric);
