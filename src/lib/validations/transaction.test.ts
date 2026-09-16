import { describe, expect, it } from 'vitest';

import {
  createTransactionSchema,
  deleteTransactionSchema,
  updateTransactionSchema,
} from './transaction';

const VALID_UUID = '11111111-1111-4111-8111-111111111111';

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    type: 'expense',
    description: 'Compra supermercado',
    date: '2026-09-01',
    amount: '45.20',
    categoryId: VALID_UUID,
    currency: 'EUR',
    ...overrides,
  };
}

describe('createTransactionSchema', () => {
  it('acepta un movimiento válido', () => {
    const result = createTransactionSchema.safeParse(validPayload());
    expect(result.success).toBe(true);
  });

  it('rechaza un tipo que no sea income o expense', () => {
    const result = createTransactionSchema.safeParse(validPayload({ type: 'transferencia' }));
    expect(result.success).toBe(false);
  });

  it('rechaza una descripción vacía', () => {
    const result = createTransactionSchema.safeParse(validPayload({ description: '   ' }));
    expect(result.success).toBe(false);
  });

  it('rechaza una descripción de más de 200 caracteres', () => {
    const result = createTransactionSchema.safeParse(
      validPayload({ description: 'a'.repeat(201) }),
    );
    expect(result.success).toBe(false);
  });

  it('rechaza una fecha inválida', () => {
    const result = createTransactionSchema.safeParse(validPayload({ date: 'no-es-una-fecha' }));
    expect(result.success).toBe(false);
  });

  it('rechaza una cantidad de cero', () => {
    const result = createTransactionSchema.safeParse(validPayload({ amount: '0' }));
    expect(result.success).toBe(false);
  });

  it('rechaza una cantidad negativa', () => {
    const result = createTransactionSchema.safeParse(validPayload({ amount: '-10' }));
    expect(result.success).toBe(false);
  });

  it('rechaza una cantidad demasiado alta', () => {
    const result = createTransactionSchema.safeParse(validPayload({ amount: '9999999999' }));
    expect(result.success).toBe(false);
  });

  it('acepta una cantidad como string y la convierte a número', () => {
    const result = createTransactionSchema.safeParse(
      validPayload({ type: 'income', description: 'Nómina', amount: '1800.50' }),
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amount).toBe(1800.5);
    }
  });

  it('rechaza un categoryId que no es UUID', () => {
    const result = createTransactionSchema.safeParse(validPayload({ categoryId: 'no-es-un-uuid' }));
    expect(result.success).toBe(false);
  });

  it('rechaza una moneda no soportada', () => {
    const result = createTransactionSchema.safeParse(validPayload({ currency: 'ZZZ' }));
    expect(result.success).toBe(false);
  });

  it('acepta cualquier moneda de la lista soportada', () => {
    const result = createTransactionSchema.safeParse(validPayload({ currency: 'USD' }));
    expect(result.success).toBe(true);
  });
});

describe('updateTransactionSchema', () => {
  it('exige un id UUID válido además de los campos normales', () => {
    const result = updateTransactionSchema.safeParse(validPayload({ id: 'no-es-un-uuid' }));
    expect(result.success).toBe(false);
  });

  it('acepta un movimiento completo con id válido', () => {
    const result = updateTransactionSchema.safeParse(validPayload({ id: VALID_UUID }));
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
