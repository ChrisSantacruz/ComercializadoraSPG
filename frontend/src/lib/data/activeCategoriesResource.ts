import type { Category } from '../../types';
import categoryService from '../../services/categoryService';
import { appQueryClient } from '../query/queryClient';
import { queryKeys } from '../query/queryKeys';

/** TTL alineado a taxonomías “casi estáticas” (DEC-DATA-002 / decisions.md). */
const TTL_MS = 5 * 60 * 1000;

type CacheEntry = { data: Category[]; expiresAt: number };

let cache: CacheEntry | null = null;
let inflight: Promise<Category[]> | null = null;

/**
 * Lectura deduplicada de categorías activas: una sola request en vuelo y reutilización por TTL.
 * Evita el patrón Home → Catálogo → Detalle disparando `/categories/active` en paralelo.
 */
export function loadActiveCategories(): Promise<Category[]> {
  if (cache && Date.now() < cache.expiresAt) {
    return Promise.resolve(cache.data);
  }
  if (inflight) {
    return inflight;
  }

  inflight = categoryService
    .getActiveCategories()
    .then((raw) => {
      const list = Array.isArray(raw) ? raw : [];
      cache = { data: list, expiresAt: Date.now() + TTL_MS };
      return list;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

export function invalidateActiveCategoriesCache(): void {
  cache = null;
  void appQueryClient.invalidateQueries({ queryKey: queryKeys.categories.active() });
}
