import { describe, expect, it, vi } from 'vitest';

import { buildRateMap } from './user-currencies';

describe('buildRateMap', () => {
  it('devuelve un mapa vacío si no hay monedas', async () => {
    const getRate = vi.fn();

    const result = await buildRateMap([], 'USD', getRate);

    expect(result).toEqual({});
    expect(getRate).not.toHaveBeenCalled();
  });

  it('excluye la propia moneda destino, sin pedir su tasa', async () => {
    const getRate = vi.fn().mockResolvedValue({ rate: 1.08 });

    const result = await buildRateMap(['USD', 'EUR'], 'USD', getRate);

    expect(result).toEqual({ EUR: 1.08 });
    expect(getRate).toHaveBeenCalledTimes(1);
    expect(getRate).toHaveBeenCalledWith('EUR', 'USD');
  });

  it('calcula la tasa de cada moneda distinta hacia la moneda destino', async () => {
    const getRate = vi.fn((base: string) =>
      Promise.resolve({ rate: base === 'EUR' ? 1.08 : 1.27 }),
    );

    const result = await buildRateMap(['EUR', 'GBP'], 'USD', getRate);

    expect(result).toEqual({ EUR: 1.08, GBP: 1.27 });
  });

  it('descarta en silencio una moneda cuya tasa no se pudo obtener', async () => {
    const getRate = vi.fn((base: string) =>
      base === 'EUR' ? Promise.resolve({ rate: 1.08 }) : Promise.reject(new Error('network error')),
    );

    const result = await buildRateMap(['EUR', 'GBP'], 'USD', getRate);

    expect(result).toEqual({ EUR: 1.08 });
  });

  it('descarta en silencio una tasa inválida (<= 0)', async () => {
    const getRate = vi.fn().mockResolvedValue({ rate: 0 });

    const result = await buildRateMap(['EUR'], 'USD', getRate);

    expect(result).toEqual({});
  });
});
