-- =============================================================
-- 0010_rls_policies.sql
-- Fase 3, Tareas 3.2 (ya activada en Fase 2), 3.3 y 3.4 — Políticas RLS
-- =============================================================

CREATE POLICY categories_select_policy ON public.categories
  FOR SELECT USING (auth.uid() IS NOT NULL AND (user_id = auth.uid() OR user_id IS NULL));

CREATE POLICY categories_insert_policy ON public.categories
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY categories_update_policy ON public.categories
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY categories_delete_policy ON public.categories
  FOR DELETE USING (user_id = auth.uid());

CREATE POLICY transactions_owner_policy ON public.transactions
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY recurring_rules_owner_policy ON public.recurring_rules
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY budgets_owner_policy ON public.budgets
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY user_settings_select_policy ON public.user_settings
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY user_settings_update_policy ON public.user_settings
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY exchange_rate_snapshots_select_policy ON public.exchange_rate_snapshots
  FOR SELECT TO authenticated USING (true);