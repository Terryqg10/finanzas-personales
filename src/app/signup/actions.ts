'use server';
import { MULTI_USER_SIGNUP_ENABLED } from '@/lib/feature-flags';
import { createClient } from '@/lib/supabase/server';
import { signupSchema, type AuthActionState } from '@/lib/validations/auth';

export async function signup(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!MULTI_USER_SIGNUP_ENABLED) {
    return { status: 'error', message: 'El registro no está disponible en este momento.' };
  }
  const parsed = signupSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
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

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { status: 'error', message: error.message };
  }

  if (data.user?.identities?.length === 0) {
    return {
      status: 'error',
      message: 'Ya existe una cuenta con este email. Inicia sesión en su lugar.',
    };
  }

  return {
    status: 'success',
    message: 'Cuenta creada. Revisa tu correo para confirmar tu email antes de iniciar sesión.',
  };
}
