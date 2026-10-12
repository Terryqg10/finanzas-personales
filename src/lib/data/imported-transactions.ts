import type { SupabaseClient } from '@supabase/supabase-js';

import type { CategoryHistoryEntry } from '@/lib/import/suggest-categories';
import type { Database } from '@/types/supabase';

type Client = SupabaseClient<Database>;
type TransactionInsert = Database['public']['Tables']['transactions']['Insert'];

const PAGE_SIZE = 1000;
/** Tope de movimientos recientes que se leen para sugerir categorías (acota el coste). */
const CATEGORY_HISTORY_LIMIT = 5000;

/**
 * Historial reciente del usuario para sugerir categorías al importar: concepto,
 * tipo, categoría y fecha de sus últimos `CATEGORY_HISTORY_LIMIT` movimientos.
 * Paginado porque PostgREST limita las filas por respuesta; RLS filtra por usuario.
 * Spec: specs/importacion-categorias-automaticas.md, sección 4.2.
 */
export async function getCategoryHistory(supabase: Client): Promise<CategoryHistoryEntry[]> {
  const history: CategoryHistoryEntry[] = [];

  for (let from = 0; from < CATEGORY_HISTORY_LIMIT; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('transactions')
      .select('description, type, category_id, date')
      .order('date', { ascending: false })
      .order('id')
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error('No se pudo leer tu historial de categorías.');
    }

    for (const row of data) {
      history.push({
        description: row.description,
        type: row.type,
        categoryId: row.category_id,
        date: row.date,
      });
    }

    if (data.length < PAGE_SIZE) break;
  }

  return history;
}

/**
 * Claves de importación que el usuario ya tiene entre `dateFrom` y `dateTo`.
 * Se consulta por rango de fechas (y no con `IN (...)`) para no desbordar la
 * longitud de la URL con cientos de claves; PostgREST limita las filas por
 * respuesta, por eso se pagina. RLS filtra por usuario.
 */
export async function getExistingImportKeys(
  supabase: Client,
  dateFrom: string,
  dateTo: string,
): Promise<Set<string>> {
  const keys = new Set<string>();

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('transactions')
      .select('import_key')
      .not('import_key', 'is', null)
      .gte('date', dateFrom)
      .lte('date', dateTo)
      .order('id')
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error('No se pudieron comprobar los movimientos ya importados.');
    }

    for (const row of data) {
      if (row.import_key !== null) keys.add(row.import_key);
    }

    if (data.length < PAGE_SIZE) return keys;
  }
}

export type InsertImportedResult = { ok: true } | { ok: false; code: string | null };

/** Inserta el lote en una única sentencia: o entra todo o no entra nada. */
export async function insertImportedTransactions(
  supabase: Client,
  rows: TransactionInsert[],
): Promise<InsertImportedResult> {
  const { error } = await supabase.from('transactions').insert(rows);

  if (error) {
    return { ok: false, code: error.code ?? null };
  }

  return { ok: true };
}
