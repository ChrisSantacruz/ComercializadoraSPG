import { useMemo } from 'react';
import { useActiveCategoriesQuery } from '../lib/query/hooks/useCategoriesQuery';
import { useHomeProductsQueries } from '../lib/query/hooks/useProductsQuery';
import type { Category, Product } from '../types';

export type HomeLoadState = 'idle' | 'loading' | 'success' | 'error';

export interface HomeSectionState<T> {
  state: HomeLoadState;
  data: T;
  error: string | null;
}

export interface HomeDataState {
  featured: HomeSectionState<Product[]>;
  newArrivals: HomeSectionState<Product[]>;
  valuePicks: HomeSectionState<Product[]>;
  categories: HomeSectionState<Category[]>;
}

function sectionFromQuery<T>(q: {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  data: T | undefined;
}): HomeSectionState<T> {
  if (q.isLoading && q.data === undefined) {
    return { state: 'loading', data: [] as T, error: null };
  }
  if (q.isError) {
    const msg =
      q.error instanceof Error ? q.error.message : 'No pudimos cargar esta sección.';
    return { state: 'error', data: [] as T, error: msg };
  }
  return { state: 'success', data: q.data ?? ([] as T), error: null };
}

export function useHomeData() {
  const { featured, newArrivals, valuePicks } = useHomeProductsQueries();
  const categoriesQuery = useActiveCategoriesQuery();

  const data = useMemo<HomeDataState>(
    () => ({
      featured: sectionFromQuery(featured),
      newArrivals: sectionFromQuery(newArrivals),
      valuePicks: sectionFromQuery(valuePicks),
      categories: sectionFromQuery({
        isLoading: categoriesQuery.isLoading,
        isError: categoriesQuery.isError,
        error: categoriesQuery.error,
        data: categoriesQuery.data,
      }),
    }),
    [featured, newArrivals, valuePicks, categoriesQuery],
  );

  const reload = () => {
    void featured.refetch();
    void newArrivals.refetch();
    void valuePicks.refetch();
    void categoriesQuery.refetch();
  };

  return { data, reload };
}
