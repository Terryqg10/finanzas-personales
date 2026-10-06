-- =============================================================
-- 0028_transactions_import_key.sql
-- Importación de extractos (specs/importacion-extractos.md, §4.1).
--
-- Añade `import_key`: huella de cada movimiento importado de un extracto
-- (fecha + concepto normalizado + importe + saldo posterior). El índice
-- único parcial impide insertar dos veces el mismo movimiento si se
-- reimporta un periodo, sin afectar a los movimientos manuales ni
-- recurrentes (import_key NULL).
--
-- RLS: no cambia; transactions_owner_policy ya cubre la columna nueva.
-- Aplicar pegando este SQL en el SQL Editor de Supabase (no usar db push)
-- y registrar con: npx supabase migration repair --status applied 0028
-- =============================================================

ALTER TABLE public.transactions ADD COLUMN import_key text;

CREATE UNIQUE INDEX transactions_user_import_key_unique
  ON public.transactions USING btree (user_id, import_key)
  WHERE import_key IS NOT NULL;
