/**
 * CSV de copia de seguridad de movimientos. Función pura, sin I/O.
 * Spec: specs/borrado-masivo-movimientos.md, sección 2.3.
 *
 * Separador `;`, UTF-8 con BOM y coma decimal: así Excel en español lo abre
 * directamente con las columnas bien separadas.
 */

export interface ExportRow {
  /** Fecha ISO `aaaa-mm-dd`. */
  date: string;
  description: string;
  categoryName: string;
  type: 'income' | 'expense';
  /** Importe positivo en la moneda original del movimiento. */
  amount: number;
  currency: string;
  source: 'manual' | 'imported' | 'recurring';
}

const BOM = '﻿';
const SEPARATOR = ';';
const LINE_BREAK = '\r\n';

const HEADER = ['Fecha', 'Concepto', 'Categoría', 'Tipo', 'Importe', 'Moneda', 'Origen'];

const TYPE_LABELS: Record<ExportRow['type'], string> = { income: 'Ingreso', expense: 'Gasto' };
const SOURCE_LABELS: Record<ExportRow['source'], string> = {
  manual: 'manual',
  imported: 'importado',
  recurring: 'recurrente',
};

/**
 * Un texto que empiece por `=`, `+`, `-` o `@` (o un tabulador) lo interpreta
 * Excel como fórmula: se le antepone un apóstrofe para que se quede en texto.
 * Los conceptos vienen del banco, así que no se pueden dar por fiables.
 */
function neutralizeFormula(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function escapeField(value: string): string {
  const safe = neutralizeFormula(value);
  return /[;"\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** Dos decimales como mínimo (hasta cuatro si el importe los tiene) y coma decimal. */
function formatAmount(amount: number): string {
  return amount
    .toFixed(4)
    .replace(/0{1,2}$/, '')
    .replace('.', ',');
}

export function buildTransactionsCsv(rows: readonly ExportRow[]): string {
  const lines = [
    HEADER.join(SEPARATOR),
    ...rows.map((row) =>
      [
        row.date,
        escapeField(row.description),
        escapeField(row.categoryName),
        TYPE_LABELS[row.type],
        formatAmount(row.amount),
        row.currency,
        SOURCE_LABELS[row.source],
      ].join(SEPARATOR),
    ),
  ];

  return BOM + lines.join(LINE_BREAK) + LINE_BREAK;
}

/** Nombre del archivo descargado, p. ej. `movimientos_2026-09-01_2026-09-30.csv`. */
export function buildExportFilename(from: string, to: string): string {
  return `movimientos_${from}_${to}.csv`;
}

/** Nombre del archivo de la copia de una selección, p. ej. `movimientos_seleccion_2026-10-12.csv`. */
export function buildSelectionFilename(isoDate: string): string {
  return `movimientos_seleccion_${isoDate}.csv`;
}

/** Forma mínima de un movimiento de la lista (con su categoría) que necesita la copia. */
export interface ExportableTransaction {
  date: string;
  description: string;
  type: 'income' | 'expense';
  amount_original: number;
  currency_original: string;
  source: 'manual' | 'imported' | 'recurring';
  categories: { name: string } | null;
}

/** Pasa un movimiento de la lista a una fila del CSV. */
export function toExportRow(transaction: ExportableTransaction): ExportRow {
  return {
    date: transaction.date,
    description: transaction.description,
    categoryName: transaction.categories?.name ?? 'Sin categoría',
    type: transaction.type,
    amount: transaction.amount_original,
    currency: transaction.currency_original,
    source: transaction.source,
  };
}
