import { describe, expect, it } from 'vitest';

import { CATEGORY_ICONS, getCategoryIcon } from './category-icons';

describe('getCategoryIcon', () => {
  it('devuelve el ícono correcto para una clave conocida', () => {
    expect(getCategoryIcon('home')).toBe(CATEGORY_ICONS.home);
  });

  it('devuelve "shapes" como respaldo para una clave desconocida', () => {
    expect(getCategoryIcon('icono-que-no-existe')).toBe(CATEGORY_ICONS.shapes);
  });
});
