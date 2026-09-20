import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/supabase';

/**
 * amount_base puede ser null: es una columna GENERATED de Postgres, y
 * el generador de tipos de Supabase la marca como nullable. Ojo con
 * eso al mostrarla o al operar con ella.
 */
export type Transaction = Database['public']['Tables']['transactions']['Row'];

export type TransactionWithCategory = Transaction & {
  categories: { name: string; color: string; icon: string } | null;
};

export function formatShortDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' }).format(date);
}

/**
 * Listado mínimo para verificar visualmente que un movimiento se creó
 * bien (Fase 6). El historial real, con filtros y paginación, es la
 * Fase 9 — esto no la sustituye.
 */
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
