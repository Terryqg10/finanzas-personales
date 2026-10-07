import { describe, expect, it } from 'vitest';

import { detectBudgetAlert, formatBudgetAlert, type DetectBudgetAlertInput } from './budget-alerts';

function input(overrides: Partial<DetectBudgetAlertInput> = {}): DetectBudgetAlertInput {
  return {
    budgetId: 'budget-1',
    categoryName: 'Comida',
    monthlyLimit: 100,
    alertThreshold: 80,
    spentAfter: 50,
    addedAmount: 10,
    ...overrides,
  };
}

describe('detectBudgetAlert', () => {
  it('no avisa mientras se siga por debajo del umbral', () => {
    expect(detectBudgetAlert(input({ spentAfter: 79, addedAmount: 10 }))).toBeNull();
  });

  it('avisa del umbral al cruzarlo, con los datos que necesita el email', () => {
    const alert = detectBudgetAlert(input({ spentAfter: 85, addedAmount: 10 }));

    expect(alert).toEqual({
      level: 'threshold',
      budgetId: 'budget-1',
      categoryName: 'Comida',
      percentage: 85,
      threshold: 80,
      spent: 85,
      monthlyLimit: 100,
    });
  });

  it('avisa cuando el gasto deja la categoría exactamente en el umbral', () => {
    expect(detectBudgetAlert(input({ spentAfter: 80, addedAmount: 10 }))?.level).toBe('threshold');
  });

  it('avisa del límite al cruzarlo', () => {
    const alert = detectBudgetAlert(input({ spentAfter: 105, addedAmount: 20 }));

    expect(alert).toEqual({
      level: 'limit',
      budgetId: 'budget-1',
      categoryName: 'Comida',
      percentage: 105,
      threshold: 80,
      spent: 105,
      monthlyLimit: 100,
    });
  });

  it('avisa cuando el gasto deja la categoría exactamente en el límite', () => {
    expect(detectBudgetAlert(input({ spentAfter: 100, addedAmount: 5 }))?.level).toBe('limit');
  });

  it('si cruza umbral y límite a la vez, gana el límite', () => {
    expect(detectBudgetAlert(input({ spentAfter: 120, addedAmount: 90 }))?.level).toBe('limit');
  });

  it('no repite el aviso del umbral si ya estaba por encima', () => {
    expect(detectBudgetAlert(input({ spentAfter: 90, addedAmount: 5 }))).toBeNull();
  });

  it('no repite el aviso del límite si ya estaba superado', () => {
    expect(detectBudgetAlert(input({ spentAfter: 130, addedAmount: 10 }))).toBeNull();
  });

  it('no se deja engañar por decimales binarios al comparar con el umbral', () => {
    // 0,1 + 0,2 + 79,7 queda en 79,99999… en coma flotante; en céntimos son 8000.
    const spentAfter = 0.1 + 0.2 + 79.7;

    expect(detectBudgetAlert(input({ spentAfter, addedAmount: 0.1 }))?.level).toBe('threshold');
  });

  it('ignora presupuestos con límite cero o negativo y gastos sin importe', () => {
    expect(detectBudgetAlert(input({ monthlyLimit: 0 }))).toBeNull();
    expect(detectBudgetAlert(input({ monthlyLimit: -5 }))).toBeNull();
    expect(detectBudgetAlert(input({ addedAmount: 0 }))).toBeNull();
  });
});

describe('formatBudgetAlert', () => {
  const base = {
    budgetId: 'budget-1',
    categoryName: 'Ocio',
    threshold: 80,
    spent: 0,
    monthlyLimit: 100,
  };

  it('redacta el mensaje de límite', () => {
    expect(formatBudgetAlert({ ...base, level: 'limit', percentage: 110 })).toBe(
      'Has superado el límite mensual de Ocio.',
    );
  });

  it('redacta el mensaje de umbral con el porcentaje y el umbral', () => {
    expect(formatBudgetAlert({ ...base, level: 'threshold', percentage: 85 })).toBe(
      'Vas por el 85% de tu límite de Ocio (umbral: 80%).',
    );
  });
});
