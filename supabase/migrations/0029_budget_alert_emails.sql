-- =============================================================
-- 0029_budget_alert_emails.sql
-- Aviso de presupuesto por email (specs/alertas-presupuesto-email.md, §4.1).
--
-- Registra qué avisos por email se han enviado ya, para no repetirlos:
-- como mucho uno por usuario, presupuesto, mes y nivel. La restricción
-- UNIQUE es la reserva: se inserta la fila antes de enviar y solo envía
-- quien consigue insertarla (también ante dos gastos simultáneos).
--
-- RLS definida junto a la tabla: cada usuario solo ve y escribe lo suyo.
-- Aplicar pegando este SQL en el SQL Editor de Supabase (no usar db push)
-- y registrar con: npx supabase migration repair --status applied 0029
-- =============================================================

CREATE TABLE public.budget_alert_emails (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  budget_id uuid NOT NULL,
  month date NOT NULL,
  level text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.budget_alert_emails
  ADD CONSTRAINT budget_alert_emails_pkey PRIMARY KEY (id);
ALTER TABLE public.budget_alert_emails
  ADD CONSTRAINT budget_alert_emails_level_check CHECK (level IN ('threshold', 'limit'));
ALTER TABLE public.budget_alert_emails
  ADD CONSTRAINT budget_alert_emails_month_check CHECK (month = date_trunc('month', month)::date);
ALTER TABLE public.budget_alert_emails
  ADD CONSTRAINT budget_alert_emails_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.budget_alert_emails
  ADD CONSTRAINT budget_alert_emails_budget_id_fkey
  FOREIGN KEY (budget_id) REFERENCES public.budgets(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX budget_alert_emails_unique
  ON public.budget_alert_emails USING btree (user_id, budget_id, month, level);
CREATE INDEX budget_alert_emails_budget_id_idx
  ON public.budget_alert_emails USING btree (budget_id);

ALTER TABLE public.budget_alert_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY budget_alert_emails_owner_policy ON public.budget_alert_emails
  AS PERMISSIVE FOR ALL TO public
  USING ((user_id = auth.uid()))
  WITH CHECK ((user_id = auth.uid()));
