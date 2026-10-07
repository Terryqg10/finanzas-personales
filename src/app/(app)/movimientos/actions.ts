'use server';

import type { SupabaseClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { after } from 'next/server';

import type { BudgetAlert } from '@/lib/budget-alerts';
import { getBudgetAlertForExpense } from '@/lib/data/budget-alerts';
import { claimBudgetAlertEmail } from '@/lib/data/budget-alert-emails';
import { getUserSettings } from '@/lib/data/user-settings';
import { buildBudgetAlertEmail } from '@/lib/email/budget-alert-email';
import { canSendBudgetAlertEmail } from '@/lib/email/budget-alert-eligibility';
import { APP_URL } from '@/lib/email/config';
import { sendEmail } from '@/lib/email/send-email';
import { getExchangeRate } from '@/lib/exchange-rate';
import { createClient } from '@/lib/supabase/server';
import {
  createTransactionSchema,
  deleteTransactionSchema,
  updateTransactionSchema,
  type TransactionActionState,
} from '@/lib/validations/transaction';
import type { Database } from '@/types/supabase';

/**
 * Prepara y encola el email de aviso. La reserva de la clave (usuario,
 * presupuesto, mes, nivel) se hace aquí, antes de responder, porque es lo que
 * decide quién envía; solo la llamada de red va en `after()`, para que el
 * usuario no espere a Resend. Es secundario: nunca lanza ni afecta al gasto.
 */
async function queueBudgetAlertEmail(params: {
  supabase: SupabaseClient<Database>;
  alert: BudgetAlert;
  currency: string;
  notifyEmail: boolean;
}): Promise<void> {
  try {
    const {
      data: { user },
    } = await params.supabase.auth.getUser();

    const to = user?.email;
    if (
      !user ||
      !to ||
      !canSendBudgetAlertEmail({
        email: to,
        isAnonymous: user.is_anonymous === true,
        notifyEmail: params.notifyEmail,
      })
    ) {
      return;
    }

    const claim = await claimBudgetAlertEmail(params.supabase, {
      userId: user.id,
      budgetId: params.alert.budgetId,
      level: params.alert.level,
    });

    if (claim === 'already_sent') return;
    if (claim === 'error') {
      console.error('[budget-alert-email] No se pudo reservar el aviso.');
      return;
    }

    const email = buildBudgetAlertEmail(params.alert, params.currency, APP_URL);

    after(async () => {
      const result = await sendEmail({ to, ...email });
      if (!result.ok) {
        console.error(`[budget-alert-email] ${result.reason}: ${result.message}`);
      }
    });
  } catch (err) {
    console.error('[budget-alert-email]', err instanceof Error ? err.message : err);
  }
}

export async function createTransaction(
  _prevState: TransactionActionState,
  formData: FormData,
): Promise<TransactionActionState> {
  const parsed = createTransactionSchema.safeParse({
    type: formData.get('type'),
    description: formData.get('description'),
    date: formData.get('date'),
    amount: formData.get('amount'),
    categoryId: formData.get('categoryId'),
    currency: formData.get('currency'),
  });

  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Datos inválidos.' };
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

  let settings;
  try {
    settings = await getUserSettings();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'No se pudo determinar tu moneda base.';
    return { status: 'error', message };
  }

  let rateResult;
  try {
    rateResult = await getExchangeRate(parsed.data.currency, settings.base_currency);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'No se pudo obtener la tasa de cambio.';
    return { status: 'error', message };
  }

  const { error } = await supabase.from('transactions').insert({
    user_id: userId,
    category_id: parsed.data.categoryId,
    type: parsed.data.type,
    description: parsed.data.description,
    date: parsed.data.date,
    amount_original: parsed.data.amount,
    currency_original: parsed.data.currency,
    currency_base: settings.base_currency,
    exchange_rate_used: rateResult.rate,
  });

  if (error) {
    if (error.code === '23503') {
      return { status: 'error', message: 'La categoría elegida ya no existe.' };
    }
    return { status: 'error', message: 'No se pudo registrar el movimiento. Inténtalo de nuevo.' };
  }

  revalidatePath('/movimientos');
  revalidatePath('/');

  // El aviso es secundario: el gasto ya está guardado, así que cualquier fallo
  // al calcularlo se descarta en silencio en vez de convertirlo en un error.
  let budgetAlert: BudgetAlert | null = null;
  if (parsed.data.type === 'expense') {
    try {
      budgetAlert = await getBudgetAlertForExpense({
        categoryId: parsed.data.categoryId,
        date: parsed.data.date,
        currency: parsed.data.currency,
        amount: parsed.data.amount,
        baseCurrency: settings.base_currency,
      });
    } catch {
      budgetAlert = null;
    }
  }

  if (budgetAlert) {
    await queueBudgetAlertEmail({
      supabase,
      alert: budgetAlert,
      currency: settings.base_currency,
      notifyEmail: settings.notify_email,
    });
  }

  if (rateResult.stale) {
    return {
      status: 'success',
      message:
        'Movimiento registrado. Aviso: el servicio de tasas de cambio no respondió, se usó la última tasa conocida.',
      budgetAlert,
    };
  }

  return { status: 'success', message: 'Movimiento registrado.', budgetAlert };
}

export async function updateTransaction(
  _prevState: TransactionActionState,
  formData: FormData,
): Promise<TransactionActionState> {
  const parsed = updateTransactionSchema.safeParse({
    id: formData.get('id'),
    type: formData.get('type'),
    description: formData.get('description'),
    date: formData.get('date'),
    amount: formData.get('amount'),
    categoryId: formData.get('categoryId'),
    currency: formData.get('currency'),
  });

  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Datos inválidos.' };
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

  const { data, error } = await supabase
    .from('transactions')
    .update({
      category_id: parsed.data.categoryId,
      type: parsed.data.type,
      description: parsed.data.description,
      date: parsed.data.date,
      amount_original: parsed.data.amount,
    })
    .eq('id', parsed.data.id)
    .select('id');

  if (error) {
    if (error.code === '23503') {
      return { status: 'error', message: 'La categoría elegida ya no existe.' };
    }
    return { status: 'error', message: 'No se pudo actualizar el movimiento. Inténtalo de nuevo.' };
  }

  if (!data || data.length === 0) {
    return { status: 'error', message: 'No tienes permiso para editar este movimiento.' };
  }

  revalidatePath('/movimientos');
  revalidatePath('/');
  return { status: 'success', message: 'Movimiento actualizado.' };
}

export async function deleteTransaction(
  _prevState: TransactionActionState,
  formData: FormData,
): Promise<TransactionActionState> {
  const parsed = deleteTransactionSchema.safeParse({ id: formData.get('id') });

  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Datos inválidos.' };
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

  const { data, error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', parsed.data.id)
    .select('id');

  if (error) {
    return { status: 'error', message: 'No se pudo borrar el movimiento. Inténtalo de nuevo.' };
  }

  if (!data || data.length === 0) {
    return { status: 'error', message: 'No tienes permiso para borrar este movimiento.' };
  }

  revalidatePath('/movimientos');
  revalidatePath('/');
  return { status: 'success', message: 'Movimiento borrado.' };
}
