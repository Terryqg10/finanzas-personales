import { describe, expect, it, vi } from 'vitest';

import { getExchangeRate, type SnapshotStore } from './exchange-rate';

function createFakeStore(overrides: Partial<SnapshotStore> = {}): SnapshotStore {
  return {
    getSnapshot: vi.fn().mockResolvedValue(null),
    getLatestSnapshot: vi.fn().mockResolvedValue(null),
    saveSnapshot: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('getExchangeRate', () => {
  it('devuelve tasa 1 sin tocar caché ni API si origen y destino coinciden', async () => {
    const store = createFakeStore();
    const fetchRate = vi.fn();

    const result = await getExchangeRate('EUR', 'EUR', { store, fetchRate });

    expect(result).toEqual({ rate: 1, stale: false });
    expect(store.getSnapshot).not.toHaveBeenCalled();
    expect(fetchRate).not.toHaveBeenCalled();
  });

  it('usa la tasa cacheada de hoy si existe, sin llamar a la API', async () => {
    const store = createFakeStore({ getSnapshot: vi.fn().mockResolvedValue(0.92) });
    const fetchRate = vi.fn();

    const result = await getExchangeRate('USD', 'EUR', { store, fetchRate });

    expect(result).toEqual({ rate: 0.92, stale: false });
    expect(fetchRate).not.toHaveBeenCalled();
  });

  it('llama a la API y guarda el resultado en caché si no hay tasa de hoy', async () => {
    const store = createFakeStore();
    const fetchRate = vi.fn().mockResolvedValue(0.95);

    const result = await getExchangeRate('USD', 'EUR', { store, fetchRate });

    expect(result).toEqual({ rate: 0.95, stale: false });
    expect(store.saveSnapshot).toHaveBeenCalledWith('USD', 'EUR', expect.any(String), 0.95);
  });

  it('cae a la última tasa cacheada (marcada stale) si la API falla', async () => {
    const store = createFakeStore({ getLatestSnapshot: vi.fn().mockResolvedValue(0.9) });
    const fetchRate = vi.fn().mockRejectedValue(new Error('network error'));

    const result = await getExchangeRate('USD', 'EUR', { store, fetchRate });

    expect(result).toEqual({ rate: 0.9, stale: true });
  });

  it('lanza un error claro si la API falla y no hay ninguna tasa en caché', async () => {
    const store = createFakeStore();
    const fetchRate = vi.fn().mockRejectedValue(new Error('network error'));

    await expect(getExchangeRate('USD', 'EUR', { store, fetchRate })).rejects.toThrow(
      /no hay ninguna en caché/,
    );
  });
});
