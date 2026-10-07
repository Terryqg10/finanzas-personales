import { NextResponse } from 'next/server';

import { deletePushSubscription } from '@/lib/data/push-subscriptions';
import { createClient } from '@/lib/supabase/server';
import { unsubscribePushSchema } from '@/lib/validations/push';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo de la petición inválido.' }, { status: 400 });
  }

  const parsed = unsubscribePushSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Suscripción inválida.' },
      { status: 400 },
    );
  }

  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return NextResponse.json({ error: 'Error de configuración del servidor.' }, { status: 500 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Sesión expirada.' }, { status: 401 });
  }

  // RLS limita el borrado a las suscripciones del propio usuario.
  const deleted = await deletePushSubscription(supabase, parsed.data.endpoint);

  if (!deleted) {
    return NextResponse.json(
      { error: 'No se pudo desactivar las notificaciones en este dispositivo.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
