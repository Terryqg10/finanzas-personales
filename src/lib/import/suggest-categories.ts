/**
 * Categoría sugerida para cada fila de un extracto a partir del historial del
 * propio usuario. Función pura, sin I/O.
 * Spec: specs/importacion-categorias-automaticas.md, secciones 2 y 3.
 */

import { normalizeConcept } from './import-key';

export type SuggestionType = 'income' | 'expense';

/** Un movimiento ya guardado: de él se aprende la categoría de cada comercio. */
export interface CategoryHistoryEntry {
  description: string;
  type: SuggestionType;
  categoryId: string;
  /** Fecha ISO `aaaa-mm-dd`; desempata a favor de la categoría usada más recientemente. */
  date: string;
}

export interface SuggestableRow {
  description: string;
  type: SuggestionType;
}

interface CategoryStats {
  count: number;
  lastDate: string;
}

/** Concepto normalizado + tipo: un gasto nunca aprende de un ingreso con el mismo nombre. */
function buildLookupKey(description: string, type: SuggestionType): string {
  return `${type}|${normalizeConcept(description)}`;
}

/** Más usada; si empatan, la usada más recientemente; si persiste, orden estable por id. */
function pickBest(stats: Map<string, CategoryStats>): string | null {
  let best: { categoryId: string; stats: CategoryStats } | null = null;

  for (const [categoryId, candidate] of stats) {
    if (
      best === null ||
      candidate.count > best.stats.count ||
      (candidate.count === best.stats.count && candidate.lastDate > best.stats.lastDate) ||
      (candidate.count === best.stats.count &&
        candidate.lastDate === best.stats.lastDate &&
        categoryId < best.categoryId)
    ) {
      best = { categoryId, stats: candidate };
    }
  }

  return best?.categoryId ?? null;
}

/**
 * Sugerencia por fila, en el mismo orden que `rows`; `null` si el comercio no
 * aparece en el historial (se mantiene entonces la categoría por defecto).
 */
export function suggestCategories(
  history: readonly CategoryHistoryEntry[],
  rows: readonly SuggestableRow[],
): (string | null)[] {
  const byMerchant = new Map<string, Map<string, CategoryStats>>();

  for (const entry of history) {
    const key = buildLookupKey(entry.description, entry.type);
    const stats = byMerchant.get(key) ?? new Map<string, CategoryStats>();
    const current = stats.get(entry.categoryId);

    stats.set(entry.categoryId, {
      count: (current?.count ?? 0) + 1,
      lastDate: current && current.lastDate > entry.date ? current.lastDate : entry.date,
    });
    byMerchant.set(key, stats);
  }

  return rows.map((row) => {
    const stats = byMerchant.get(buildLookupKey(row.description, row.type));
    return stats ? pickBest(stats) : null;
  });
}
