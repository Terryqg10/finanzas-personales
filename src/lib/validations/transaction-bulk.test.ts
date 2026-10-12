import { describe, expect, it } from 'vitest';

import {
  BULK_DELETE_MAX,
  deleteTransactionsSchema,
  formatMovementCount,
  transactionRangeSchema,
} from './transaction-bulk';

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

describe('deleteTransactionsSchema', () => {
  it('acepta una lista válida de identificadores', () => {
    const result = deleteTransactionsSchema.safeParse({ ids: [uuid(1), uuid(2)] });

    expect(result.success).toBe(true);
    expect(result.success && result.data.ids).toEqual([uuid(1), uuid(2)]);
  });

  it('elimina los identificadores repetidos', () => {
    const result = deleteTransactionsSchema.safeParse({ ids: [uuid(1), uuid(1), uuid(2)] });

    expect(result.success && result.data.ids).toEqual([uuid(1), uuid(2)]);
  });

  it('rechaza una lista vacía', () => {
    expect(deleteTransactionsSchema.safeParse({ ids: [] }).success).toBe(false);
  });

  it('rechaza identificadores que no son UUID', () => {
    expect(deleteTransactionsSchema.safeParse({ ids: ['no-es-uuid'] }).success).toBe(false);
  });

  it(`acepta ${BULK_DELETE_MAX} y rechaza ${BULK_DELETE_MAX + 1}`, () => {
    const make = (count: number) => Array.from({ length: count }, (_, index) => uuid(index + 1));

    expect(deleteTransactionsSchema.safeParse({ ids: make(BULK_DELETE_MAX) }).success).toBe(true);
    expect(deleteTransactionsSchema.safeParse({ ids: make(BULK_DELETE_MAX + 1) }).success).toBe(
      false,
    );
  });
});

describe('transactionRangeSchema', () => {
  const base = { from: '2026-09-01', to: '2026-09-30', onlyImported: false };

  it('acepta un periodo ordenado, también de un solo día', () => {
    expect(transactionRangeSchema.safeParse(base).success).toBe(true);
    expect(
      transactionRangeSchema.safeParse({ ...base, from: '2026-09-15', to: '2026-09-15' }).success,
    ).toBe(true);
  });

  it('rechaza un periodo invertido', () => {
    const result = transactionRangeSchema.safeParse({
      ...base,
      from: '2026-10-01',
      to: '2026-09-01',
    });

    expect(result.success).toBe(false);
  });

  it('rechaza fechas ausentes, con mal formato o inexistentes', () => {
    expect(transactionRangeSchema.safeParse({ ...base, from: '' }).success).toBe(false);
    expect(transactionRangeSchema.safeParse({ ...base, to: '30/09/2026' }).success).toBe(false);
    expect(transactionRangeSchema.safeParse({ ...base, to: '2026-02-31' }).success).toBe(false);
  });

  it('exige indicar si es solo de importados', () => {
    expect(transactionRangeSchema.safeParse({ from: base.from, to: base.to }).success).toBe(false);
  });
});

describe('formatMovementCount', () => {
  it('usa singular y plural', () => {
    expect(formatMovementCount(1)).toBe('1 movimiento');
    expect(formatMovementCount(0)).toBe('0 movimientos');
    expect(formatMovementCount(12)).toBe('12 movimientos');
  });
});
