import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/supabase';

export type UserSettings = Database['public']['Tables']['user_settings']['Row'];

export async function getUserSettings(): Promise<UserSettings> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('No hay sesión activa.');
  }

  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error || !data) {
    throw new Error('No se pudo cargar tu configuración.');
  }

  return data;
}
