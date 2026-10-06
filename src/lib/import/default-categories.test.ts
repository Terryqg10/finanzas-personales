import { describe, expect, it } from 'vitest';

import { pickDefaultCategories } from './default-categories';

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
