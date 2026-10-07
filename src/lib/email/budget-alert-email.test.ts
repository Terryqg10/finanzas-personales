import { describe, expect, it } from 'vitest';

import type { BudgetAlert } from '@/lib/budget-alerts';

import { buildBudgetAlertEmail, escapeHtml } from './budget-alert-email';

const APP_URL = 'https://app.example.com';

function alert(overrides: Partial<BudgetAlert> = {}): BudgetAlert {
  return {
    level: 'threshold',
    budgetId: 'budget-1',
    categoryName: 'Comida',
    percentage: 85,
    threshold: 80,
    spent: 85,
    monthlyLimit: 100,
    ...overrides,
  };
}

describe('buildBudgetAlertEmail', () => {
  it('redacta el aviso de umbral con porcentaje, importes y enlace', () => {
    const email = buildBudgetAlertEmail(alert(), 'EUR', APP_URL);

    expect(email.subject).toBe('Vas por el 85% de tu límite de Comida');
    expect(email.text).toContain('umbral: 80%');
    expect(email.text).toContain('Comida:');
    expect(email.text).toContain('https://app.example.com/presupuestos');
    expect(email.html).toContain('href="https://app.example.com/presupuestos"');
  });

  it('redacta el aviso de límite superado', () => {
    const email = buildBudgetAlertEmail(
      alert({ level: 'limit', percentage: 110, spent: 110 }),
      'EUR',
      APP_URL,
    );

    expect(email.subject).toBe('Superaste el límite de Comida');
    expect(email.text).toContain('Has superado el límite mensual de Comida.');
    expect(email.text).toContain('(110%)');
  });

  it('formatea los importes en la moneda indicada', () => {
    const email = buildBudgetAlertEmail(alert({ spent: 85.5, monthlyLimit: 100 }), 'USD', APP_URL);

    expect(email.text).toMatch(/85,50.*US\$|US\$.*85,50/);
  });

  it('escapa el HTML del nombre de la categoría', () => {
    const email = buildBudgetAlertEmail(
      alert({ categoryName: '<script>alert("x")</script>' }),
      'EUR',
      APP_URL,
    );

    expect(email.html).not.toContain('<script>');
    expect(email.html).toContain('&lt;script&gt;');
  });

  it('deja el asunto en una sola línea aunque el nombre tenga saltos', () => {
    const email = buildBudgetAlertEmail(alert({ categoryName: 'Co\r\nmida' }), 'EUR', APP_URL);

    expect(email.subject).not.toMatch(/[\r\n]/);
  });
});

describe('escapeHtml', () => {
  it('escapa los cinco caracteres peligrosos', () => {
    expect(escapeHtml(`<a href="x">&'</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;',
    );
  });
});
