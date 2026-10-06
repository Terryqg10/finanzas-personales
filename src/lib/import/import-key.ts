/**
 * Huella de cada movimiento importado y detección de transferencias internas.
 * Funciones puras. Spec: specs/importacion-extractos.md, secciones 3 y 4.
 */

import type { ParsedRow } from './imagin-csv';

/** Minúsculas, sin tildes y con los espacios colapsados. */
export function normalizeConcept(description: string): string {
  return description.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function buildBaseKey(row: ParsedRow): string {
  const signedAmount = `${row.type === 'expense' ? '-' : '+'}${row.amount.toFixed(2)}`;
  return [row.date, normalizeConcept(row.description), signedAmount, row.balance.toFixed(2)].join(
    '|',
  );
}

/**
 * Clave de importación por fila, en el mismo orden que `rows`.
 * Fecha + concepto + importe + saldo posterior ya distingue cada movimiento;
 * solo cuando dos filas son idénticas incluso en el saldo se añade `#n`
 * (n = 2, 3…) para que sigan siendo únicas y estables al reimportar.
 */
export function assignImportKeys(rows: readonly ParsedRow[]): string[] {
  const seen = new Map<string, number>();

  return rows.map((row) => {
    const baseKey = buildBaseKey(row);
    const occurrence = (seen.get(baseKey) ?? 0) + 1;
    seen.set(baseKey, occurrence);

    return occurrence === 1 ? baseKey : `${baseKey}#${occurrence}`;
  });
}

// Movimientos entre fondos propios de Imagin (huchas): ni gasto ni ingreso reales.
const INTERNAL_TRANSFER_PREFIXES = ['transfer.hucha', 'aportacion a'] as const;

export function isInternalTransfer(description: string): boolean {
  const normalized = normalizeConcept(description);
  return INTERNAL_TRANSFER_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}
