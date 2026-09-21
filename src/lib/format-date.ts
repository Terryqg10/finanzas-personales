/**
 * Utilidades de formato de fecha sin dependencias del servidor (Supabase,
 * `next/headers`, etc.), para poder importarlas de forma segura tanto desde
 * Server Components como desde Client Components sin arrastrar código de
 * servidor al bundle del navegador.
 */
export function formatShortDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' }).format(date);
}
