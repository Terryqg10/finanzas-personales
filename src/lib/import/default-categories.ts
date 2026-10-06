/**
 * Categoría por defecto de cada tipo de movimiento importado (spec, sección 3):
 * las categorías globales "Otros" (gastos) e "Ingresos" (ingresos).
 */

interface CategoryRef {
  id: string;
  name: string;
  user_id: string | null;
}

export interface DefaultCategoryIds {
  expense: string | null;
  income: string | null;
}

function findGlobalByName(categories: readonly CategoryRef[], name: string): string | null {
  return categories.find((c) => c.user_id === null && c.name === name)?.id ?? null;
}

export function pickDefaultCategories(categories: readonly CategoryRef[]): DefaultCategoryIds {
  const fallback = categories[0]?.id ?? null;

  return {
    expense: findGlobalByName(categories, 'Otros') ?? fallback,
    income: findGlobalByName(categories, 'Ingresos') ?? fallback,
  };
}
