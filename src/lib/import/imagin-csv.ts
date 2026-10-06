/**
 * Parser del extracto de cuenta de Imagin (CSV con `;`).
 * Función pura, sin I/O: recibe el texto del archivo y devuelve filas tipadas
 * y errores por línea. Spec: specs/importacion-extractos.md, sección 2.
 */

export type ImportedTransactionType = 'income' | 'expense';

export interface ParsedRow {
  /** Número de línea en el archivo (1 = cabecera), para mostrar errores. */
  line: number;
  /** Concepto tal cual lo da el banco (ya recortado). */
  description: string;
  /** Fecha ISO `aaaa-mm-dd`. */
  date: string;
  type: ImportedTransactionType;
  /** Valor absoluto, con 2 decimales como máximo. */
  amount: number;
  /** Código de divisa de 3 letras (p. ej. `EUR`). */
  currency: string;
  /** Saldo de la cuenta tras el movimiento; sirve para distinguir filas. */
  balance: number;
}

export interface ParseError {
  line: number;
  message: string;
}

export type ParseResult =
  { ok: true; rows: ParsedRow[]; errors: ParseError[] } | { ok: false; message: string };

export const EXPECTED_HEADER = 'Concepto;Fecha;Importe;Saldo';
const CARD_HEADER = 'Concepto;Tarjeta;Fecha;Importe';
const MAX_DESCRIPTION_LENGTH = 200;

const DATE_PATTERN = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const MONEY_PATTERN = /^([+-])?(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?([A-Z]{3})$/;

interface Money {
  /** Con signo. */
  value: number;
  currency: string;
}

function parseDate(raw: string): string | null {
  const match = DATE_PATTERN.exec(raw);
  if (!match) return null;

  const [, dayText, monthText, yearText] = match;
  if (dayText === undefined || monthText === undefined || yearText === undefined) return null;

  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);
  const date = new Date(Date.UTC(year, month - 1, day));

  // Date.UTC desborda (31/02 → 03/03): comprobamos que la fecha sea la misma.
  const isReal =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  if (!isReal) return null;

  return `${yearText}-${monthText}-${dayText}`;
}

function parseMoney(raw: string): Money | null {
  const match = MONEY_PATTERN.exec(raw.replace(/\s+/g, ''));
  if (!match) return null;

  const [, sign, integerPart, decimalPart, currency] = match;
  if (integerPart === undefined || currency === undefined) return null;

  const integer = integerPart.replace(/\./g, '');
  const magnitude = Number(`${integer}.${decimalPart ?? '0'}`);
  if (!Number.isFinite(magnitude)) return null;

  return { value: sign === '-' ? -magnitude : magnitude, currency };
}

function parseLine(line: string, lineNumber: number): ParsedRow | ParseError {
  const fields = line.split(';');
  const [rawDescription, rawDate, rawAmount, rawBalance] = fields;
  if (
    fields.length !== 4 ||
    rawDescription === undefined ||
    rawDate === undefined ||
    rawAmount === undefined ||
    rawBalance === undefined
  ) {
    return { line: lineNumber, message: 'La línea no tiene 4 columnas.' };
  }

  const description = rawDescription.trim();
  if (description.length === 0) {
    return { line: lineNumber, message: 'El concepto está vacío.' };
  }
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return { line: lineNumber, message: 'El concepto es demasiado largo.' };
  }

  const date = parseDate(rawDate.trim());
  if (!date) {
    return { line: lineNumber, message: 'La fecha no es válida (se esperaba dd/mm/aaaa).' };
  }

  const amount = parseMoney(rawAmount.trim());
  if (!amount) {
    return { line: lineNumber, message: 'El importe no es válido.' };
  }
  if (amount.value === 0) {
    return { line: lineNumber, message: 'El importe es cero.' };
  }

  const balance = parseMoney(rawBalance.trim());
  if (!balance) {
    return { line: lineNumber, message: 'El saldo no es válido.' };
  }
  if (balance.currency !== amount.currency) {
    return { line: lineNumber, message: 'El importe y el saldo están en divisas distintas.' };
  }

  return {
    line: lineNumber,
    description,
    date,
    type: amount.value < 0 ? 'expense' : 'income',
    amount: Math.abs(amount.value),
    currency: amount.currency,
    balance: balance.value,
  };
}

function isParseError(result: ParsedRow | ParseError): result is ParseError {
  return 'message' in result;
}

export function parseImaginCsv(text: string): ParseResult {
  // El BOM inicial aparece cuando el archivo se guarda como UTF-8 con firma.
  const lines = text.replace(/^﻿/, '').split(/\r?\n/);
  const header = (lines[0] ?? '').trim();

  if (header === CARD_HEADER) {
    return {
      ok: false,
      message:
        'Este es el extracto de tarjetas. Descarga el extracto de la cuenta (con la columna Saldo).',
    };
  }
  if (header !== EXPECTED_HEADER) {
    return {
      ok: false,
      message: 'El archivo no tiene el formato del extracto de cuenta de Imagin.',
    };
  }

  const rows: ParsedRow[] = [];
  const errors: ParseError[] = [];

  lines.slice(1).forEach((rawLine, index) => {
    if (rawLine.trim().length === 0) return;

    const result = parseLine(rawLine, index + 2);
    if (isParseError(result)) {
      errors.push(result);
    } else {
      rows.push(result);
    }
  });

  if (rows.length === 0 && errors.length === 0) {
    return { ok: false, message: 'El archivo no contiene movimientos.' };
  }

  return { ok: true, rows, errors };
}
