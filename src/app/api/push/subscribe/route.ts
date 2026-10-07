import { NextResponse } from 'next/server';

import { savePushSubscription } from '@/lib/data/push-subscriptions';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { subscribePushSchema } from '@/lib/validations/push';

const MAX_USER_AGENT_LENGTH = 300;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo de la petición inválido.' }, { status: 400 });
  }

  const parsed = subscribePushSchema.safeParse(body);

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

  // Los usuarios de la demo no tienen email ni consentimiento: no reciben avisos.
  if (user.is_anonymous) {
    return NextResponse.json(
      { error: 'Las notificaciones no están disponibles en el modo demo.' },
      { status: 403 },
    );
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: 'Error de configuración del servidor.' }, { status: 500 });
  }

  const saved = await savePushSubscription(supabase, admin, {
    userId: user.id,
    endpoint: parsed.data.endpoint,
    p256dh: parsed.data.keys.p256dh,
    auth: parsed.data.keys.auth,
    userAgent: request.headers.get('user-agent')?.slice(0, MAX_USER_AGENT_LENGTH) ?? null,
  });

  if (!saved) {
    return NextResponse.json(
      { error: 'No se pudo activar las notificaciones en este dispositivo.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
