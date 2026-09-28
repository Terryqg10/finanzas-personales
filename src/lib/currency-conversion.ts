import { getExchangeRate } from '@/lib/exchange-rate';

/** Mapa `currency_original -> tasa hacia la nueva moneda base`, listo para enviar como jsonb a la RPC. */
export type TransactionRateMap = Record<string, number>;

type GetRate = (base: string, quote: string) => Promise<{ rate: number }>;

/**
 * Calcula, para cada moneda original distinta presente en los movimientos
 * del usuario, la tasa de conversión hacia la nueva moneda base.
 *
 * Lanza si alguna tasa no se puede obtener o resulta inválida (<= 0), para
 * que el cambio de moneda base se aborte por completo en vez de aplicarse
 * a medias — la llamada a la RPC de conversión nunca debe hacerse con un
 * mapa incompleto o con una tasa incorrecta.
 */
export async function buildTransactionRateMap(
  distinctOriginalCurrencies: string[],
  newBaseCurrency: string,
  getRate: GetRate = getExchangeRate,
): Promise<TransactionRateMap> {
  const rateMap: TransactionRateMap = {};

  for (const currency of distinctOriginalCurrencies) {
    const { rate } = await getRate(currency, newBaseCurrency);

    if (!(rate > 0)) {
      throw new Error(`Tasa de cambio inválida para ${currency} -> ${newBaseCurrency}.`);
    }

    rateMap[currency] = rate;
  }

  return rateMap;
}
