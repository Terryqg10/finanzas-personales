import { createBrowserClient } from '@supabase/ssr';

import { getSupabaseEnv } from '@/lib/env';
import type { Database } from '@/types/supabase';

/**
 * Crea un cliente de Supabase para el navegador.
 * Úsalo únicamente dentro de Client Components (archivos con 'use client').
 * Para Server Components, Server Actions o Route Handlers, usa
 * `@/lib/supabase/server` en su lugar — mezclarlos rompe el manejo de sesión.
 *
 * El genérico <Database> da autocompletado y chequeo de tipos reales
 * en cada .from('tabla').select() — errores de nombre de columna o
 * de tabla se detectan en compilación, no en producción.
 */
export function createClient() {
  const { url, anonKey } = getSupabaseEnv();
  return createBrowserClient<Database>(url, anonKey);
}
