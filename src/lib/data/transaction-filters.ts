import { createClient } from '@/lib/supabase/server';
import type { TransactionWithCategory } from '@/lib/data/transactions';

export interface TransactionFilters {
  dateFrom?: string;
  dateTo?: string;
  categoryIds?: string[];
  type?: 'income' | 'expense';
  amountMin?: number;
  amountMax?: number;
}

export interface PaginatedTransactions {
  transactions: TransactionWithCategory[];
  total: number;
  hasMore: boolean;
}

export async function getFilteredTransactions(
  filters: TransactionFilters,
  page: number,
  pageSize: number,
): Promise<PaginatedTransactions> {
  const supabase = await createClient();

  let query = supabase
    .from('transactions')
    .select('*, categories(name, color, icon)', { count: 'exact' })
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .range(page * pageSize, page * pageSize + pageSize - 1);

  if (filters.dateFrom) {
    query = query.gte('date', filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte('date', filters.dateTo);
  }
  if (filters.categoryIds && filters.categoryIds.length > 0) {
    query = query.in('category_id', filters.categoryIds);
  }
  if (filters.type) {
    query = query.eq('type', filters.type);
  }
  if (filters.amountMin !== undefined) {
    query = query.gte('amount_base', filters.amountMin);
  }
  if (filters.amountMax !== undefined) {
    query = query.lte('amount_base', filters.amountMax);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`No se pudieron cargar los movimientos: ${error.message}`);
  }

  const total = count ?? 0;

  return {
    transactions: data as unknown as TransactionWithCategory[],
    total,
    hasMore: (page + 1) * pageSize < total,
  };
}
