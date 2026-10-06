import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/supabase';

type Client = SupabaseClient<Database>;
type TransactionInsert = Database['public']['Tables']['transactions']['Insert'];

const PAGE_SIZE = 1000;

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
