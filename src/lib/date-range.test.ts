import { describe, expect, it } from 'vitest';

import { getMonthRange } from './date-range';

describe('getMonthRange', () => {
  it('devuelve el primer y último día de un mes de 31 días', () => {
    expect(getMonthRange('2026-05')).toEqual({ start: '2026-05-01', end: '2026-05-31' });
  });

  it('devuelve el primer y último día de un mes de 30 días', () => {
    expect(getMonthRange('2026-04')).toEqual({ start: '2026-04-01', end: '2026-04-30' });
  });

  it('devuelve 28 días en febrero de un año no bisiesto', () => {
    expect(getMonthRange('2026-02')).toEqual({ start: '2026-02-01', end: '2026-02-28' });
  });

  it('devuelve 29 días en febrero de un año bisiesto', () => {
    expect(getMonthRange('2024-02')).toEqual({ start: '2024-02-01', end: '2024-02-29' });
  });

  it('funciona en diciembre, el último mes del año', () => {
    expect(getMonthRange('2026-12')).toEqual({ start: '2026-12-01', end: '2026-12-31' });
  });

  it('lanza un error descriptivo si el formato no es YYYY-MM', () => {
    expect(() => getMonthRange('2026-5')).toThrow('no tiene el formato YYYY-MM');
    expect(() => getMonthRange('mayo-2026')).toThrow('no tiene el formato YYYY-MM');
    expect(() => getMonthRange('')).toThrow('no tiene el formato YYYY-MM');
  });

  it('lanza un error descriptivo si el mes está fuera de rango', () => {
    expect(() => getMonthRange('2026-00')).toThrow('fuera de rango');
    expect(() => getMonthRange('2026-13')).toThrow('fuera de rango');
  });
});
