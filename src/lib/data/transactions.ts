import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/supabase';

export type Transaction = Database['public']['Tables']['transactions']['Row'];

export type TransactionWithCategory = Transaction & {
  categories: { name: string; color: string; icon: string } | null;
};

export async function getRecentTransactions(limit = 10): Promise<TransactionWithCategory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('transactions')
    .select('*, categories(name, color, icon)')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`No se pudieron cargar los movimientos: ${error.message}`);
  }

  return data as unknown as TransactionWithCategory[];
}
