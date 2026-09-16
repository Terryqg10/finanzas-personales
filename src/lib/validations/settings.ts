import { z } from 'zod';

import { SUPPORTED_CURRENCY_CODES } from '@/lib/currencies';

export const updateBaseCurrencySchema = z.object({
  baseCurrency: z.enum(SUPPORTED_CURRENCY_CODES, { message: 'Moneda no soportada.' }),
});

export interface SettingsActionState {
  status: 'idle' | 'error' | 'success';
  message: string | null;
}

export const initialSettingsState: SettingsActionState = { status: 'idle', message: null };
