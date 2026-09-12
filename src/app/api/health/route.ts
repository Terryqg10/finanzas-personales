import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

/**
 * Endpoint temporal de diagnóstico (Fase 1, Tarea 1.5).
 * Confirma que la app puede autenticarse contra el servicio de Supabase.
 * No depende de ninguna tabla propia (esas se crean en la Fase 2) — usa
 * el servicio de Auth, que siempre responde si la URL y la key son válidas.
 * Se eliminará una vez validada la conexión.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.getSession();

    if (error) {
      return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
    }

    return NextResponse.json({ status: 'ok', message: 'Conexión con Supabase correcta.' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido.';
    return NextResponse.json({ status: 'error', message }, { status: 500 });
  }
}
