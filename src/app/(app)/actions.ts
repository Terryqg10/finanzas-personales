'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

import { getUserSettings } from '@/lib/data/user-settings';
import { getExchangeRate } from '@/lib/exchange-rate';
import { advanceDueDate } from '@/lib/recurring-dates';
import { createClient } from '@/lib/supabase/server';
import {
  confirmReminderSchema,
  skipReminderSchema,
  type ReminderActionState,
} from '@/lib/validations/recurring-reminder';

/**
 * Confirma un recordatorio de movimiento recurrente: crea el movimiento real
 * (source = 'recurring', vinculado a la regla) con los datos vigentes de la
 * regla —sin permitir editarlos aquí, tal como decidió Terry— y avanza
 * next_due_date según la frecuencia. Nunca se crea un movimiento sin este
 * paso explícito de confirmación.
 */
export async function confirmRecurringReminder(
  _prevState: ReminderActionState,
  formData: FormData,
): Promise<ReminderActionState> {
  const parsed = confirmReminderSchema.safeParse({ ruleId: formData.get('ruleId') });

  if (!parsed.success) {
    return { status: 'error', message: 'Identificador inválido.' };
  }

  const userId = (await headers()).get('x-user-id');

  if (!userId) {
    return { status: 'error', message: 'Tu sesión ha expirado. Inicia sesión de nuevo.' };
  }

  let supabase;
  try {
    supabase = await createClient();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error de configuración del servidor.';
    return { status: 'error', message };
  }

  const { data: rule, error: ruleError } = await supabase
    .from('recurring_rules')
    .select(
      'id, category_id, type, description, amount, currency, frequency, next_due_date, status',
    )
    .eq('id', parsed.data.ruleId)
    .eq('user_id', userId)
    .maybeSingle();

  if (ruleError || !rule) {
    return { status: 'error', message: 'No se encontró ese recordatorio.' };
  }

  if (rule.status !== 'active') {
    return { status: 'error', message: 'Este movimiento recurrente está pausado.' };
  }

  let settings;
  try {
    settings = await getUserSettings();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'No se pudo determinar tu moneda base.';
    return { status: 'error', message };
  }

  let rateResult;
  try {
    rateResult = await getExchangeRate(rule.currency, settings.base_currency);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'No se pudo obtener la tasa de cambio.';
    return { status: 'error', message };
  }

  const { error: insertError } = await supabase.from('transactions').insert({
    user_id: userId,
    category_id: rule.category_id,
    type: rule.type,
    description: rule.description,
    date: rule.next_due_date,
    amount_original: rule.amount,
    currency_original: rule.currency,
    currency_base: settings.base_currency,
    exchange_rate_used: rateResult.rate,
    source: 'recurring',
    recurring_rule_id: rule.id,
  });

  if (insertError) {
    return { status: 'error', message: 'No se pudo registrar el movimiento. Inténtalo de nuevo.' };
  }

  const nextDueDate = advanceDueDate(rule.next_due_date, rule.frequency);
  const { error: updateError } = await supabase
    .from('recurring_rules')
    .update({ next_due_date: nextDueDate })
    .eq('id', rule.id);

  if (updateError) {
    // El movimiento ya quedó registrado; solo avisamos de que la fecha del
    // recordatorio no se pudo avanzar, para que Terry lo revise a mano si
    // vuelve a aparecer antes de tiempo.
    revalidatePath('/');
    return {
      status: 'success',
      message:
        'Movimiento registrado, pero no se pudo actualizar la próxima fecha del recordatorio.',
    };
  }

  revalidatePath('/');
  revalidatePath('/movimientos');

  if (rateResult.stale) {
    return {
      status: 'success',
      message:
        'Movimiento registrado. Aviso: el servicio de tasas de cambio no respondió, se usó la última tasa conocida.',
    };
  }

  return { status: 'success', message: 'Movimiento registrado.' };
}

/**
 * Omite el recordatorio de este mes sin crear ningún movimiento: solo avanza
 * next_due_date según la frecuencia de la regla.
 */
export async function skipRecurringReminder(
  _prevState: ReminderActionState,
  formData: FormData,
): Promise<ReminderActionState> {
  const parsed = skipReminderSchema.safeParse({ ruleId: formData.get('ruleId') });

  if (!parsed.success) {
    return { status: 'error', message: 'Identificador inválido.' };
  }

  const userId = (await headers()).get('x-user-id');

  if (!userId) {
    return { status: 'error', message: 'Tu sesión ha expirado. Inicia sesión de nuevo.' };
  }

  const supabase = await createClient();

  const { data: rule, error: ruleError } = await supabase
    .from('recurring_rules')
    .select('id, frequency, next_due_date')
    .eq('id', parsed.data.ruleId)
    .eq('user_id', userId)
    .maybeSingle();

  if (ruleError || !rule) {
    return { status: 'error', message: 'No se encontró ese recordatorio.' };
  }

  const nextDueDate = advanceDueDate(rule.next_due_date, rule.frequency);
  const { error: updateError } = await supabase
    .from('recurring_rules')
    .update({ next_due_date: nextDueDate })
    .eq('id', rule.id);

  if (updateError) {
    return { status: 'error', message: 'No se pudo omitir el recordatorio. Inténtalo de nuevo.' };
  }

  revalidatePath('/');
  return { status: 'success', message: 'Recordatorio omitido hasta la próxima fecha.' };
}
