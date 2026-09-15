import { describe, expect, it } from 'vitest';

import {
  createTransactionSchema,
  deleteTransactionSchema,
  updateTransactionSchema,
} from './transaction';

const VALID_UUID = '11111111-1111-4111-8111-111111111111';

describe('createTransactionSchema', () => {
  it('acepta un movimiento válido', () => {
    const result = createTransactionSchema.safeParse({
      type: 'expense',
      description: 'Compra supermercado',
      date: '2026-09-01',
      amount: '45.20',
      categoryId: VALID_UUID,
    });
    expect(result.success).toBe(true);
  });

  it('rechaza un tipo que no sea income o expense', () => {
    const result = createTransactionSchema.safeParse({
      type: 'transferencia',
      description: 'Compra',
      date: '2026-09-01',
      amount: '10',
      categoryId: VALID_UUID,
    });
    expect(result.success).toBe(false);
  });

  it('rechaza una descripción vacía', () => {
    const result = createTransactionSchema.safeParse({
      type: 'expense',
      description: '   ',
      date: '2026-09-01',
      amount: '10',
      categoryId: VALID_UUID,
    });
    expect(result.success).toBe(false);
  });

  it('rechaza una descripción de más de 200 caracteres', () => {
    const result = createTransactionSchema.safeParse({
      type: 'expense',
      description: 'a'.repeat(201),
      date: '2026-09-01',
      amount: '10',
      categoryId: VALID_UUID,
    });
    expect(result.success).toBe(false);
  });

  it('rechaza una fecha inválida', () => {
    const result = createTransactionSchema.safeParse({
      type: 'expense',
      description: 'Compra',
      date: 'no-es-una-fecha',
      amount: '10',
      categoryId: VALID_UUID,
    });
    expect(result.success).toBe(false);
  });

  it('rechaza una cantidad de cero', () => {
    const result = createTransactionSchema.safeParse({
      type: 'expense',
      description: 'Compra',
      date: '2026-09-01',
      amount: '0',
      categoryId: VALID_UUID,
    });
    expect(result.success).toBe(false);
  });

  it('rechaza una cantidad negativa', () => {
    const result = createTransactionSchema.safeParse({
      type: 'expense',
      description: 'Compra',
      date: '2026-09-01',
      amount: '-10',
      categoryId: VALID_UUID,
    });
    expect(result.success).toBe(false);
  });

  it('rechaza una cantidad demasiado alta', () => {
    const result = createTransactionSchema.safeParse({
      type: 'expense',
      description: 'Compra',
      date: '2026-09-01',
      amount: '9999999999',
      categoryId: VALID_UUID,
    });
    expect(result.success).toBe(false);
  });

  it('acepta una cantidad como string y la convierte a número', () => {
    const result = createTransactionSchema.safeParse({
      type: 'income',
      description: 'Nómina',
      date: '2026-09-01',
      amount: '1800.50',
      categoryId: VALID_UUID,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amount).toBe(1800.5);
    }
  });

  it('rechaza un categoryId que no es UUID', () => {
    const result = createTransactionSchema.safeParse({
      type: 'expense',
      description: 'Compra',
      date: '2026-09-01',
      amount: '10',
      categoryId: 'no-es-un-uuid',
    });
    expect(result.success).toBe(false);
  });
});

describe('updateTransactionSchema', () => {
  it('exige un id UUID válido además de los campos normales', () => {
    const result = updateTransactionSchema.safeParse({
      id: 'no-es-un-uuid',
      type: 'expense',
      description: 'Compra',
      date: '2026-09-01',
      amount: '10',
      categoryId: VALID_UUID,
    });
    expect(result.success).toBe(false);
  });

  it('acepta un movimiento completo con id válido', () => {
    const result = updateTransactionSchema.safeParse({
      id: VALID_UUID,
      type: 'expense',
      description: 'Compra',
      date: '2026-09-01',
      amount: '10',
      categoryId: VALID_UUID,
    });
    expect(result.success).toBe(true);
  });
});

describe('deleteTransactionSchema', () => {
  it('rechaza un id que no es UUID', () => {
    const result = deleteTransactionSchema.safeParse({ id: '123' });
    expect(result.success).toBe(false);
  });

  it('acepta un id UUID válido', () => {
    const result = deleteTransactionSchema.safeParse({ id: VALID_UUID });
    expect(result.success).toBe(true);
  });
});
