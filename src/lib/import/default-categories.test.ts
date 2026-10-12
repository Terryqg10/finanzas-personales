import { describe, expect, it } from 'vitest';

import {
  getDefaultCategoryId,
  isNotableSuggestion,
  pickDefaultCategories,
} from './default-categories';

describe('pickDefaultCategories', () => {
  it('elige las categorías globales Otros e Ingresos', () => {
    const result = pickDefaultCategories([
      { id: 'a', name: 'Comida', user_id: null },
      { id: 'b', name: 'Otros', user_id: null },
      { id: 'c', name: 'Ingresos', user_id: null },
    ]);

    expect(result).toEqual({ expense: 'b', income: 'c' });
  });

  it('ignora una categoría propia que se llame igual que la global', () => {
    const result = pickDefaultCategories([
      { id: 'mine', name: 'Otros', user_id: 'u1' },
      { id: 'global', name: 'Otros', user_id: null },
    ]);

    expect(result.expense).toBe('global');
  });

  it('cae en la primera categoría si faltan las globales y en null si no hay ninguna', () => {
    expect(pickDefaultCategories([{ id: 'x', name: 'Mía', user_id: 'u1' }])).toEqual({
      expense: 'x',
      income: 'x',
    });
    expect(pickDefaultCategories([])).toEqual({ expense: null, income: null });
  });
});

describe('getDefaultCategoryId', () => {
  it('devuelve la categoría por defecto según el tipo', () => {
    const defaults = { expense: 'otros', income: 'ingresos' };

    expect(getDefaultCategoryId(defaults, 'expense')).toBe('otros');
    expect(getDefaultCategoryId(defaults, 'income')).toBe('ingresos');
  });
});

describe('isNotableSuggestion', () => {
  it('señala la sugerencia solo si difiere de la categoría por defecto', () => {
    expect(isNotableSuggestion('comida', 'otros')).toBe(true);
    expect(isNotableSuggestion('otros', 'otros')).toBe(false);
  });

  it('no hay nada que señalar sin sugerencia', () => {
    expect(isNotableSuggestion(null, 'otros')).toBe(false);
    expect(isNotableSuggestion(null, null)).toBe(false);
  });
});
