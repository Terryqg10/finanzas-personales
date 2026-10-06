'use server';

import type { SupabaseClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

import { SUPPORTED_CURRENCY_CODES } from '@/lib/currencies';
import {
  getExistingImportKeys,
  insertImportedTransactions,
} from '@/lib/data/imported-transactions';
import { getUserSettings } from '@/lib/data/user-settings';
import { getExchangeRate } from '@/lib/exchange-rate';
import { parseImaginCsv, type ParseError, type ParsedRow } from '@/lib/import/imagin-csv';
import { assignImportKeys, isInternalTransfer } from '@/lib/import/import-key';
import { createClient } from '@/lib/supabase/server';
import {
  confirmImportSchema,
  IMPORT_MAX_ROWS,
  previewImportSchema,
  type ImportConfirmResult,
  type ImportPreviewResult,
  type ImportPreviewRow,
} from '@/lib/validations/import';
import type { Database } from '@/types/supabase';

interface KeyedRow {
  row: ParsedRow;
  key: string;
}

/** Primera y última fecha de las filas (ISO), para acotar la consulta de existentes. */
function getDateRange(entries: readonly KeyedRow[]): { from: string; to: string } {
  const dates = entries.map(({ row }) => row.date).sort();
  return { from: dates[0] ?? '', to: dates[dates.length - 1] ?? '' };
}

interface PreparedImport {
  supabase: SupabaseClient<Database>;
  userId: string;
  entries: KeyedRow[];
  errors: ParseError[];
  existing: Set<string>;
}

type PrepareResult = ({ ok: true } & PreparedImport) | { ok: false; message: string };

const DEMO_MESSAGE = 'La importación no está disponible en el modo demo.';

function isSupportedCurrency(code: string): boolean {
  return (SUPPORTED_CURRENCY_CODES as readonly string[]).includes(code);
}

/**
 * Pasos comunes de la vista previa y la confirmación. La confirmación vuelve a
 * ejecutarlos sobre el texto original: nada que llegue del cliente (claves,
 * importes) se da por bueno.
 */
async function prepareImport(text: string): Promise<PrepareResult> {
  let supabase: SupabaseClient<Database>;
  try {
    supabase = await createClient();
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'Error de configuración del servidor.',
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: 'Tu sesión ha expirado. Inicia sesión de nuevo.' };
  }
  if (user.is_anonymous) {
    return { ok: false, message: DEMO_MESSAGE };
  }

  const parsed = parseImaginCsv(text);
  if (!parsed.ok) {
    return { ok: false, message: parsed.message };
  }

  const errors = [...parsed.errors];
  const rows: ParsedRow[] = [];
  for (const row of parsed.rows) {
    if (isSupportedCurrency(row.currency)) {
      rows.push(row);
    } else {
      errors.push({ line: row.line, message: `La divisa ${row.currency} no está soportada.` });
    }
  }

  if (rows.length === 0) {
    return { ok: false, message: 'No hay ningún movimiento válido que importar.' };
  }
  if (rows.length > IMPORT_MAX_ROWS) {
    return {
      ok: false,
      message: `El archivo tiene más de ${IMPORT_MAX_ROWS} movimientos. Descarga un periodo más corto.`,
    };
  }

  const keys = assignImportKeys(rows);
  const entries: KeyedRow[] = [];
  rows.forEach((row, index) => {
    const key = keys[index];
    if (key !== undefined) entries.push({ row, key });
  });

  const range = getDateRange(entries);

  let existing: Set<string>;
  try {
    existing = await getExistingImportKeys(supabase, range.from, range.to);
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'No se pudo comprobar el historial.',
    };
  }

  return { ok: true, supabase, userId: user.id, entries, errors, existing };
}

export async function previewImport(text: string): Promise<ImportPreviewResult> {
  const input = previewImportSchema.safeParse({ text });
  if (!input.success) {
    return { status: 'error', message: input.error.issues[0]?.message ?? 'Archivo inválido.' };
  }

  const prepared = await prepareImport(input.data.text);
  if (!prepared.ok) {
    return { status: 'error', message: prepared.message };
  }

  const rows: ImportPreviewRow[] = prepared.entries.map(({ row, key }) => ({
    key,
    line: row.line,
    date: row.date,
    description: row.description,
    type: row.type,
    amount: row.amount,
    currency: row.currency,
    status: prepared.existing.has(key) ? 'existing' : 'new',
    isInternalTransfer: isInternalTransfer(row.description),
  }));

  return { status: 'ok', rows, errors: prepared.errors };
}

type TransactionInsert = Database['public']['Tables']['transactions']['Insert'];

