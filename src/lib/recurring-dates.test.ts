import { describe, expect, it } from 'vitest';

import { advanceDueDate } from './recurring-dates';

describe('advanceDueDate — weekly', () => {
  it('suma 7 días', () => {
    expect(advanceDueDate('2026-09-20', 'weekly')).toBe('2026-09-27');
  });

  it('cruza el fin de mes correctamente', () => {
    expect(advanceDueDate('2026-09-28', 'weekly')).toBe('2026-10-05');
  });

  it('cruza el fin de año correctamente', () => {
    expect(advanceDueDate('2026-12-28', 'weekly')).toBe('2027-01-04');
  });
});

describe('advanceDueDate — monthly', () => {
  it('suma 1 mes en un caso simple', () => {
    expect(advanceDueDate('2026-09-15', 'monthly')).toBe('2026-10-15');
  });

  it('recorta el día 31 al último día de un mes de 30 días', () => {
    expect(advanceDueDate('2026-01-31', 'monthly')).toBe('2026-02-28');
  });

  it('recorta el día 30 a 28 en febrero no bisiesto', () => {
    expect(advanceDueDate('2026-01-30', 'monthly')).toBe('2026-02-28');
  });

  it('respeta el día 29 en febrero bisiesto', () => {
    expect(advanceDueDate('2024-01-29', 'monthly')).toBe('2024-02-29');
  });

  it('recorta el día 31 al último día de abril (30 días)', () => {
    expect(advanceDueDate('2026-03-31', 'monthly')).toBe('2026-04-30');
  });

  it('cruza el fin de año correctamente', () => {
    expect(advanceDueDate('2026-12-15', 'monthly')).toBe('2027-01-15');
  });
});

describe('advanceDueDate — yearly', () => {
  it('suma 1 año en un caso simple', () => {
    expect(advanceDueDate('2026-09-20', 'yearly')).toBe('2027-09-20');
  });

  it('recorta el 29 de febrero bisiesto a 28 en un año no bisiesto', () => {
    expect(advanceDueDate('2024-02-29', 'yearly')).toBe('2025-02-28');
  });

  it('no recorta el 28 de febrero aunque el año de destino sea bisiesto', () => {
    expect(advanceDueDate('2023-02-28', 'yearly')).toBe('2024-02-28');
  });
});
