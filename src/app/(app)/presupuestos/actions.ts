'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';
import {
  createBudgetSchema,
  deleteBudgetSchema,
  updateBudgetSchema,
  type BudgetActionState,
} from '@/lib/validations/budget';

export async function createBudget(
  _prevState: BudgetActionState,
  formData: FormData,
): Promise<BudgetActionState> {
  const parsed = createBudgetSchema.safeParse({
    categoryId: formData.get('categoryId'),
    monthlyLimit: formData.get('monthlyLimit'),
    alertThreshold: formData.get('alertThreshold'),
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

  const { error } = await supabase.from('budgets').insert({
    user_id: user.id,
    category_id: parsed.data.categoryId,
    monthly_limit: parsed.data.monthlyLimit,
    alert_threshold: parsed.data.alertThreshold,
  });

  if (error) {
    if (error.code === '23505') {
      return { status: 'error', message: 'Ya tienes un presupuesto para esa categoría.' };
    }
    return { status: 'error', message: 'No se pudo crear el presupuesto. Inténtalo de nuevo.' };
  }

  revalidatePath('/presupuestos');
  revalidatePath('/');
  return { status: 'success', message: 'Presupuesto creado.' };
}

export async function updateBudget(
  _prevState: BudgetActionState,
  formData: FormData,
): Promise<BudgetActionState> {
  const parsed = updateBudgetSchema.safeParse({
    id: formData.get('id'),
    monthlyLimit: formData.get('monthlyLimit'),
    alertThreshold: formData.get('alertThreshold'),
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
    .from('budgets')
    .update({
      monthly_limit: parsed.data.monthlyLimit,
      alert_threshold: parsed.data.alertThreshold,
    })
    .eq('id', parsed.data.id)
    .select('id');

  if (error) {
    return {
      status: 'error',
      message: 'No se pudo actualizar el presupuesto. Inténtalo de nuevo.',
    };
  }

  if (!data || data.length === 0) {
    return { status: 'error', message: 'No tienes permiso para editar este presupuesto.' };
  }

  revalidatePath('/presupuestos');
  revalidatePath('/');
  return { status: 'success', message: 'Presupuesto actualizado.' };
}

export async function deleteBudget(
  _prevState: BudgetActionState,
  formData: FormData,
): Promise<BudgetActionState> {
  const parsed = deleteBudgetSchema.safeParse({ id: formData.get('id') });

  if (!parsed.success) {
    return { status: 'error', message: 'Identificador inválido.' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('budgets')
    .delete()
    .eq('id', parsed.data.id)
    .select('id');

  if (error) {
    return { status: 'error', message: 'No se pudo borrar el presupuesto. Inténtalo de nuevo.' };
  }

  if (!data || data.length === 0) {
    return { status: 'error', message: 'No tienes permiso para borrar este presupuesto.' };
  }

  revalidatePath('/presupuestos');
  revalidatePath('/');
  return { status: 'success', message: 'Presupuesto borrado.' };
}
