-- =============================================================
-- 0007_create_exchange_rate_snapshots.sql
-- Fase 2, Tarea 2.6 — Caché de tasas de cambio
-- =============================================================

CREATE TABLE public.exchange_rate_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency text NOT NULL CHECK (base_currency ~ '^[A-Z]{3}$'),
  target_currency text NOT NULL CHECK (target_currency ~ '^[A-Z]{3}$'),
  rate numeric(18, 8) NOT NULL CHECK (rate > 0),
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.exchange_rate_snapshots IS
  'Caché diaria de tasas de cambio, compartida entre todos los usuarios. No es el histórico de transacciones (eso vive en transactions.exchange_rate_used).';
COMMENT ON COLUMN public.exchange_rate_snapshots.rate IS
  '1 unidad de base_currency = rate unidades de target_currency.';
COMMENT ON COLUMN public.exchange_rate_snapshots.snapshot_date IS
  'Columna separada de fetched_at a propósito: Postgres no permite indexar una expresión de fecha derivada de un timestamptz (depende de la zona horaria de la sesión, no es determinista).';

CREATE UNIQUE INDEX exchange_rate_snapshots_daily_unique
  ON public.exchange_rate_snapshots (base_currency, target_currency, snapshot_date);

ALTER TABLE public.exchange_rate_snapshots ENABLE ROW LEVEL SECURITY;