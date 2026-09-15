import { z } from 'zod';

export const createTransactionSchema = z.object({
  type: z.enum(['income', 'expense'], { message: 'Elige un tipo de movimiento.' }),
  description: z
    .string()
    .trim()
    .min(1, 'La descripción es obligatoria.')
    .max(200, 'Máximo 200 caracteres.'),
  date: z.string().refine((val) => !Number.isNaN(Date.parse(val)), 'Fecha inválida.'),
  amount: z.coerce
    .number({ message: 'Introduce una cantidad válida.' })
    .positive('La cantidad debe ser mayor que cero.')
    .max(999_999_999, 'Cantidad demasiado alta.'),
  categoryId: z.string().uuid('Elige una categoría.'),
});
export const updateTransactionSchema = createTransactionSchema.extend({
  id: z.string().uuid('Identificador inválido.'),
});
export const deleteTransactionSchema = z.object({
  id: z.string().uuid('Identificador inválido.'),
});

export interface TransactionActionState {
  status: 'idle' | 'error' | 'success';
  message: string | null;
}

export const initialTransactionState: TransactionActionState = { status: 'idle', message: null };
