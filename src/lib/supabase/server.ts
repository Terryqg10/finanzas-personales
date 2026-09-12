import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { getSupabaseEnv } from '@/lib/env';
import type { Database } from '@/types/supabase';

/**
 * Crea un cliente de Supabase para el servidor (Server Components, Server
 * Actions, Route Handlers). Sincroniza la sesión leyendo y escribiendo
 * cookies a través de la API de Next.js.
 *
 * Nota: `setAll` puede fallar si se invoca desde un Server Component puro
 * (Next.js no permite mutar cookies fuera de Server Actions o Route
 * Handlers). Ese fallo se ignora intencionadamente aquí: el refresco de
 * sesión en esos casos lo cubrirá el middleware que añadiremos en la Fase 3.
 */
export async function createClient() {
  const { url, anonKey } = getSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Ver nota en el docblock: esperado si se llama desde un Server
          // Component. El middleware de la Fase 3 se encarga de refrescar.
        }
      },
    },
  });
}
