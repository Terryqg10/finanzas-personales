import { z } from 'zod';

/** Tope de movimientos por borrado de una selección. */
export const BULK_DELETE_MAX = 500;

/** Fecha ISO `aaaa-mm-dd` que además existe en el calendario (rechaza 2026-02-31). */
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Elige una fecha válida.')
  .refine((value) => {
    const [year, month, day] = value.split('-').map(Number);
    if (year === undefined || month === undefined || day === undefined) return false;
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    );
  }, 'Elige una fecha válida.');

export const deleteTransactionsSchema = z.object({
  ids: z
    .array(z.string().uuid('Identificador inválido.'))
    .transform((ids) => [...new Set(ids)])
    .pipe(
      z
        .array(z.string())
        .min(1, 'Selecciona al menos un movimiento.')
        .max(BULK_DELETE_MAX, `Máximo ${BULK_DELETE_MAX} movimientos por borrado.`),
    ),
});

/** Periodo `desde`–`hasta` (ambos incluidos) y, opcionalmente, solo los movimientos importados. */
export const transactionRangeSchema = z
  .object({
    from: isoDate,
    to: isoDate,
    onlyImported: z.boolean(),
  })
  .refine((range) => range.from <= range.to, {
    message: '"Desde" no puede ser posterior a "Hasta".',
    path: ['to'],
  });

export type TransactionRange = z.infer<typeof transactionRangeSchema>;

export interface BulkDeleteState {
  status: 'idle' | 'error' | 'success';
  message: string | null;
  /** Cuántos movimientos se borraron (solo en `success`). */
  deleted?: number;
}

export const initialBulkDeleteState: BulkDeleteState = { status: 'idle', message: null };

export type CountRangeResult =
  { status: 'ok'; count: number } | { status: 'error'; message: string };

/** Singular o plural: "1 movimiento" / "5 movimientos". */
export function formatMovementCount(count: number): string {
  return `${count} movimiento${count === 1 ? '' : 's'}`;
}
