'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

import { createClient } from '@/lib/supabase/server';
import {
  createCategorySchema,
  updateCategorySchema,
  type CategoryActionState,
} from '@/lib/validations/category';

export async function createCategory(
  _prevState: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  const parsed = createCategorySchema.safeParse({
    name: formData.get('name'),
    color: formData.get('color'),
    icon: formData.get('icon'),
    isEssential: formData.get('isEssential'),
  });

  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Datos inválidos.' };
  }

  const userId = (await headers()).get('x-user-id');

  if (!userId) {
    return { status: 'error', message: 'Tu sesión ha expirado. Inicia sesión de nuevo.' };
  }

  const supabase = await createClient();

  const { error } = await supabase.from('categories').insert({
    user_id: userId,
    name: parsed.data.name,
    color: parsed.data.color,
    icon: parsed.data.icon,
    is_essential: parsed.data.isEssential,
  });

  if (error) {
    if (error.code === '23505') {
      return { status: 'error', message: 'Ya tienes una categoría con ese nombre.' };
    }
    return { status: 'error', message: 'No se pudo crear la categoría. Inténtalo de nuevo.' };
  }

  revalidatePath('/configuracion/categorias');
  return { status: 'success', message: 'Categoría creada.' };
}

export async function updateCategory(
  _prevState: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  const parsed = updateCategorySchema.safeParse({
    id: formData.get('id'),
    name: formData.get('name'),
    color: formData.get('color'),
    icon: formData.get('icon'),
    isEssential: formData.get('isEssential'),
  });

  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Datos inválidos.' };
  }

  const userId = (await headers()).get('x-user-id');

  if (!userId) {
    return { status: 'error', message: 'Tu sesión ha expirado. Inicia sesión de nuevo.' };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('categories')
    .update({
      name: parsed.data.name,
      color: parsed.data.color,
      icon: parsed.data.icon,
      is_essential: parsed.data.isEssential,
    })
    .eq('id', parsed.data.id)
    .select('id');

  if (error) {
    if (error.code === '23505') {
      return { status: 'error', message: 'Ya tienes una categoría con ese nombre.' };
    }
    return { status: 'error', message: 'No se pudo actualizar la categoría. Inténtalo de nuevo.' };
  }

  if (!data || data.length === 0) {
    return { status: 'error', message: 'No tienes permiso para editar esta categoría.' };
  }

  revalidatePath('/configuracion/categorias');
  return { status: 'success', message: 'Categoría actualizada.' };
}
