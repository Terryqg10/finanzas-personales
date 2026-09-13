import { z } from 'zod';

import { CATEGORY_ICONS } from '@/lib/category-icons';

// Distintos de los 8 colores ya usados por las categorías predefinidas
// (Fase 2), para reducir la chance de que una categoría propia quede
// visualmente idéntica a una global en los gráficos.
export const CATEGORY_COLOR_PRESETS = [
  '#EF4444',
  '#F59E0B',
  '#EAB308',
  '#84CC16',
  '#10B981',
  '#06B6D4',
  '#0EA5E9',
  '#D946EF',
  '#F43F5E',
  '#8B5CF6',
  '#65A30D',
  '#0891B2',
] as const;

const categoryIconKeys = Object.keys(CATEGORY_ICONS) as [string, ...string[]];

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio.').max(40, 'Máximo 40 caracteres.'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color inválido.'),
  icon: z.enum(categoryIconKeys, { message: 'Ícono inválido.' }),
});

export const updateCategorySchema = createCategorySchema.extend({
  id: z.string().uuid('Identificador inválido.'),
});

export interface CategoryActionState {
  status: 'idle' | 'error' | 'success';
  message: string | null;
}

export const initialCategoryState: CategoryActionState = { status: 'idle', message: null };
