'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

import { getUserSettings } from '@/lib/data/user-settings';
import { getExchangeRate } from '@/lib/exchange-rate';
import { createClient } from '@/lib/supabase/server';
import {
  createTransactionSchema,
  deleteTransactionSchema,
  updateTransactionSchema,
  type TransactionActionState,
} from '@/lib/validations/transaction';

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

  if (rateResult.stale) {
    return {
      status: 'success',
      message:
        'Movimiento registrado. Aviso: el servicio de tasas de cambio no respondió, se usó la última tasa conocida.',
    };
  }

  return { status: 'success', message: 'Movimiento registrado.' };
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
