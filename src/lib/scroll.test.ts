import { describe, expect, it } from 'vitest';

import { DOUBLE_TAP_THRESHOLD_MS, getScrollBehavior, isDoubleTap } from './scroll';

describe('isDoubleTap', () => {
  it('no es doble toque si no hubo toque anterior', () => {
    expect(isDoubleTap(null, 1000)).toBe(false);
  });

  it('es doble toque si el segundo llega dentro del umbral', () => {
    expect(isDoubleTap(1000, 1000 + DOUBLE_TAP_THRESHOLD_MS - 1)).toBe(true);
    expect(isDoubleTap(1000, 1000)).toBe(true);
  });

  it('no es doble toque si pasa el umbral o más', () => {
    expect(isDoubleTap(1000, 1000 + DOUBLE_TAP_THRESHOLD_MS)).toBe(false);
    expect(isDoubleTap(1000, 5000)).toBe(false);
  });

  it('ignora marcas de tiempo incoherentes (el segundo toque antes que el primero)', () => {
    expect(isDoubleTap(2000, 1500)).toBe(false);
  });
});

describe('getScrollBehavior', () => {
  it('usa scroll suave por defecto', () => {
    expect(getScrollBehavior(false)).toBe('smooth');
  });

  it('usa scroll instantáneo si el usuario pidió reducir el movimiento', () => {
    expect(getScrollBehavior(true)).toBe('auto');
  });
});
