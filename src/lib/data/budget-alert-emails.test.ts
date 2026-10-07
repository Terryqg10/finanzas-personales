import { describe, expect, it } from 'vitest';

import { currentMonthStart } from './budget-alert-emails';

describe('currentMonthStart', () => {
  it('devuelve el primer día del mes de la fecha dada', () => {
    expect(currentMonthStart(new Date('2026-10-07T15:30:00Z'))).toBe('2026-10-01');
    expect(currentMonthStart(new Date('2026-02-28T23:59:59Z'))).toBe('2026-02-01');
  });

  it('usa UTC, como el resto de comparaciones de mes de la app', () => {
    expect(currentMonthStart(new Date('2026-11-30T23:30:00Z'))).toBe('2026-11-01');
    expect(currentMonthStart(new Date('2026-12-01T00:00:00Z'))).toBe('2026-12-01');
  });
});
