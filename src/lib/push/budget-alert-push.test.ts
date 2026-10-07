import { describe, expect, it } from 'vitest';

import type { BudgetAlert } from '@/lib/budget-alerts';

import { buildBudgetAlertPush } from './budget-alert-push';

function alert(overrides: Partial<BudgetAlert> = {}): BudgetAlert {
  return {
    level: 'threshold',
    budgetId: 'b1',
    categoryName: 'Comida',
    percentage: 85,
    threshold: 80,
    spent: 85,
    monthlyLimit: 100,
    ...overrides,
  };
}

describe('buildBudgetAlertPush', () => {
  it('redacta el aviso de umbral sin importes', () => {
    const push = buildBudgetAlertPush(alert());

    expect(push.title).toBe('Presupuesto de Comida');
    expect(push.body).toBe('Vas por el 85% de tu límite.');
    expect(push.body).not.toMatch(/€|\d+,\d{2}/);
    expect(push.url).toBe('/presupuestos');
  });

  it('redacta el aviso de límite superado', () => {
    const push = buildBudgetAlertPush(alert({ level: 'limit', percentage: 110 }));

    expect(push.body).toBe('Has superado el límite mensual.');
  });

  it('usa una etiqueta distinta por presupuesto y nivel para sustituir solo avisos equivalentes', () => {
    const threshold = buildBudgetAlertPush(alert({ level: 'threshold' })).tag;
    const limit = buildBudgetAlertPush(alert({ level: 'limit' })).tag;
    const other = buildBudgetAlertPush(alert({ budgetId: 'b2' })).tag;

    expect(new Set([threshold, limit, other]).size).toBe(3);
  });

  it('deja el título en una sola línea aunque el nombre tenga saltos', () => {
    const push = buildBudgetAlertPush(alert({ categoryName: 'Co\r\n  mida' }));

    expect(push.title).toBe('Presupuesto de Co mida');
  });
});
