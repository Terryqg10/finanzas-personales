import { z } from 'zod';

export const createBudgetSchema = z.object({
  categoryId: z.string().uuid('Elige una categoría.'),
  monthlyLimit: z.coerce
    .number({ message: 'Introduce un límite válido.' })
    .positive('El límite debe ser mayor que cero.')
    .max(999_999_999, 'Límite demasiado alto.'),
  alertThreshold: z.coerce
    .number({ message: 'Introduce un umbral válido.' })
    .positive('El umbral debe ser mayor que cero.')
    .max(100, 'El umbral no puede superar el 100%.'),
});

export const updateBudgetSchema = createBudgetSchema.omit({ categoryId: true }).extend({
  id: z.string().uuid('Identificador inválido.'),
});

export const deleteBudgetSchema = z.object({
  id: z.string().uuid('Identificador inválido.'),
});

export interface BudgetActionState {
  status: 'idle' | 'error' | 'success';
  message: string | null;
}

export const initialBudgetState: BudgetActionState = { status: 'idle', message: null };
