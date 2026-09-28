import { getExchangeRate } from '@/lib/exchange-rate';
import { createClient } from '@/lib/supabase/server';

/** Monedas distintas presentes en los datos del usuario (movimientos, presupuestos, reglas recurrentes). */
export async function getUserCurrencies(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_user_currencies');

  if (error) {
    throw new Error('No se pudieron leer las monedas usadas en tus datos.');
  }

  return (data ?? []).map((row) => row.currency);
}

/** Mapa `moneda -> tasa hacia la moneda base actual`, listo para enviar como `p_rates` a las RPC del Dashboard. */
export type RateMap = Record<string, number>;

type GetRate = (base: string, quote: string) => Promise<{ rate: number }>;

/**
 * Calcula la tasa de cada moneda distinta hacia la moneda base actual, para
 * que las funciones RPC del Dashboard conviertan "al vuelo" sin tocar nada
 * guardado.
 *
 * A diferencia de la reconversión retroactiva (descartada), un fallo
 * puntual al obtener una tasa no debe tumbar el Dashboard entero: esa
 * moneda simplemente queda fuera del mapa, y las funciones RPC la cuentan
 * en `other_currency_count` en vez de excluir todo el saldo. Por eso aquí
 * se descartan en silencio (no se lanza), a diferencia de
 * `buildTransactionRateMap` de la Opción A, donde cualquier tasa faltante
 * debía abortar toda la operación porque escribía datos.
 */
export async function buildRateMap(
  currencies: string[],
  targetCurrency: string,
  getRate: GetRate = getExchangeRate,
): Promise<RateMap> {
  const entries = await Promise.all(
    currencies
      .filter((currency) => currency !== targetCurrency)
      .map(async (currency): Promise<[string, number] | null> => {
        try {
          const { rate } = await getRate(currency, targetCurrency);
          return rate > 0 ? [currency, rate] : null;
        } catch {
          return null;
        }
      }),
  );

  return Object.fromEntries(entries.filter((entry): entry is [string, number] => entry !== null));
}
