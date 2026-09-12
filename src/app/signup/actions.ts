'use server';

import { createClient } from '@/lib/supabase/server';
import { signupSchema, type AuthActionState } from '@/lib/validations/auth';

export async function signup(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signupSchema.safeParse({
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

  const { error } = await supabase.auth.signUp(parsed.data);

  if (error) {
    return { status: 'error', message: error.message };
  }

  return {
    status: 'success',
    message: 'Cuenta creada. Revisa tu correo para confirmar tu email antes de iniciar sesión.',
  };
}
