-- =============================================================
-- 0027_baseline_schema_snapshot.sql
--
-- Snapshot documental del esquema completo de producción, extraído el
-- 2026-09-29 (enums, trigger de auth.users y categorías semilla el
-- 2026-10-05) con consultas de introspección (pg_catalog) porque las
-- migraciones 0001-0011 nunca se guardaron como archivo.
--
-- NO SE EJECUTA contra producción: el esquema ya existe. Sirve para
-- poder reconstruir un entorno nuevo y como fuente de verdad. Registrada con:
--   npx supabase migration repair --status applied 0027
--
-- Las funciones get_* viven en 0012-0021 y el modo demo en 0022-0026;
-- no se repiten aquí.
-- =============================================================

-- -------------------------------------------------------------
-- 1. Enums
-- -------------------------------------------------------------
CREATE TYPE public.recurring_frequency AS ENUM ('weekly', 'monthly', 'yearly');
CREATE TYPE public.recurring_status AS ENUM ('active', 'paused');
CREATE TYPE public.transaction_source AS ENUM ('manual', 'imported', 'recurring');
CREATE TYPE public.transaction_type AS ENUM ('income', 'expense');

-- -------------------------------------------------------------
-- 2. Funciones de soporte
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.user_settings (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$function$;

-- -------------------------------------------------------------
-- 3. Tablas
-- -------------------------------------------------------------
CREATE TABLE public.categories (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid,
  name text NOT NULL,
  color text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  icon text DEFAULT 'shapes'::text NOT NULL,
  is_essential boolean DEFAULT false NOT NULL
);

CREATE TABLE public.budgets (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  category_id uuid NOT NULL,
  monthly_limit numeric(14,4) NOT NULL,
  alert_threshold numeric(5,2) DEFAULT 80 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  currency character(3) NOT NULL
);

CREATE TABLE public.exchange_rate_snapshots (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  base_currency text NOT NULL,
  target_currency text NOT NULL,
  rate numeric(18,8) NOT NULL,
  snapshot_date date DEFAULT CURRENT_DATE NOT NULL,
  fetched_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.recurring_rules (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  category_id uuid NOT NULL,
  type transaction_type NOT NULL,
  description text NOT NULL,
  amount numeric(14,4) NOT NULL,
  currency character(3) NOT NULL,
  frequency recurring_frequency NOT NULL,
  next_due_date date NOT NULL,
  status recurring_status DEFAULT 'active'::recurring_status NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.transactions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  category_id uuid NOT NULL,
  type transaction_type NOT NULL,
  description text NOT NULL,
  date date NOT NULL,
  amount_original numeric(14,4) NOT NULL,
  currency_original character(3) NOT NULL,
  currency_base character(3) NOT NULL,
  exchange_rate_used numeric(18,8) NOT NULL,
  amount_base numeric(14,4) GENERATED ALWAYS AS ((amount_original * exchange_rate_used)) STORED,
  source transaction_source DEFAULT 'manual'::transaction_source NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  recurring_rule_id uuid
);

CREATE TABLE public.user_settings (
  user_id uuid NOT NULL,
  base_currency text DEFAULT 'EUR'::text NOT NULL,
  theme_preference text DEFAULT 'system'::text NOT NULL,
  notify_push boolean DEFAULT true NOT NULL,
  notify_email boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  savings_rate_target numeric(5,2) DEFAULT 20 NOT NULL
);

-- -------------------------------------------------------------
-- 4. Claves primarias
-- -------------------------------------------------------------
ALTER TABLE public.budgets ADD CONSTRAINT budgets_pkey PRIMARY KEY (id);
ALTER TABLE public.categories ADD CONSTRAINT categories_pkey PRIMARY KEY (id);
ALTER TABLE public.exchange_rate_snapshots ADD CONSTRAINT exchange_rate_snapshots_pkey PRIMARY KEY (id);
ALTER TABLE public.recurring_rules ADD CONSTRAINT recurring_rules_pkey PRIMARY KEY (id);
ALTER TABLE public.transactions ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);
ALTER TABLE public.user_settings ADD CONSTRAINT user_settings_pkey PRIMARY KEY (user_id);

-- -------------------------------------------------------------
-- 5. Restricciones CHECK
-- -------------------------------------------------------------
ALTER TABLE public.budgets ADD CONSTRAINT budgets_alert_threshold_check CHECK (((alert_threshold > (0)::numeric) AND (alert_threshold <= (100)::numeric)));
ALTER TABLE public.budgets ADD CONSTRAINT budgets_currency_format CHECK ((currency ~ '^[A-Z]{3}$'::text));
ALTER TABLE public.budgets ADD CONSTRAINT budgets_monthly_limit_check CHECK ((monthly_limit > (0)::numeric));

ALTER TABLE public.categories ADD CONSTRAINT categories_color_check CHECK ((color ~* '^#[0-9a-f]{6}$'::text));
ALTER TABLE public.categories ADD CONSTRAINT categories_icon_allowed CHECK ((icon = ANY (ARRAY['trending-up'::text, 'utensils'::text, 'car'::text, 'home'::text, 'popcorn'::text, 'stethoscope'::text, 'repeat'::text, 'shapes'::text, 'shopping-cart'::text, 'gift'::text, 'plane'::text, 'graduation-cap'::text, 'briefcase'::text, 'piggy-bank'::text, 'credit-card'::text, 'book-open'::text, 'dumbbell'::text, 'baby'::text, 'paw-print'::text, 'wrench'::text, 'shirt'::text, 'coffee'::text])));
ALTER TABLE public.categories ADD CONSTRAINT categories_name_check CHECK ((char_length(TRIM(BOTH FROM name)) > 0));
ALTER TABLE public.categories ADD CONSTRAINT categories_name_max_length CHECK ((char_length(name) <= 40));

ALTER TABLE public.exchange_rate_snapshots ADD CONSTRAINT exchange_rate_snapshots_base_currency_check CHECK ((base_currency ~ '^[A-Z]{3}$'::text));
ALTER TABLE public.exchange_rate_snapshots ADD CONSTRAINT exchange_rate_snapshots_rate_check CHECK ((rate > (0)::numeric));
ALTER TABLE public.exchange_rate_snapshots ADD CONSTRAINT exchange_rate_snapshots_target_currency_check CHECK ((target_currency ~ '^[A-Z]{3}$'::text));

ALTER TABLE public.recurring_rules ADD CONSTRAINT recurring_rules_amount_check CHECK ((amount > (0)::numeric));
ALTER TABLE public.recurring_rules ADD CONSTRAINT recurring_rules_currency_check CHECK ((currency ~ '^[A-Z]{3}$'::text));
ALTER TABLE public.recurring_rules ADD CONSTRAINT recurring_rules_description_check CHECK ((char_length(TRIM(BOTH FROM description)) > 0));

ALTER TABLE public.transactions ADD CONSTRAINT transactions_amount_original_check CHECK ((amount_original > (0)::numeric));
ALTER TABLE public.transactions ADD CONSTRAINT transactions_currency_base_check CHECK ((currency_base ~ '^[A-Z]{3}$'::text));
ALTER TABLE public.transactions ADD CONSTRAINT transactions_currency_original_check CHECK ((currency_original ~ '^[A-Z]{3}$'::text));
ALTER TABLE public.transactions ADD CONSTRAINT transactions_description_check CHECK ((char_length(TRIM(BOTH FROM description)) > 0));
ALTER TABLE public.transactions ADD CONSTRAINT transactions_exchange_rate_used_check CHECK ((exchange_rate_used > (0)::numeric));
ALTER TABLE public.transactions ADD CONSTRAINT transactions_recurring_consistency CHECK ((((source = 'recurring'::transaction_source) AND (recurring_rule_id IS NOT NULL)) OR ((source <> 'recurring'::transaction_source) AND (recurring_rule_id IS NULL))));

ALTER TABLE public.user_settings ADD CONSTRAINT user_settings_base_currency_check CHECK ((base_currency ~ '^[A-Z]{3}$'::text));
ALTER TABLE public.user_settings ADD CONSTRAINT user_settings_savings_rate_target_check CHECK (((savings_rate_target >= (0)::numeric) AND (savings_rate_target <= (100)::numeric)));
ALTER TABLE public.user_settings ADD CONSTRAINT user_settings_theme_preference_check CHECK ((theme_preference = ANY (ARRAY['light'::text, 'dark'::text, 'system'::text])));

-- -------------------------------------------------------------
-- 6. Claves foráneas
-- -------------------------------------------------------------
ALTER TABLE public.budgets ADD CONSTRAINT budgets_category_id_fkey FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT;
ALTER TABLE public.budgets ADD CONSTRAINT budgets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.categories ADD CONSTRAINT categories_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.recurring_rules ADD CONSTRAINT recurring_rules_category_id_fkey FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT;
ALTER TABLE public.recurring_rules ADD CONSTRAINT recurring_rules_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_category_id_fkey FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_recurring_rule_id_fkey FOREIGN KEY (recurring_rule_id) REFERENCES recurring_rules(id) ON DELETE SET NULL;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_settings ADD CONSTRAINT user_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- -------------------------------------------------------------
-- 7. Índices
-- -------------------------------------------------------------
CREATE INDEX budgets_category_id_idx ON public.budgets USING btree (category_id);
CREATE UNIQUE INDEX budgets_user_category_unique ON public.budgets USING btree (user_id, category_id);
CREATE UNIQUE INDEX categories_global_name_unique ON public.categories USING btree (name) WHERE (user_id IS NULL);
CREATE UNIQUE INDEX categories_user_name_unique ON public.categories USING btree (user_id, name) WHERE (user_id IS NOT NULL);
CREATE UNIQUE INDEX exchange_rate_snapshots_daily_unique ON public.exchange_rate_snapshots USING btree (base_currency, target_currency, snapshot_date);
CREATE INDEX recurring_rules_due_idx ON public.recurring_rules USING btree (next_due_date) WHERE (status = 'active'::recurring_status);
CREATE INDEX recurring_rules_user_id_idx ON public.recurring_rules USING btree (user_id);
CREATE INDEX transactions_category_id_idx ON public.transactions USING btree (category_id);
CREATE INDEX transactions_recurring_rule_id_idx ON public.transactions USING btree (recurring_rule_id) WHERE (recurring_rule_id IS NOT NULL);
CREATE INDEX transactions_user_date_idx ON public.transactions USING btree (user_id, date DESC);

-- -------------------------------------------------------------
-- 8. Row Level Security
-- -------------------------------------------------------------
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_rate_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY budgets_owner_policy ON public.budgets AS PERMISSIVE FOR ALL TO public USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));

