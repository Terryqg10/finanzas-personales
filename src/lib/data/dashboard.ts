import { createClient } from '@/lib/supabase/server';

export interface BalanceSummary {
  balance: number;
  income: number;
  expense: number;
  currency: string;
  otherCurrencyCount: number;
}

export async function getBalanceSummary(currency: string): Promise<BalanceSummary> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc('get_balance_summary', { p_currency: currency })
    .single();

  if (error || !data) {
    throw new Error('No se pudo calcular el saldo.');
  }

  return {
    balance: data.income - data.expense,
    income: data.income,
    expense: data.expense,
    currency,
    otherCurrencyCount: data.other_currency_count,
  };
}

export interface CategoryBreakdownItem {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  total: number;
}

export async function getCategoryBreakdown(
  currency: string,
  start: string,
  end: string,
): Promise<CategoryBreakdownItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_category_breakdown', {
    p_currency: currency,
    p_start: start,
    p_end: end,
  });

  if (error) {
    throw new Error('No se pudo cargar el gasto por categoría.');
  }

  return (data ?? []).map((row) => ({
    categoryId: row.category_id,
    categoryName: row.category_name,
    categoryColor: row.category_color,
    total: row.total,
  }));
}

export interface MonthlyEvolutionItem {
  month: string;
  income: number;
  expense: number;
}

export async function getMonthlyEvolution(
  currency: string,
  months = 6,
): Promise<MonthlyEvolutionItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_monthly_evolution', {
    p_currency: currency,
    p_months: months,
  });

  if (error) {
    throw new Error('No se pudo cargar la evolución mensual.');
  }

  return (data ?? []).map((row) => ({
    month: row.month,
    income: row.income,
    expense: row.expense,
  }));
}

export interface BudgetProgressItem {
  budgetId: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  monthlyLimit: number;
  alertThreshold: number;
  spent: number;
}

export async function getBudgetProgress(currency: string): Promise<BudgetProgressItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_budget_progress', { p_currency: currency });

  if (error) {
    throw new Error('No se pudo cargar el progreso de presupuestos.');
  }

  return (data ?? []).map((row) => ({
    budgetId: row.budget_id,
    categoryId: row.category_id,
    categoryName: row.category_name,
    categoryColor: row.category_color,
    monthlyLimit: row.monthly_limit,
    alertThreshold: row.alert_threshold,
    spent: row.spent,
  }));
}

export interface PendingReminderItem {
  ruleId: string;
  description: string;
  amount: number;
  currency: string;
  type: 'income' | 'expense';
  categoryName: string;
  categoryColor: string;
  nextDueDate: string;
}

export async function getPendingRecurringReminders(): Promise<PendingReminderItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_pending_recurring_reminders');

  if (error) {
    throw new Error('No se pudieron cargar los recordatorios pendientes.');
  }

  return (data ?? []).map((row) => ({
    ruleId: row.rule_id,
    description: row.description,
    amount: row.amount,
    currency: row.currency,
    type: row.type as 'income' | 'expense',
    categoryName: row.category_name,
    categoryColor: row.category_color,
    nextDueDate: row.next_due_date,
  }));
}
