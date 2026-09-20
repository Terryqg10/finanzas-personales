'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';
import {
  createFixedExpenseSchema,
  deleteFixedExpenseSchema,
  toggleFixedExpenseSchema,
  updateFixedExpenseSchema,
  type FixedExpenseActionState,
} from '@/lib/validations/fixed-expense';

export async function createFixedExpense(
  _prevState: FixedExpenseActionState,
  formData: FormData,
): Promise<FixedExpenseActionState> {
  const parsed = createFixedExpenseSchema.safeParse({
    description: formData.get('description'),
    amount: formData.get('amount'),
    currency: formData.get('currency'),
    categoryId: formData.get('categoryId'),
    frequency: formData.get('frequency'),
    nextDueDate: formData.get('nextDueDate'),
  });

  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Datos inválidos.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: 'error', message: 'Tu sesión ha expirado. Inicia sesión de nuevo.' };
  }

  const { error } = await supabase.from('recurring_rules').insert({
    user_id: user.id,
    type: 'expense',
    description: parsed.data.description,
    amount: parsed.data.amount,
    currency: parsed.data.currency,
    category_id: parsed.data.categoryId,
    frequency: parsed.data.frequency,
    next_due_date: parsed.data.nextDueDate,
  });

  if (error) {
    return { status: 'error', message: 'No se pudo crear el gasto fijo. Inténtalo de nuevo.' };
  }

  revalidatePath('/gastos-fijos');
  revalidatePath('/');
  return { status: 'success', message: 'Gasto fijo creado.' };
}

export async function updateFixedExpense(
  _prevState: FixedExpenseActionState,
  formData: FormData,
): Promise<FixedExpenseActionState> {
  const parsed = updateFixedExpenseSchema.safeParse({
    id: formData.get('id'),
    description: formData.get('description'),
    amount: formData.get('amount'),
    currency: formData.get('currency'),
    categoryId: formData.get('categoryId'),
    frequency: formData.get('frequency'),
    nextDueDate: formData.get('nextDueDate'),
  });

  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Datos inválidos.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: 'error', message: 'Tu sesión ha expirado. Inicia sesión de nuevo.' };
  }

  const { data, error } = await supabase
    .from('recurring_rules')
    .update({
      description: parsed.data.description,
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      category_id: parsed.data.categoryId,
      frequency: parsed.data.frequency,
      next_due_date: parsed.data.nextDueDate,
    })
    .eq('id', parsed.data.id)
    .eq('type', 'expense')
    .select('id');

  if (error) {
    return {
      status: 'error',
      message: 'No se pudo actualizar el gasto fijo. Inténtalo de nuevo.',
    };
  }

  if (!data || data.length === 0) {
    return { status: 'error', message: 'No tienes permiso para editar este gasto fijo.' };
  }

  revalidatePath('/gastos-fijos');
  revalidatePath('/');
  return { status: 'success', message: 'Gasto fijo actualizado.' };
}

export async function deleteFixedExpense(
  _prevState: FixedExpenseActionState,
  formData: FormData,
): Promise<FixedExpenseActionState> {
  const parsed = deleteFixedExpenseSchema.safeParse({ id: formData.get('id') });

  if (!parsed.success) {
    return { status: 'error', message: 'Identificador inválido.' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('recurring_rules')
    .delete()
    .eq('id', parsed.data.id)
    .eq('type', 'expense')
    .select('id');

  if (error) {
    return { status: 'error', message: 'No se pudo borrar el gasto fijo. Inténtalo de nuevo.' };
  }

  if (!data || data.length === 0) {
    return { status: 'error', message: 'No tienes permiso para borrar este gasto fijo.' };
  }

  revalidatePath('/gastos-fijos');
  revalidatePath('/');
  return { status: 'success', message: 'Gasto fijo borrado.' };
}

export async function toggleFixedExpenseStatus(
  _prevState: FixedExpenseActionState,
  formData: FormData,
): Promise<FixedExpenseActionState> {
  const parsed = toggleFixedExpenseSchema.safeParse({
    id: formData.get('id'),
    status: formData.get('status'),
  });

  if (!parsed.success) {
    return { status: 'error', message: 'Datos inválidos.' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('recurring_rules')
    .update({ status: parsed.data.status })
    .eq('id', parsed.data.id)
    .eq('type', 'expense')
    .select('id');

  if (error) {
    return { status: 'error', message: 'No se pudo actualizar el estado. Inténtalo de nuevo.' };
  }

  if (!data || data.length === 0) {
    return { status: 'error', message: 'No tienes permiso para editar este gasto fijo.' };
  }

  revalidatePath('/gastos-fijos');
  revalidatePath('/');
  return {
    status: 'success',
    message: parsed.data.status === 'active' ? 'Gasto fijo reactivado.' : 'Gasto fijo pausado.',
  };
}
