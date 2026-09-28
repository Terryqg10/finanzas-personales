import { NextResponse } from 'next/server';

import { buildTransactionRateMap } from '@/lib/currency-conversion';
import { getExchangeRate } from '@/lib/exchange-rate';
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

  const newCurrency = parsed.data.baseCurrency;

  const { data: settingsRow, error: settingsError } = await supabase
    .from('user_settings')
    .select('base_currency')
    .eq('user_id', user.id)
    .single();

  if (settingsError || !settingsRow) {
    return NextResponse.json({ error: 'No se pudo leer tu moneda base actual.' }, { status: 500 });
  }

  const oldCurrency = settingsRow.base_currency;

  // Misma moneda: no hay nada que reconvertir, solo re-guardar (ej. el
  // usuario confirma sin cambiar realmente el valor).
  if (oldCurrency === newCurrency) {
    const { error } = await supabase
      .from('user_settings')
      .update({ base_currency: newCurrency })
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: 'No se pudo actualizar la moneda base.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  }

  // Moneda base distinta: hay que reconvertir el historial ANTES de
  // guardar el cambio, para que movimientos y presupuestos no queden
  // "atrasados" en la moneda anterior (ver
  // specs/conversion-retroactiva-moneda-base.md).
  const { data: currencyRows, error: currencyError } = await supabase
    .from('transactions')
    .select('currency_original')
    .eq('user_id', user.id);

  if (currencyError) {
    return NextResponse.json(
      { error: 'No se pudieron leer tus movimientos para reconvertirlos.' },
      { status: 500 },
    );
  }

  const distinctCurrencies = [...new Set((currencyRows ?? []).map((row) => row.currency_original))];

  const { count: budgetCount, error: budgetCountError } = await supabase
    .from('budgets')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);

  if (budgetCountError) {
    return NextResponse.json(
      { error: 'No se pudieron leer tus presupuestos para reconvertirlos.' },
      { status: 500 },
    );
  }

  let transactionRates: Record<string, number>;
  let budgetRate: number | null = null;

  try {
    transactionRates = await buildTransactionRateMap(distinctCurrencies, newCurrency);

    if (budgetCount && budgetCount > 0) {
      const result = await getExchangeRate(oldCurrency, newCurrency);
      budgetRate = result.rate;
    }
  } catch {
    // Ni una sola tasa a medias: si falta cualquiera, se aborta todo el
    // cambio de moneda base antes de tocar la base de datos.
    return NextResponse.json(
      { error: 'No se pudo obtener la tasa de cambio para reconvertir tu historial.' },
      { status: 500 },
    );
  }

  const { error: conversionError } = await supabase.rpc('apply_base_currency_conversion', {
    p_new_currency: newCurrency,
    p_transaction_rates: transactionRates,
    p_budget_rate: budgetRate,
  });

  if (conversionError) {
    return NextResponse.json(
      { error: 'No se pudo reconvertir tu historial a la nueva moneda base.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
