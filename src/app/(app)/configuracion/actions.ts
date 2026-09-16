'use server';

import { createClient } from '@/lib/supabase/server';
import { updateBaseCurrencySchema, type SettingsActionState } from '@/lib/validations/settings';

export async function updateBaseCurrency(
  _prevState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const parsed = updateBaseCurrencySchema.safeParse({
    baseCurrency: formData.get('baseCurrency'),
  });

  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Moneda inválida.' };
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

  const { error } = await supabase
    .from('user_settings')
    .update({ base_currency: parsed.data.baseCurrency })
    .eq('user_id', user.id);

  if (error) {
    return {
      status: 'error',
      message: 'No se pudo actualizar la moneda base. Inténtalo de nuevo.',
    };
  }

  return { status: 'success', message: 'Moneda base actualizada.' };
}
