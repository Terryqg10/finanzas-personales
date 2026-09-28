import { describe, expect, it, vi } from 'vitest';

import { buildTransactionRateMap } from './currency-conversion';

describe('buildTransactionRateMap', () => {
  it('devuelve un mapa vacío si no hay monedas originales distintas', async () => {
    const getRate = vi.fn();

    const result = await buildTransactionRateMap([], 'USD', getRate);

    expect(result).toEqual({});
    expect(getRate).not.toHaveBeenCalled();
  });

  it('pide la tasa de cada moneda distinta hacia la nueva moneda base', async () => {
    const getRate = vi
      .fn()
      .mockResolvedValueOnce({ rate: 1.08 })
      .mockResolvedValueOnce({ rate: 1.27 });

    const result = await buildTransactionRateMap(['EUR', 'GBP'], 'USD', getRate);

    expect(result).toEqual({ EUR: 1.08, GBP: 1.27 });
    expect(getRate).toHaveBeenNthCalledWith(1, 'EUR', 'USD');
    expect(getRate).toHaveBeenNthCalledWith(2, 'GBP', 'USD');
  });

  it('lanza un error claro si alguna tasa devuelta no es válida (<= 0)', async () => {
    const getRate = vi.fn().mockResolvedValue({ rate: 0 });

    await expect(buildTransactionRateMap(['EUR'], 'USD', getRate)).rejects.toThrow(
      /Tasa de cambio inválida para EUR -> USD/,
    );
  });

  it('propaga el error si la obtención de la tasa falla (sin caché, API caída)', async () => {
    const getRate = vi.fn().mockRejectedValue(new Error('network error'));

    await expect(buildTransactionRateMap(['EUR'], 'USD', getRate)).rejects.toThrow('network error');
  });
});