CREATE POLICY categories_delete_policy ON public.categories AS PERMISSIVE FOR DELETE TO public USING ((user_id = auth.uid()));
CREATE POLICY categories_insert_policy ON public.categories AS PERMISSIVE FOR INSERT TO public WITH CHECK ((user_id = auth.uid()));
CREATE POLICY categories_select_policy ON public.categories AS PERMISSIVE FOR SELECT TO public USING (((auth.uid() IS NOT NULL) AND ((user_id = auth.uid()) OR (user_id IS NULL))));
CREATE POLICY categories_update_policy ON public.categories AS PERMISSIVE FOR UPDATE TO public USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));

CREATE POLICY exchange_rate_snapshots_select_policy ON public.exchange_rate_snapshots AS PERMISSIVE FOR SELECT TO authenticated USING (true);

CREATE POLICY recurring_rules_owner_policy ON public.recurring_rules AS PERMISSIVE FOR ALL TO public USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));

CREATE POLICY transactions_owner_policy ON public.transactions AS PERMISSIVE FOR ALL TO public USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));

CREATE POLICY user_settings_select_policy ON public.user_settings AS PERMISSIVE FOR SELECT TO public USING ((user_id = auth.uid()));
CREATE POLICY user_settings_update_policy ON public.user_settings AS PERMISSIVE FOR UPDATE TO public USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));

