import { describe, expect, it } from 'vitest';

import { parseImaginCsv } from './imagin-csv';

const HEADER = 'Concepto;Fecha;Importe;Saldo';

function parseOk(text: string) {
  const result = parseImaginCsv(text);
  if (!result.ok) {
    throw new Error(`Se esperaba éxito: ${result.message}`);
  }
  return result;
}

describe('parseImaginCsv', () => {
  it('lee un gasto con coma decimal y sufijo de divisa', () => {
    const { rows, errors } = parseOk(`${HEADER}\nTIENDA UNO;05/10/2026;-5,50EUR;3,60EUR\n`);

    expect(errors).toEqual([]);
    expect(rows).toEqual([
      {
        line: 2,
        description: 'TIENDA UNO',
        date: '2026-10-05',
        type: 'expense',
        amount: 5.5,
        currency: 'EUR',
        balance: 3.6,
      },
    ]);
  });

  it('lee un ingreso en positivo con punto de millares', () => {
    const { rows } = parseOk(`${HEADER}\nNOMINA;30/09/2026;1.390,10EUR;1.413,83EUR`);

    expect(rows[0]).toMatchObject({ type: 'income', amount: 1390.1, balance: 1413.83 });
  });

  it('acepta importes sin decimales y con varios grupos de millares', () => {
    const { rows } = parseOk(`${HEADER}\nA;01/01/2026;2.000.000EUR;3.000.000,5EUR`);

    expect(rows[0]).toMatchObject({ amount: 2_000_000, balance: 3_000_000.5 });
  });

  it('ignora la línea final vacía, el BOM y los saltos CRLF', () => {
    const { rows } = parseOk(`﻿${HEADER}\r\nA;01/10/2026;-1,00EUR;9,00EUR\r\n\r\n`);

    expect(rows).toHaveLength(1);
  });

  it('numera las líneas contando la cabecera como la 1', () => {
    const { rows, errors } = parseOk(
      `${HEADER}\nA;01/10/2026;-1,00EUR;9,00EUR\nB;xx/10/2026;-1,00EUR;8,00EUR\nC;03/10/2026;-1,00EUR;7,00EUR`,
    );

    expect(rows.map((row) => row.line)).toEqual([2, 4]);
    expect(errors).toEqual([{ line: 3, message: expect.stringContaining('fecha') }]);
  });

  it('rechaza fechas que no existen en el calendario', () => {
    const { rows, errors } = parseOk(`${HEADER}\nA;31/02/2026;-1,00EUR;9,00EUR`);

    expect(rows).toEqual([]);
    expect(errors).toHaveLength(1);
  });

  it('informa de importes ilegibles, a cero o con más de 2 decimales', () => {
    const { rows, errors } = parseOk(
      [
        HEADER,
        'A;01/10/2026;abc;9,00EUR',
        'B;01/10/2026;0,00EUR;9,00EUR',
        'C;01/10/2026;-1,234EUR;9,00EUR',
        'D;01/10/2026;-1,00;9,00EUR',
      ].join('\n'),
    );

    expect(rows).toEqual([]);
    expect(errors.map((error) => error.line)).toEqual([2, 3, 4, 5]);
  });

  it('rechaza filas con importe y saldo en divisas distintas', () => {
    const { rows, errors } = parseOk(`${HEADER}\nA;01/10/2026;-1,00USD;9,00EUR`);

    expect(rows).toEqual([]);
    expect(errors[0]?.message).toContain('divisas');
  });

  it('rechaza filas con un número de columnas incorrecto o sin concepto', () => {
    const { errors } = parseOk(
      `${HEADER}\nA;01/10/2026;-1,00EUR\n;01/10/2026;-1,00EUR;9,00EUR\nA;B;01/10/2026;-1,00EUR;9,00EUR`,
    );

    expect(errors.map((error) => error.line)).toEqual([2, 3, 4]);
  });

  it('rechaza el extracto de tarjetas con un mensaje que indica cuál descargar', () => {
    const result = parseImaginCsv('Concepto;Tarjeta;Fecha;Importe\nA;*1234;01/10/2026;-1,00EUR');

    expect(result).toEqual({ ok: false, message: expect.stringContaining('extracto de tarjetas') });
  });

  it('rechaza archivos con otra cabecera o sin movimientos', () => {
    expect(parseImaginCsv('a,b,c\n1,2,3').ok).toBe(false);
    expect(parseImaginCsv(HEADER).ok).toBe(false);
    expect(parseImaginCsv('').ok).toBe(false);
  });
});
