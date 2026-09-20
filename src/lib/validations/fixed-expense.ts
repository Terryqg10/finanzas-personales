import { z } from 'zod';

import { SUPPORTED_CURRENCY_CODES } from '@/lib/currencies';

export const FIXED_EXPENSE_FREQUENCIES = ['weekly', 'monthly', 'yearly'] as const;

export const FREQUENCY_LABELS: Record<(typeof FIXED_EXPENSE_FREQUENCIES)[number], string> = {
  weekly: 'Semanal',
  monthly: 'Mensual',
  yearly: 'Anual',
};

export const createFixedExpenseSchema = z.object({
  description: z
    .string()
    .trim()
    .min(1, 'La descripción es obligatoria.')
    .max(200, 'Máximo 200 caracteres.'),
  amount: z.coerce
    .number({ message: 'Introduce una cantidad válida.' })
    .positive('La cantidad debe ser mayor que cero.')
    .max(999_999_999, 'Cantidad demasiado alta.'),
  currency: z.enum(SUPPORTED_CURRENCY_CODES, { message: 'Moneda no soportada.' }),
  categoryId: z.string().uuid('Elige una categoría.'),
  frequency: z.enum(FIXED_EXPENSE_FREQUENCIES, { message: 'Elige una frecuencia.' }),
  nextDueDate: z.string().refine((val) => !Number.isNaN(Date.parse(val)), 'Fecha inválida.'),
});

export const updateFixedExpenseSchema = createFixedExpenseSchema.extend({
  id: z.string().uuid('Identificador inválido.'),
});

export const deleteFixedExpenseSchema = z.object({
  id: z.string().uuid('Identificador inválido.'),
});

export const toggleFixedExpenseSchema = z.object({
  id: z.string().uuid('Identificador inválido.'),
  status: z.enum(['active', 'paused'], { message: 'Estado inválido.' }),
});

export interface FixedExpenseActionState {
  status: 'idle' | 'error' | 'success';
  message: string | null;
}

export const initialFixedExpenseState: FixedExpenseActionState = { status: 'idle', message: null };
