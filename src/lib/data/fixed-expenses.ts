import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/supabase';

export interface FixedExpense {
  ruleId: string;
  description: string;
  amount: number;
  currency: string;
  frequency: Database['public']['Enums']['recurring_frequency'];
  status: Database['public']['Enums']['recurring_status'];
  nextDueDate: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  isEssential: boolean;
}

export async function getFixedExpenses(): Promise<FixedExpense[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_fixed_expenses');

  if (error) {
    throw new Error('No se pudieron cargar los gastos fijos.');
  }

  return (data ?? []).map((row) => ({
    ruleId: row.rule_id,
    description: row.description,
    amount: row.amount,
    currency: row.currency,
    frequency: row.frequency as Database['public']['Enums']['recurring_frequency'],
    status: row.status as Database['public']['Enums']['recurring_status'],
    nextDueDate: row.next_due_date,
    categoryId: row.category_id,
    categoryName: row.category_name,
    categoryColor: row.category_color,
    categoryIcon: row.category_icon,
    isEssential: row.is_essential,
  }));
}
