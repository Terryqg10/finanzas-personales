'use server';

import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { loginSchema, type AuthActionState } from '@/lib/validations/auth';

export async function login(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
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

  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { status: 'error', message: 'Email o contraseña incorrectos.' };
  }

  redirect('/');
}

const DEMO_ERROR_MESSAGE = 'No se pudo iniciar la demo, inténtalo de nuevo.';

export async function startDemo(): Promise<AuthActionState> {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return { status: 'error', message: DEMO_ERROR_MESSAGE };
  }

  // El trigger de la base de datos siembra los datos de ejemplo al crear el usuario.
  const { error } = await supabase.auth.signInAnonymously();

  if (error) {
    return { status: 'error', message: DEMO_ERROR_MESSAGE };
  }

  redirect('/');
}