export async function confirmImport(
  text: string,
  selections: { key: string; categoryId: string }[],
): Promise<ImportConfirmResult> {
  const input = confirmImportSchema.safeParse({ text, selections });
  if (!input.success) {
    return { status: 'error', message: input.error.issues[0]?.message ?? 'Datos inválidos.' };
  }

  const prepared = await prepareImport(input.data.text);
  if (!prepared.ok) {
    return { status: 'error', message: prepared.message };
  }

  const categoryByKey = new Map(input.data.selections.map((s) => [s.key, s.categoryId]));

  // Las categorías elegidas deben ser visibles para el usuario (RLS): la clave
  // foránea por sí sola no impide referenciar la categoría de otra cuenta.
  const categoryIds = [...new Set(categoryByKey.values())];
  const { data: visibleCategories, error: categoriesError } = await prepared.supabase
    .from('categories')
    .select('id')
    .in('id', categoryIds);

  if (categoriesError) {
    return { status: 'error', message: 'No se pudieron comprobar las categorías elegidas.' };
  }
  if (visibleCategories.length !== categoryIds.length) {
    return { status: 'error', message: 'Alguna de las categorías elegidas ya no existe.' };
  }

  let settings;
  try {
    settings = await getUserSettings();
  } catch (err) {
    return {
      status: 'error',
      message: err instanceof Error ? err.message : 'No se pudo determinar tu moneda base.',
    };
  }

  const selectedRows = prepared.entries.filter(({ key }) => categoryByKey.has(key));

  if (selectedRows.length === 0) {
    return { status: 'error', message: 'Ninguno de los movimientos elegidos está en el archivo.' };
  }

  const toImport = selectedRows.filter(({ key }) => !prepared.existing.has(key));

  const rates = new Map<string, number>();
  let usedStaleRate = false;
  try {
    for (const currency of new Set(toImport.map(({ row }) => row.currency))) {
      const result = await getExchangeRate(currency, settings.base_currency);
      rates.set(currency, result.rate);
      usedStaleRate ||= result.stale;
    }
  } catch (err) {
    return {
      status: 'error',
      message: err instanceof Error ? err.message : 'No se pudo obtener la tasa de cambio.',
    };
  }

  const buildInsert = ({ row, key }: KeyedRow): TransactionInsert | null => {
    const categoryId = categoryByKey.get(key);
    const rate = rates.get(row.currency);
    if (categoryId === undefined || rate === undefined) return null;

    return {
      user_id: prepared.userId,
      category_id: categoryId,
      type: row.type,
      description: row.description,
      date: row.date,
      amount_original: row.amount,
      currency_original: row.currency,
      currency_base: settings.base_currency,
      exchange_rate_used: rate,
      source: 'imported',
      import_key: key,
    };
  };

  let pending = toImport;
  let result = await insertPending(prepared.supabase, pending, buildInsert);

  // Dos importaciones simultáneas pueden chocar con el índice único (23505):
  // se vuelve a consultar qué existe ya y se reintenta una vez con el resto.
  if (!result.ok && result.code === '23505') {
    try {
      const range = getDateRange(pending);
      const nowExisting = await getExistingImportKeys(prepared.supabase, range.from, range.to);
      pending = pending.filter(({ key }) => !nowExisting.has(key));
    } catch {
      return {
        status: 'error',
        message: 'No se pudo completar la importación. Inténtalo de nuevo.',
      };
    }
    result = await insertPending(prepared.supabase, pending, buildInsert);
  }

  if (!result.ok) {
    return { status: 'error', message: 'No se pudo completar la importación. Inténtalo de nuevo.' };
  }

  revalidatePath('/movimientos');
  revalidatePath('/');

  const imported = pending.length;
  const skipped = selectedRows.length - imported;
  const parts = [
    `${imported} movimiento${imported === 1 ? '' : 's'} importado${imported === 1 ? '' : 's'}.`,
  ];
  if (skipped > 0) {
    parts.push(
      `${skipped} ya existía${skipped === 1 ? '' : 'n'} y se omitió${skipped === 1 ? '' : 'eron'}.`,
    );
  }
  if (usedStaleRate) {
    parts.push(
      'Aviso: el servicio de tasas de cambio no respondió, se usó la última tasa conocida.',
    );
  }

  return { status: 'success', imported, skipped, message: parts.join(' ') };
}

async function insertPending(
  supabase: SupabaseClient<Database>,
  pending: KeyedRow[],
  buildInsert: (item: KeyedRow) => TransactionInsert | null,
) {
  if (pending.length === 0) return { ok: true } as const;

  const inserts: TransactionInsert[] = [];
  for (const item of pending) {
    const insert = buildInsert(item);
    if (insert === null) return { ok: false, code: null } as const;
    inserts.push(insert);
  }

  return insertImportedTransactions(supabase, inserts);
}
