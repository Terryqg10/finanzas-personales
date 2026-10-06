import { z } from 'zod';

import type { ParseError } from '@/lib/import/imagin-csv';

export const IMPORT_MAX_BYTES = 1_000_000;
export const IMPORT_MAX_ROWS = 500;

const importTextSchema = z
  .string()
  .min(1, 'El archivo está vacío.')
  .max(IMPORT_MAX_BYTES, 'El archivo es demasiado grande (máximo 1 MB).');

export const previewImportSchema = z.object({
  text: importTextSchema,
});

export const confirmImportSchema = z.object({
  text: importTextSchema,
  selections: z
    .array(
      z.object({
        key: z.string().min(1),
        categoryId: z.string().uuid('Elige una categoría para cada movimiento.'),
      }),
    )
    .min(1, 'Selecciona al menos un movimiento.')
    .max(IMPORT_MAX_ROWS, `Máximo ${IMPORT_MAX_ROWS} movimientos por importación.`),
});

export interface ImportPreviewRow {
  key: string;
  line: number;
  date: string;
  description: string;
  type: 'income' | 'expense';
  amount: number;
  currency: string;
  /** `existing`: ya importada antes (se omite). */
  status: 'new' | 'existing';
  isInternalTransfer: boolean;
}

export type ImportPreviewResult =
  | { status: 'ok'; rows: ImportPreviewRow[]; errors: ParseError[] }
  | { status: 'error'; message: string };

export type ImportConfirmResult =
  | { status: 'success'; imported: number; skipped: number; message: string }
  | { status: 'error'; message: string };
