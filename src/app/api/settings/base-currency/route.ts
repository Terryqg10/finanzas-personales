import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { updateBaseCurrencySchema } from '@/lib/validations/settings';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo de la petición inválido.' }, { status: 400 });
  }

  const parsed = updateBaseCurrencySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Moneda inválida.' }, { status: 400 });
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
    .update({ base_currency: parsed.data.baseCurrency })
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: 'No se pudo actualizar la moneda base.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
