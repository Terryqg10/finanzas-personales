'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

import type { BudgetAlert } from '@/lib/budget-alerts';
import { getBudgetAlertForChange } from '@/lib/data/budget-alerts';
import { queueBudgetAlertNotifications } from '@/lib/data/queue-budget-alert-notifications';
import { getUserSettings } from '@/lib/data/user-settings';
import { getExchangeRate } from '@/lib/exchange-rate';
import { createClient } from '@/lib/supabase/server';
import {
  createTransactionSchema,
  deleteTransactionSchema,
  updateTransactionSchema,
  type TransactionActionState,
} from '@/lib/validations/transaction';
import {
  deleteTransactionsSchema,
  formatMovementCount,
  transactionRangeSchema,
  type BulkDeleteState,
  type CountRangeResult,
  type TransactionRange,
} from '@/lib/validations/transaction-bulk';

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
      budgetAlert = await getBudgetAlertForChange({
        before: null,
        after: {
          type: 'expense',
          categoryId: parsed.data.categoryId,
          date: parsed.data.date,
          amount: parsed.data.amount,
        },
        currency: parsed.data.currency,
        baseCurrency: settings.base_currency,
      });
    } catch {
      budgetAlert = null;
    }
  }

  if (budgetAlert) {
    await queueBudgetAlertNotifications({
      supabase,
      alert: budgetAlert,
      currency: settings.base_currency,
      notifyEmail: settings.notify_email,
      notifyPush: settings.notify_push,
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

  // Estado previo del gasto, para avisar solo por el aumento neto. Si no se
  // puede leer, se edita igualmente pero sin aviso (no hay "antes" fiable).
  const { data: previous } = await supabase
    .from('transactions')
    .select('category_id, type, date, amount_original, currency_original')
    .eq('id', parsed.data.id)
    .maybeSingle();

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

  // Como en la creación, el aviso es secundario: la edición ya está guardada,
  // así que cualquier fallo al calcularlo se descarta en silencio.
  let budgetAlert: BudgetAlert | null = null;
  if (previous && parsed.data.type === 'expense') {
    try {
      const settings = await getUserSettings();
      budgetAlert = await getBudgetAlertForChange({
        before: {
          type: previous.type,
          categoryId: previous.category_id,
          date: previous.date,
          amount: previous.amount_original,
        },
        after: {
          type: 'expense',
          categoryId: parsed.data.categoryId,
          date: parsed.data.date,
          amount: parsed.data.amount,
        },
        // La edición no cambia la moneda original del movimiento.
        currency: previous.currency_original,
        baseCurrency: settings.base_currency,
      });

      if (budgetAlert) {
        await queueBudgetAlertNotifications({
          supabase,
          alert: budgetAlert,
          currency: settings.base_currency,
          notifyEmail: settings.notify_email,
          notifyPush: settings.notify_push,
        });
      }
    } catch {
      budgetAlert = null;
    }
  }

  return { status: 'success', message: 'Movimiento actualizado.', budgetAlert };
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

// ---------------------------------------------------------------------------
// Borrado masivo (specs/borrado-masivo-movimientos.md)
// ---------------------------------------------------------------------------

type BulkContext =
  { ok: true; supabase: Awaited<ReturnType<typeof createClient>> } | { ok: false; message: string };

/** Sesión y cliente comunes a las acciones de borrado masivo. RLS limita todo al propio usuario. */
async function getBulkContext(): Promise<BulkContext> {
  const userId = (await headers()).get('x-user-id');

  if (!userId) {
    return { ok: false, message: 'Tu sesión ha expirado. Inicia sesión de nuevo.' };
  }

  try {
    return { ok: true, supabase: await createClient() };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'Error de configuración del servidor.',
    };
  }
}

/** Borra los movimientos seleccionados (hasta 500) en una sola sentencia. */
export async function deleteTransactions(
  _prevState: BulkDeleteState,
  formData: FormData,
): Promise<BulkDeleteState> {
  const parsed = deleteTransactionsSchema.safeParse({ ids: formData.getAll('ids').map(String) });

  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Datos inválidos.' };
  }

  const context = await getBulkContext();
  if (!context.ok) return { status: 'error', message: context.message };

  const { data, error } = await context.supabase
    .from('transactions')
    .delete()
    .in('id', parsed.data.ids)
    .select('id');

  if (error) {
    return {
      status: 'error',
      message: 'No se pudieron borrar los movimientos. Inténtalo de nuevo.',
    };
  }

  const deleted = data?.length ?? 0;

  if (deleted === 0) {
    return { status: 'error', message: 'No tienes permiso para borrar esos movimientos.' };
  }

  revalidatePath('/movimientos');
  revalidatePath('/');
  return {
    status: 'success',
    message: `${formatMovementCount(deleted)} borrado${deleted === 1 ? '' : 's'}.`,
    deleted,
  };
}

/** Cuenta los movimientos de un periodo, sin traerlos: es el paso de confirmación del borrado. */
export async function countTransactionsInRange(range: TransactionRange): Promise<CountRangeResult> {
  const parsed = transactionRangeSchema.safeParse(range);

  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Periodo inválido.' };
  }

  const context = await getBulkContext();
  if (!context.ok) return { status: 'error', message: context.message };

  let query = context.supabase
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .gte('date', parsed.data.from)
    .lte('date', parsed.data.to);

  if (parsed.data.onlyImported) {
    query = query.eq('source', 'imported');
  }

  const { count, error } = await query;

  if (error) {
    return {
      status: 'error',
      message: 'No se pudieron contar los movimientos. Inténtalo de nuevo.',
    };
  }

  return { status: 'ok', count: count ?? 0 };
}

/**
 * Borra todos los movimientos de un periodo. El servidor vuelve a validar el
 * rango (no se fía del paso de confirmación del cliente) y borra con una única
 * sentencia: o se borra todo o nada.
 */
export async function deleteTransactionsInRange(
  _prevState: BulkDeleteState,
  formData: FormData,
): Promise<BulkDeleteState> {
  const parsed = transactionRangeSchema.safeParse({
    from: formData.get('from'),
    to: formData.get('to'),
    onlyImported: formData.get('onlyImported') === 'true',
  });

  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Periodo inválido.' };
  }

  const context = await getBulkContext();
  if (!context.ok) return { status: 'error', message: context.message };

  let query = context.supabase
    .from('transactions')
    .delete({ count: 'exact' })
    .gte('date', parsed.data.from)
    .lte('date', parsed.data.to);

  if (parsed.data.onlyImported) {
    query = query.eq('source', 'imported');
  }

  const { count, error } = await query;

  if (error) {
    return {
      status: 'error',
      message: 'No se pudieron borrar los movimientos. Inténtalo de nuevo.',
    };
  }

  const deleted = count ?? 0;

  revalidatePath('/movimientos');
  revalidatePath('/');
  return {
    status: 'success',
    message:
      deleted === 0
        ? 'No había movimientos que borrar en ese periodo.'
        : `${formatMovementCount(deleted)} borrado${deleted === 1 ? '' : 's'}.`,
    deleted,
  };
}
