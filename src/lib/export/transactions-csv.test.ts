import { describe, expect, it } from 'vitest';

import {
  buildExportFilename,
  buildSelectionFilename,
  buildTransactionsCsv,
  toExportRow,
  type ExportRow,
} from './transactions-csv';

function row(overrides: Partial<ExportRow> = {}): ExportRow {
  return {
    date: '2026-10-05',
    description: 'TIENDA UNO',
    categoryName: 'Comida',
    type: 'expense',
    amount: 12.5,
    currency: 'EUR',
    source: 'manual',
    ...overrides,
  };
}

/** Sin el BOM inicial y separado en líneas, para comparar el contenido. */
function lines(csv: string): string[] {
  return csv.replace(/^﻿/, '').split('\r\n');
}

describe('buildTransactionsCsv', () => {
  it('empieza con BOM y con la cabecera de siete columnas', () => {
    const csv = buildTransactionsCsv([]);

    expect(csv.startsWith('﻿')).toBe(true);
    expect(lines(csv)[0]).toBe('Fecha;Concepto;Categoría;Tipo;Importe;Moneda;Origen');
  });

  it('con una lista vacía solo lleva la cabecera', () => {
    expect(lines(buildTransactionsCsv([]))).toEqual([
      'Fecha;Concepto;Categoría;Tipo;Importe;Moneda;Origen',
      '',
    ]);
  });

  it('escribe una fila con tipo, importe con coma y origen legibles', () => {
    expect(lines(buildTransactionsCsv([row()]))[1]).toBe(
      '2026-10-05;TIENDA UNO;Comida;Gasto;12,50;EUR;manual',
    );
  });

  it('traduce ingreso y los tres orígenes', () => {
    const csv = buildTransactionsCsv([
      row({ type: 'income', source: 'imported' }),
      row({ source: 'recurring' }),
    ]);

    expect(lines(csv)[1]).toContain(';Ingreso;');
    expect(lines(csv)[1]).toMatch(/;importado$/);
    expect(lines(csv)[2]).toMatch(/;recurrente$/);
  });

  it('mantiene los decimales reales y rellena a dos', () => {
    const csv = buildTransactionsCsv([
      row({ amount: 100 }),
      row({ amount: 0.1 }),
      row({ amount: 1234.5678 }),
    ]);

    expect(lines(csv)[1]).toContain(';100,00;');
    expect(lines(csv)[2]).toContain(';0,10;');
    expect(lines(csv)[3]).toContain(';1234,5678;');
  });

  it('entrecomilla los campos con punto y coma, comillas o saltos de línea', () => {
    const csv = buildTransactionsCsv([
      row({ description: 'A; B' }),
      row({ description: 'Dice "hola"' }),
      row({ description: 'Línea 1\nLínea 2' }),
    ]);

    expect(lines(csv)[1]).toContain(';"A; B";');
    expect(lines(csv)[2]).toContain(';"Dice ""hola""";');
    expect(csv).toContain('"Línea 1\nLínea 2"');
  });

  it('antepone un apóstrofe a los textos que Excel interpretaría como fórmula', () => {
    const csv = buildTransactionsCsv([
      row({ description: '=SUMA(A1:A9)' }),
      row({ description: '+34 600 000 000' }),
      row({ description: '-cuota' }),
      row({ description: '@usuario' }),
      row({ categoryName: '=Otra' }),
    ]);

    expect(lines(csv)[1]).toContain("'=SUMA(A1:A9)");
    expect(lines(csv)[2]).toContain("'+34 600 000 000");
    expect(lines(csv)[3]).toContain("'-cuota");
    expect(lines(csv)[4]).toContain("'@usuario");
    expect(lines(csv)[5]).toContain(";'=Otra;");
  });

  it('no toca los textos normales ni los que contienen un signo en medio', () => {
    const csv = buildTransactionsCsv([row({ description: 'Pago-parcial = ok' })]);

    expect(lines(csv)[1]).toContain(';Pago-parcial = ok;');
  });
});

describe('buildExportFilename', () => {
  it('incluye el periodo en el nombre', () => {
    expect(buildExportFilename('2026-09-01', '2026-09-30')).toBe(
      'movimientos_2026-09-01_2026-09-30.csv',
    );
  });
});

describe('buildSelectionFilename', () => {
  it('lleva la fecha de la descarga', () => {
    expect(buildSelectionFilename('2026-10-12')).toBe('movimientos_seleccion_2026-10-12.csv');
  });
});

describe('toExportRow', () => {
  const transaction = {
    date: '2026-10-05',
    description: 'TIENDA UNO',
    type: 'expense' as const,
    amount_original: 12.5,
    currency_original: 'EUR',
    source: 'imported' as const,
    categories: { name: 'Comida' },
  };

  it('pasa los campos del movimiento a la fila del CSV', () => {
    expect(toExportRow(transaction)).toEqual({
      date: '2026-10-05',
      description: 'TIENDA UNO',
      categoryName: 'Comida',
      type: 'expense',
      amount: 12.5,
      currency: 'EUR',
      source: 'imported',
    });
  });

  it('usa "Sin categoría" si el movimiento no trae categoría', () => {
    expect(toExportRow({ ...transaction, categories: null }).categoryName).toBe('Sin categoría');
  });
});