-- -------------------------------------------------------------
-- 9. Triggers en tablas de public
-- -------------------------------------------------------------
CREATE TRIGGER set_budgets_updated_at BEFORE UPDATE ON public.budgets FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_recurring_rules_updated_at BEFORE UPDATE ON public.recurring_rules FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_user_settings_updated_at BEFORE UPDATE ON public.user_settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -------------------------------------------------------------
-- 10. Trigger en auth.users
-- (el trigger on_auth_user_created_seed_demo, que ejecuta
-- handle_anonymous_user_created() para usuarios anónimos, se define en
-- 0023_demo_trigger.sql / 0025_demo_trigger_order.sql y no se repite aquí)
-- -------------------------------------------------------------
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- -------------------------------------------------------------
-- 11. Datos semilla: categorías globales (user_id IS NULL)
-- -------------------------------------------------------------
INSERT INTO public.categories (id, name, color, icon, is_essential) VALUES ('0752d607-0b8a-40db-9188-796bc2ea3480', 'Ingresos', '#22C55E', 'trending-up', false);
INSERT INTO public.categories (id, name, color, icon, is_essential) VALUES ('f34c1a55-1fd7-4ec6-87a2-0a70d1bdca1a', 'Comida', '#F97316', 'utensils', false);
INSERT INTO public.categories (id, name, color, icon, is_essential) VALUES ('df91601a-0db2-4724-9cc9-30fc855064a9', 'Transporte', '#3B82F6', 'car', false);
INSERT INTO public.categories (id, name, color, icon, is_essential) VALUES ('04d914b1-6ce5-4e9b-8c74-af75bdcbe53d', 'Ocio', '#EC4899', 'popcorn', false);
INSERT INTO public.categories (id, name, color, icon, is_essential) VALUES ('44172c6b-6108-446b-aba7-5d62a700fc2c', 'Otros', '#71717A', 'shapes', false);
INSERT INTO public.categories (id, name, color, icon, is_essential) VALUES ('67ab8b47-d29f-425b-9f1d-949262f5324a', 'Salud', '#14B8A6', 'stethoscope', true);
INSERT INTO public.categories (id, name, color, icon, is_essential) VALUES ('b51ab20d-6982-4b7d-b797-1d0c4ece6581', 'Suscripciones', '#6366F1', 'repeat', true);
INSERT INTO public.categories (id, name, color, icon, is_essential) VALUES ('d30bd8b3-98c0-4f4e-b891-83e35c581d42', 'Vivienda', '#A855F7', 'home', true);
