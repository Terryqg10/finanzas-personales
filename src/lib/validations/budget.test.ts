import { describe, expect, it } from 'vitest';

import { createBudgetSchema, deleteBudgetSchema, updateBudgetSchema } from './budget';

const VALID_UUID = '11111111-1111-4111-8111-111111111111';

const validPayload = {
  categoryId: VALID_UUID,
  monthlyLimit: '300',
  alertThreshold: '80',
};

describe('createBudgetSchema', () => {
  it('acepta un presupuesto válido', () => {
    const result = createBudgetSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('rechaza un categoryId que no es UUID', () => {
    const result = createBudgetSchema.safeParse({ ...validPayload, categoryId: '123' });
    expect(result.success).toBe(false);
  });

  it('coacciona el límite mensual a número', () => {
    const result = createBudgetSchema.safeParse({ ...validPayload, monthlyLimit: '199.99' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.monthlyLimit).toBe(199.99);
    }
  });

  it('rechaza un límite mensual negativo o cero', () => {
    const result = createBudgetSchema.safeParse({ ...validPayload, monthlyLimit: '0' });
    expect(result.success).toBe(false);
  });

  it('rechaza un límite mensual no numérico', () => {
    const result = createBudgetSchema.safeParse({ ...validPayload, monthlyLimit: 'mucho' });
    expect(result.success).toBe(false);
  });

  it('acepta un umbral de alerta de exactamente 100', () => {
    const result = createBudgetSchema.safeParse({ ...validPayload, alertThreshold: '100' });
    expect(result.success).toBe(true);
  });

  it('rechaza un umbral de alerta superior a 100', () => {
    const result = createBudgetSchema.safeParse({ ...validPayload, alertThreshold: '101' });
    expect(result.success).toBe(false);
  });

  it('rechaza un umbral de alerta negativo o cero', () => {
    const result = createBudgetSchema.safeParse({ ...validPayload, alertThreshold: '0' });
    expect(result.success).toBe(false);
  });
});

describe('updateBudgetSchema', () => {
  it('rechaza un id que no tiene formato UUID', () => {
    const result = updateBudgetSchema.safeParse({
      id: 'no-es-un-uuid',
      monthlyLimit: '300',
      alertThreshold: '80',
    });
    expect(result.success).toBe(false);
  });

  it('acepta un id UUID válido junto con límite y umbral, sin categoryId', () => {
    const result = updateBudgetSchema.safeParse({
      id: VALID_UUID,
      monthlyLimit: '300',
      alertThreshold: '80',
    });
    expect(result.success).toBe(true);
  });
});

describe('deleteBudgetSchema', () => {
  it('rechaza un id que no es UUID', () => {
    const result = deleteBudgetSchema.safeParse({ id: '123' });
    expect(result.success).toBe(false);
  });

  it('acepta un id UUID válido', () => {
    const result = deleteBudgetSchema.safeParse({ id: VALID_UUID });
    expect(result.success).toBe(true);
  });
});
