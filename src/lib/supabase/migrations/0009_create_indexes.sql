-- =============================================================
-- 0009_create_indexes.sql
-- Fase 2, Tarea 2.10 — Índices de rendimiento
-- =============================================================

CREATE INDEX transactions_user_date_idx
  ON public.transactions (user_id, date DESC);

CREATE INDEX transactions_category_id_idx
  ON public.transactions (category_id);

CREATE INDEX transactions_recurring_rule_id_idx
  ON public.transactions (recurring_rule_id)
  WHERE recurring_rule_id IS NOT NULL;

CREATE INDEX recurring_rules_due_idx
  ON public.recurring_rules (next_due_date)
  WHERE status = 'active';

CREATE INDEX recurring_rules_user_id_idx
  ON public.recurring_rules (user_id);

CREATE INDEX budgets_category_id_idx
  ON public.budgets (category_id);