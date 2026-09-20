import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { updateSavingsRateSchema } from '@/lib/validations/settings';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo de la petición inválido.' }, { status: 400 });
  }

  const parsed = updateSavingsRateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Porcentaje inválido.' },
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

  const { error } = await supabase
    .from('user_settings')
    .update({ savings_rate_target: parsed.data.savingsRateTarget })
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json(
      { error: 'No se pudo actualizar el objetivo de ahorro.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
