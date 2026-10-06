import { describe, expect, it } from 'vitest';

import type { ParsedRow } from './imagin-csv';
import { assignImportKeys, isInternalTransfer, normalizeConcept } from './import-key';

function row(overrides: Partial<ParsedRow> = {}): ParsedRow {
  return {
    line: 2,
    description: 'TIENDA UNO',
    date: '2026-10-05',
    type: 'expense',
    amount: 5.5,
    currency: 'EUR',
    balance: 3.6,
    ...overrides,
  };
}

describe('normalizeConcept', () => {
  it('pasa a minúsculas, quita tildes y colapsa espacios', () => {
    expect(normalizeConcept('  Aportación   A  Una ')).toBe('aportacion a una');
  });
});

describe('assignImportKeys', () => {
  it('es estable: las mismas filas dan siempre las mismas claves', () => {
    const rows = [row(), row({ description: 'OTRA', balance: 1 })];

    expect(assignImportKeys(rows)).toEqual(assignImportKeys(rows));
  });

  it('no depende del número de línea ni de mayúsculas o espacios del concepto', () => {
    const first = assignImportKeys([row({ line: 2 })]);
    const second = assignImportKeys([row({ line: 40, description: ' tienda   UNO ' })]);

    expect(second).toEqual(first);
  });

  it('distingue filas que solo difieren en el saldo', () => {
    const [a, b] = assignImportKeys([row({ balance: 3.6 }), row({ balance: 9.1 })]);

    expect(a).not.toBe(b);
    expect(b).not.toContain('#');
  });

  it('distingue el signo (gasto frente a ingreso del mismo importe)', () => {
    const [expense, income] = assignImportKeys([row({ type: 'expense' }), row({ type: 'income' })]);

    expect(expense).not.toBe(income);
  });

  it('numera con #n las filas totalmente idénticas, en orden', () => {
    const keys = assignImportKeys([row(), row(), row()]);

    expect(new Set(keys).size).toBe(3);
    expect(keys[0]).not.toContain('#');
    expect(keys[1]).toMatch(/#2$/);
    expect(keys[2]).toMatch(/#3$/);
  });

  it('da la misma clave a una fila aunque se importe en otro subconjunto del extracto', () => {
    const target = row({ description: 'CLAVE', balance: 7 });
    const [alone] = assignImportKeys([target]);
    const [withOthers] = assignImportKeys([target, row({ date: '2026-10-06' })]);

    expect(withOthers).toBe(alone);
  });
});

describe('isInternalTransfer', () => {
  it('detecta las transferencias a la hucha y las aportaciones', () => {
    expect(isInternalTransfer('TRANSFER.HUCHA DIGI')).toBe(true);
    expect(isInternalTransfer('Aportación a una')).toBe(true);
  });

  it('no marca movimientos normales', () => {
    expect(isInternalTransfer('NOMINA')).toBe(false);
    expect(isInternalTransfer('BIZUM RECIBIDO')).toBe(false);
  });
});
