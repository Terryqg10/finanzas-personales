import { z } from 'zod';

import { SUPPORTED_CURRENCY_CODES } from '@/lib/currencies';

export const updateBaseCurrencySchema = z.object({
  baseCurrency: z.enum(SUPPORTED_CURRENCY_CODES, { message: 'Moneda no soportada.' }),
});

export const updateSavingsRateSchema = z.object({
  savingsRateTarget: z.coerce
    .number({ message: 'Introduce un porcentaje válido.' })
    .min(0, 'El porcentaje mínimo es 0.')
    .max(100, 'El porcentaje máximo es 100.'),
});

export interface SettingsActionState {
  status: 'idle' | 'error' | 'success';
  message: string | null;
}

export const initialSettingsState: SettingsActionState = { status: 'idle', message: null };
