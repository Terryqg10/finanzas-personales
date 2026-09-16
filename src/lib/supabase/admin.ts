import { createClient as createSupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/supabase';

/**
 * Cliente con la service_role key: ignora RLS por completo.
 *
 * Úsalo SOLO en código de servidor que necesite escribir en tablas
 * sin política de escritura para usuarios normales (ej.
 * exchange_rate_snapshots, cuya única política es de solo lectura
 * para 'authenticated' — ver Fase 3). Nunca lo importes en un Client
 * Component ni expongas esta key al navegador.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error('Falta la variable de entorno NEXT_PUBLIC_SUPABASE_URL.');
  }
  if (!serviceRoleKey) {
    throw new Error('Falta la variable de entorno SUPABASE_SERVICE_ROLE_KEY.');
  }

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
