import { describe, expect, it } from 'vitest';

import { createCategorySchema, deleteCategorySchema, updateCategorySchema } from './category';

describe('createCategorySchema', () => {
  it('acepta una categoría válida', () => {
    const result = createCategorySchema.safeParse({
      name: 'Mascotas',
      color: '#FF00AA',
      icon: 'paw-print',
      isEssential: 'false',
    });
    expect(result.success).toBe(true);
  });

  it('recorta espacios en blanco del nombre', () => {
    const result = createCategorySchema.safeParse({
      name: '  Mascotas  ',
      color: '#FF00AA',
      icon: 'paw-print',
      isEssential: 'false',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Mascotas');
    }
  });

  it('rechaza un nombre vacío o solo espacios', () => {
    const result = createCategorySchema.safeParse({
      name: '   ',
      color: '#FF00AA',
      icon: 'paw-print',
      isEssential: 'false',
    });
    expect(result.success).toBe(false);
  });

  it('rechaza un nombre de más de 40 caracteres', () => {
    const result = createCategorySchema.safeParse({
      name: 'a'.repeat(41),
      color: '#FF00AA',
      icon: 'paw-print',
      isEssential: 'false',
    });
    expect(result.success).toBe(false);
  });

  it('acepta un nombre de exactamente 40 caracteres (límite inclusivo)', () => {
    const result = createCategorySchema.safeParse({
      name: 'a'.repeat(40),
      color: '#FF00AA',
      icon: 'paw-print',
      isEssential: 'false',
    });
    expect(result.success).toBe(true);
  });

  it('rechaza un color con formato inválido', () => {
    const result = createCategorySchema.safeParse({
      name: 'Mascotas',
      color: 'azul',
      icon: 'paw-print',
      isEssential: 'false',
    });
    expect(result.success).toBe(false);
  });

  it('rechaza un color sin el símbolo #', () => {
    const result = createCategorySchema.safeParse({
      name: 'Mascotas',
      color: 'FF00AA',
      icon: 'paw-print',
      isEssential: 'false',
    });
    expect(result.success).toBe(false);
  });

  it('rechaza un ícono que no está en la lista curada', () => {
    const result = createCategorySchema.safeParse({
      name: 'Mascotas',
      color: '#FF00AA',
      icon: 'icono-inventado',
      isEssential: 'false',
    });
    expect(result.success).toBe(false);
  });

  it('transforma isEssential a booleano true', () => {
    const result = createCategorySchema.safeParse({
      name: 'Vivienda',
      color: '#FF00AA',
      icon: 'home',
      isEssential: 'true',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isEssential).toBe(true);
    }
  });

  it('transforma isEssential a booleano false', () => {
    const result = createCategorySchema.safeParse({
      name: 'Ocio',
      color: '#FF00AA',
      icon: 'popcorn',
      isEssential: 'false',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isEssential).toBe(false);
    }
  });

  it('rechaza un valor de isEssential que no sea "true" ni "false"', () => {
    const result = createCategorySchema.safeParse({
      name: 'Mascotas',
      color: '#FF00AA',
      icon: 'paw-print',
      isEssential: 'quizás',
    });
    expect(result.success).toBe(false);
  });
});

describe('updateCategorySchema', () => {
  it('rechaza un id que no tiene formato UUID', () => {
    const result = updateCategorySchema.safeParse({
      id: 'no-es-un-uuid',
      name: 'Mascotas',
      color: '#FF00AA',
      icon: 'paw-print',
      isEssential: 'false',
    });
    expect(result.success).toBe(false);
  });

  it('acepta un id UUID válido junto con los demás campos', () => {
    const result = updateCategorySchema.safeParse({
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Mascotas',
      color: '#FF00AA',
      icon: 'paw-print',
      isEssential: 'true',
    });
    expect(result.success).toBe(true);
  });
});

describe('deleteCategorySchema', () => {
  it('rechaza un id que no es UUID', () => {
    const result = deleteCategorySchema.safeParse({ id: '123' });
    expect(result.success).toBe(false);
  });

  it('acepta un id UUID válido', () => {
    const result = deleteCategorySchema.safeParse({
      id: '11111111-1111-4111-8111-111111111111',
    });
    expect(result.success).toBe(true);
  });
});
