import { describe, expect, it } from 'vitest';

import { suggestCategories, type CategoryHistoryEntry } from './suggest-categories';

function entry(overrides: Partial<CategoryHistoryEntry> = {}): CategoryHistoryEntry {
  return {
    description: 'MERCADONA DEL PAR',
    type: 'expense',
    categoryId: 'food',
    date: '2026-09-01',
    ...overrides,
  };
}

const row = (description: string, type: 'income' | 'expense' = 'expense') => ({
  description,
  type,
});

describe('suggestCategories', () => {
  it('sugiere la categoría que ya se usó para ese comercio', () => {
    expect(suggestCategories([entry()], [row('MERCADONA DEL PAR')])).toEqual(['food']);
  });

  it('devuelve null si el comercio no está en el historial', () => {
    expect(suggestCategories([entry()], [row('STARBUCKS CC GRAN')])).toEqual([null]);
  });

  it('devuelve null para todo si no hay historial', () => {
    expect(suggestCategories([], [row('A'), row('B', 'income')])).toEqual([null, null]);
  });

  it('elige la categoría más usada', () => {
    const history = [
      entry({ categoryId: 'leisure', date: '2026-09-20' }),
      entry({ categoryId: 'food', date: '2026-09-01' }),
      entry({ categoryId: 'food', date: '2026-09-02' }),
    ];

    expect(suggestCategories(history, [row('MERCADONA DEL PAR')])).toEqual(['food']);
  });

  it('en caso de empate gana la usada más recientemente', () => {
    const history = [
      entry({ categoryId: 'food', date: '2026-09-01' }),
      entry({ categoryId: 'leisure', date: '2026-09-15' }),
    ];

    expect(suggestCategories(history, [row('MERCADONA DEL PAR')])).toEqual(['leisure']);
  });

  it('el empate total (mismas veces y misma fecha) es estable: gana el id menor', () => {
    const history = [
      entry({ categoryId: 'b-cat', date: '2026-09-01' }),
      entry({ categoryId: 'a-cat', date: '2026-09-01' }),
    ];

    expect(suggestCategories(history, [row('MERCADONA DEL PAR')])).toEqual(['a-cat']);
    expect(suggestCategories([...history].reverse(), [row('MERCADONA DEL PAR')])).toEqual([
      'a-cat',
    ]);
  });

  it('no mezcla gastos con ingresos aunque el concepto sea el mismo', () => {
    const history = [
      entry({ description: 'BIZUM', type: 'income', categoryId: 'income-cat' }),
      entry({ description: 'BIZUM', type: 'expense', categoryId: 'leisure' }),
    ];

    expect(suggestCategories(history, [row('BIZUM', 'income'), row('BIZUM', 'expense')])).toEqual([
      'income-cat',
      'leisure',
    ]);
  });

  it('ignora mayúsculas, tildes y espacios repetidos al comparar', () => {
    const history = [entry({ description: 'Cafetería  Ñandú', categoryId: 'coffee' })];

    expect(suggestCategories(history, [row('  CAFETERIA ÑANDÚ ')])).toEqual(['coffee']);
  });

  it('devuelve una sugerencia por fila, en el mismo orden', () => {
    const history = [
      entry({ description: 'A', categoryId: 'cat-a' }),
      entry({ description: 'C', categoryId: 'cat-c' }),
    ];

    expect(suggestCategories(history, [row('C'), row('B'), row('A')])).toEqual([
      'cat-c',
      null,
      'cat-a',
    ]);
  });
});
