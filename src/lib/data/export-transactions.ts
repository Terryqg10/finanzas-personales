import type { SupabaseClient } from '@supabase/supabase-js';

import type { ExportRow } from '@/lib/export/transactions-csv';
import type { TransactionRange } from '@/lib/validations/transaction-bulk';
import type { Database } from '@/types/supabase';

const PAGE_SIZE = 1000;
/** Tope de filas por descarga: si se supera, se avisa y no se descarga a medias. */
export const EXPORT_MAX_ROWS = 20_000;

export type ExportResult =
  { ok: true; rows: ExportRow[] } | { ok: false; reason: 'too_many' | 'error' };

/**
 * Movimientos de un periodo, con el nombre de su categoría, para la copia en
 * CSV. Paginado porque PostgREST limita las filas por respuesta; RLS filtra
 * por usuario. Spec: specs/borrado-masivo-movimientos.md, sección 3.2.
 */
export async function getTransactionsForExport(
  supabase: SupabaseClient<Database>,
  range: TransactionRange,
): Promise<ExportResult> {
  const rows: ExportRow[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    let query = supabase
      .from('transactions')
      .select(
        'date, description, amount_original, currency_original, type, source, categories(name)',
      )
      .gte('date', range.from)
      .lte('date', range.to)
      .order('date')
      .order('id')
      .range(from, from + PAGE_SIZE - 1);

    if (range.onlyImported) {
      query = query.eq('source', 'imported');
    }

    const { data, error } = await query;

    if (error) return { ok: false, reason: 'error' };

    for (const row of data) {
      rows.push({
        date: row.date,
        description: row.description,
        categoryName: row.categories?.name ?? 'Sin categoría',
        type: row.type,
        amount: row.amount_original,
        currency: row.currency_original,
        source: row.source,
      });
    }

    if (rows.length > EXPORT_MAX_ROWS) return { ok: false, reason: 'too_many' };
    if (data.length < PAGE_SIZE) return { ok: true, rows };
  }
}
