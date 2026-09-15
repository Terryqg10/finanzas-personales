'use server';

import { revalidatePath } from 'next/cache';

import { getUserSettings } from '@/lib/data/user-settings';
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
  });

  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Datos inválidos.' };
  }

  let supabase;
  try {
    supabase = await createClient();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error de configuración del servidor.';
    return { status: 'error', message };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: 'error', message: 'Tu sesión ha expirado. Inicia sesión de nuevo.' };
  }

  // Fase 6: sin selector de moneda todavía (llega en la Fase 7).
  // El movimiento se registra en la moneda base del usuario, con
  // tasa 1 — currency_original y currency_base coinciden a propósito.
  let settings;
  try {
    settings = await getUserSettings();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'No se pudo determinar tu moneda base.';
    return { status: 'error', message };
  }

  const { error } = await supabase.from('transactions').insert({
    user_id: user.id,
    category_id: parsed.data.categoryId,
    type: parsed.data.type,
    description: parsed.data.description,
    date: parsed.data.date,
    amount_original: parsed.data.amount,
    currency_original: settings.base_currency,
    currency_base: settings.base_currency,
    exchange_rate_used: 1,
  });

  if (error) {
    if (error.code === '23503') {
      return { status: 'error', message: 'La categoría elegida ya no existe.' };
    }
    return { status: 'error', message: 'No se pudo registrar el movimiento. Inténtalo de nuevo.' };
  }

  revalidatePath('/movimientos');
  revalidatePath('/');
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
  });

  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Datos inválidos.' };
  }

  let supabase;
  try {
    supabase = await createClient();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error de configuración del servidor.';
    return { status: 'error', message };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: 'error', message: 'Tu sesión ha expirado. Inicia sesión de nuevo.' };
  }

  // No se toca exchange_rate_used ni currency_*: editar corrige datos
  // dentro de la misma moneda, no re-convierte. amount_base se
  // recalcula solo al cambiar amount_original (columna generada).
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

  let supabase;
  try {
    supabase = await createClient();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error de configuración del servidor.';
    return { status: 'error', message };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: 'error', message: 'Tu sesión ha expirado. Inicia sesión de nuevo.' };
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
