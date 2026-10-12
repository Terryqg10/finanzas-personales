import { describe, expect, it } from 'vitest';

import { formatLongDate, formatShortDate } from './format-date';

describe('formatShortDate', () => {
  it('muestra día y mes abreviado', () => {
    expect(formatShortDate('2026-10-05')).toMatch(/^5 oct\.?$/);
  });
});

describe('formatLongDate', () => {
  it('muestra la fecha completa con el mes en letra', () => {
    expect(formatLongDate('2026-10-05')).toBe('5 de octubre de 2026');
    expect(formatLongDate('2026-01-31')).toBe('31 de enero de 2026');
  });
});
