import { z } from 'zod';

export const confirmReminderSchema = z.object({
  ruleId: z.string().uuid('Identificador inválido.'),
});

export const skipReminderSchema = z.object({
  ruleId: z.string().uuid('Identificador inválido.'),
});

export interface ReminderActionState {
  status: 'idle' | 'error' | 'success';
  message: string | null;
}

export const initialReminderState: ReminderActionState = { status: 'idle', message: null };
