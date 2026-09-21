import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { getSupabaseEnv } from '@/lib/env';
import type { Database } from '@/types/supabase';

const PUBLIC_PATH_PREFIXES = ['/login', '/signup', '/auth'];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Header interno (nunca visible para el cliente) donde se propaga el id del
 * usuario ya verificado por este middleware, para que las Server Actions no
 * tengan que volver a llamar a `auth.getUser()` — que siempre hace un viaje
 * de red al servidor de Auth de Supabase — y así evitar verificar el mismo
 * JWT dos veces en la misma request. `.set()` (no `.append()`) sustituye
 * cualquier valor que el cliente intente inyectar por su cuenta, así que un
 * `x-user-id` falsificado nunca llega más allá de esta función.
 */
const USER_ID_HEADER = 'x-user-id';

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let supabaseResponse = NextResponse.next({ request });

  // Guarda las cookies que Supabase pida escribir (p. ej. al refrescar el
  // access token) para poder reaplicarlas, con sus `options` originales
  // (httpOnly, secure, maxAge...), sobre la respuesta final más abajo — la
  // reconstrucción de esa respuesta para añadir el header de usuario no debe
  // perder estas opciones de seguridad.
  let pendingCookies: { name: string; value: string; options?: CookieOptions }[] = [];

  const { url, anonKey } = getSupabaseEnv();

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        pendingCookies = cookiesToSet;
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        supabaseResponse = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          supabaseResponse.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublicPath(request.nextUrl.pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    return NextResponse.redirect(loginUrl);
  }

  if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup')) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = '/';
    return NextResponse.redirect(homeUrl);
  }

  // Reconstruye la request con el header ya fijado (nunca solo la respuesta:
  // lo que necesitan leer las Server Actions es la request que Next.js pasa
  // río abajo, no la respuesta que vuelve al navegador) y regenera
  // supabaseResponse a partir de ella para no perder las cookies de sesión
  // que `setAll` pudo haber escrito arriba.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(USER_ID_HEADER, user?.id ?? '');
  supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } });
  for (const { name, value, options } of pendingCookies) {
    supabaseResponse.cookies.set(name, value, options);
  }

  return supabaseResponse;
}
