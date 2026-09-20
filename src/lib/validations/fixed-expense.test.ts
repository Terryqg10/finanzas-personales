import { describe, expect, it } from 'vitest';

import {
  createFixedExpenseSchema,
  deleteFixedExpenseSchema,
  toggleFixedExpenseSchema,
  updateFixedExpenseSchema,
} from './fixed-expense';

const VALID_UUID = '11111111-1111-4111-8111-111111111111';

const validPayload = {
  description: 'Alquiler',
  amount: '650',
  currency: 'EUR',
  categoryId: VALID_UUID,
  frequency: 'monthly',
  nextDueDate: '2026-10-01',
};

describe('createFixedExpenseSchema', () => {
  it('acepta un gasto fijo válido', () => {
    const result = createFixedExpenseSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('recorta espacios en blanco de la descripción', () => {
    const result = createFixedExpenseSchema.safeParse({
      ...validPayload,
      description: '  Alquiler  ',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBe('Alquiler');
    }
  });

  it('rechaza una descripción vacía o solo espacios', () => {
    const result = createFixedExpenseSchema.safeParse({ ...validPayload, description: '   ' });
    expect(result.success).toBe(false);
  });

  it('rechaza una descripción de más de 200 caracteres', () => {
    const result = createFixedExpenseSchema.safeParse({
      ...validPayload,
      description: 'a'.repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it('coacciona la cantidad a número', () => {
    const result = createFixedExpenseSchema.safeParse({ ...validPayload, amount: '199.99' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amount).toBe(199.99);
    }
  });

  it('rechaza una cantidad negativa o cero', () => {
    const result = createFixedExpenseSchema.safeParse({ ...validPayload, amount: '0' });
    expect(result.success).toBe(false);
  });

  it('rechaza una cantidad no numérica', () => {
    const result = createFixedExpenseSchema.safeParse({ ...validPayload, amount: 'mucho' });
    expect(result.success).toBe(false);
  });

  it('rechaza una moneda no soportada', () => {
    const result = createFixedExpenseSchema.safeParse({ ...validPayload, currency: 'XYZ' });
    expect(result.success).toBe(false);
  });

  it('rechaza un categoryId que no es UUID', () => {
    const result = createFixedExpenseSchema.safeParse({ ...validPayload, categoryId: '123' });
    expect(result.success).toBe(false);
  });

  it('rechaza una frecuencia fuera de la lista curada', () => {
    const result = createFixedExpenseSchema.safeParse({ ...validPayload, frequency: 'diaria' });
    expect(result.success).toBe(false);
  });

  it('acepta las tres frecuencias válidas', () => {
    for (const frequency of ['weekly', 'monthly', 'yearly']) {
      const result = createFixedExpenseSchema.safeParse({ ...validPayload, frequency });
      expect(result.success).toBe(true);
    }
  });

  it('rechaza una fecha de vencimiento inválida', () => {
    const result = createFixedExpenseSchema.safeParse({
      ...validPayload,
      nextDueDate: 'no-es-una-fecha',
    });
    expect(result.success).toBe(false);
  });
});

describe('updateFixedExpenseSchema', () => {
  it('rechaza un id que no tiene formato UUID', () => {
    const result = updateFixedExpenseSchema.safeParse({ ...validPayload, id: 'no-es-un-uuid' });
    expect(result.success).toBe(false);
  });

  it('acepta un id UUID válido junto con los demás campos', () => {
    const result = updateFixedExpenseSchema.safeParse({ ...validPayload, id: VALID_UUID });
    expect(result.success).toBe(true);
  });
});

describe('deleteFixedExpenseSchema', () => {
  it('rechaza un id que no es UUID', () => {
    const result = deleteFixedExpenseSchema.safeParse({ id: '123' });
    expect(result.success).toBe(false);
  });

  it('acepta un id UUID válido', () => {
    const result = deleteFixedExpenseSchema.safeParse({ id: VALID_UUID });
    expect(result.success).toBe(true);
  });
});

describe('toggleFixedExpenseSchema', () => {
  it('acepta status "active"', () => {
    const result = toggleFixedExpenseSchema.safeParse({ id: VALID_UUID, status: 'active' });
    expect(result.success).toBe(true);
  });

  it('acepta status "paused"', () => {
    const result = toggleFixedExpenseSchema.safeParse({ id: VALID_UUID, status: 'paused' });
    expect(result.success).toBe(true);
  });

  it('rechaza un status fuera de la lista curada', () => {
    const result = toggleFixedExpenseSchema.safeParse({ id: VALID_UUID, status: 'cancelado' });
    expect(result.success).toBe(false);
  });
});
