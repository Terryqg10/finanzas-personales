-- =============================================================
-- 0030_push_notifications.sql
-- Aviso de presupuesto por notificación push (specs/alertas-presupuesto-push.md, §4.1).
--
-- 1. Generaliza la reserva de avisos por canal: budget_alert_emails pasa a
--    llamarse budget_alert_notifications y gana `channel` ('email' | 'push').
--    El índice único incluye el canal, así que desactivar el email no impide
--    la push ni al revés. Las filas existentes quedan como 'email'.
-- 2. Crea push_subscriptions: una fila por dispositivo suscrito, con RLS.
--
-- ORDEN DE DESPLIEGUE: el código anterior usa el nombre antiguo de la tabla.
-- Aplica este SQL y haz el push justo después; entre ambos pasos los avisos
-- por email dejan de registrarse (solo se pierden esos avisos, los gastos y
-- los toasts no se ven afectados).
--
-- Aplicar pegando este SQL en el SQL Editor de Supabase (no usar db push)
-- y registrar con: npx supabase migration repair --status applied 0030
-- =============================================================

-- 1. Reserva de avisos por canal ---------------------------------------

ALTER TABLE public.budget_alert_emails RENAME TO budget_alert_notifications;

ALTER TABLE public.budget_alert_notifications
  ADD COLUMN channel text NOT NULL DEFAULT 'email';
ALTER TABLE public.budget_alert_notifications
  ADD CONSTRAINT budget_alert_notifications_channel_check CHECK (channel IN ('email', 'push'));

DROP INDEX public.budget_alert_emails_unique;
CREATE UNIQUE INDEX budget_alert_notifications_unique
  ON public.budget_alert_notifications USING btree (user_id, budget_id, month, level, channel);

-- Nombres coherentes con la tabla nueva
ALTER TABLE public.budget_alert_notifications
  RENAME CONSTRAINT budget_alert_emails_pkey TO budget_alert_notifications_pkey;
ALTER TABLE public.budget_alert_notifications
  RENAME CONSTRAINT budget_alert_emails_level_check TO budget_alert_notifications_level_check;
ALTER TABLE public.budget_alert_notifications
  RENAME CONSTRAINT budget_alert_emails_month_check TO budget_alert_notifications_month_check;
ALTER TABLE public.budget_alert_notifications
  RENAME CONSTRAINT budget_alert_emails_user_id_fkey TO budget_alert_notifications_user_id_fkey;
ALTER TABLE public.budget_alert_notifications
  RENAME CONSTRAINT budget_alert_emails_budget_id_fkey TO budget_alert_notifications_budget_id_fkey;
ALTER INDEX public.budget_alert_emails_budget_id_idx
  RENAME TO budget_alert_notifications_budget_id_idx;
ALTER POLICY budget_alert_emails_owner_policy ON public.budget_alert_notifications
  RENAME TO budget_alert_notifications_owner_policy;

-- 2. Suscripciones push ------------------------------------------------

CREATE TABLE public.push_subscriptions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.push_subscriptions
  ADD CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id);
ALTER TABLE public.push_subscriptions
  ADD CONSTRAINT push_subscriptions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX push_subscriptions_endpoint_unique
  ON public.push_subscriptions USING btree (endpoint);
CREATE INDEX push_subscriptions_user_id_idx
  ON public.push_subscriptions USING btree (user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY push_subscriptions_owner_policy ON public.push_subscriptions
  AS PERMISSIVE FOR ALL TO public
  USING ((user_id = auth.uid()))
  WITH CHECK ((user_id = auth.uid()));
