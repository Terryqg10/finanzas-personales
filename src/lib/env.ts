/**
 * Valida y expone las variables de entorno de Supabase requeridas por ambos
 * clientes (navegador y servidor). Centralizado aquí para no duplicar la
 * validación ni fallar en producción con un mensaje críptico de "undefined".
 */
export function getSupabaseEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) {
    throw new Error(
      'Falta la variable de entorno NEXT_PUBLIC_SUPABASE_URL. Revisa tu archivo .env.local (o las Environment Variables de Vercel en producción).',
    );
  }

  if (!anonKey) {
    throw new Error(
      'Falta la variable de entorno NEXT_PUBLIC_SUPABASE_ANON_KEY. Revisa tu archivo .env.local (o las Environment Variables de Vercel en producción).',
    );
  }

  return { url, anonKey };
}
