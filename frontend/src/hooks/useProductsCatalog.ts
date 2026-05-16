import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ProductFilters } from '../types';
import { useDebouncedValue } from './useDebouncedValue';
import { useActiveCategoriesQuery } from '../lib/query/hooks/useCategoriesQuery';
import { useProductsInfiniteQuery } from '../lib/query/hooks/useProductsQuery';

function parseNum(v: string | null): number | undefined {
  if (v == null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function readFilters(sp: URLSearchParams): Omit<ProductFilters, 'q'> & { page: number; limit: number } {
  return {
    categoria: sp.get('categoria') || '',
    precioMin: parseNum(sp.get('precioMin')),
    precioMax: parseNum(sp.get('precioMax')),
    ordenar: sp.get('ordenar') || 'fecha-desc',
    page: 1,
    limit: 15,
  };
}

function paramsFromFilters(f: ProductFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.q) p.set('q', f.q);
  if (f.categoria) p.set('categoria', f.categoria);
  if (f.precioMin != null && !Number.isNaN(f.precioMin)) p.set('precioMin', String(f.precioMin));
  if (f.precioMax != null && !Number.isNaN(f.precioMax)) p.set('precioMax', String(f.precioMax));
  if (f.ordenar && f.ordenar !== 'fecha-desc') p.set('ordenar', f.ordenar);
  return p;
}

function serializeSorted(sp: URLSearchParams): string {
  return Array.from(sp.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
}

export function useProductsCatalog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [qInput, setQInput] = useState(() => searchParams.get('q') || '');
  const debouncedQ = useDebouncedValue(qInput, 300);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState<ProductFilters>(() => ({
    q: searchParams.get('q') || '',
    ...readFilters(searchParams),
  }));

  useEffect(() => {
    const qUrl = searchParams.get('q') || '';
    const base = readFilters(searchParams);
    setQInput(qUrl);
    setFilters((prev) => ({ ...prev, q: qUrl, ...base }));
  }, [searchParams]);

  const filtersForApi = useMemo(
    () => ({ ...filters, q: debouncedQ }),
    [filters, debouncedQ],
  );

  useEffect(() => {
    const next = paramsFromFilters(filtersForApi);
    const cur = new URLSearchParams(searchParams.toString());
    if (serializeSorted(next) !== serializeSorted(cur)) {
      setSearchParams(next, { replace: true });
    }
  }, [filtersForApi, searchParams, setSearchParams]);

  const listFilters = useMemo(
    () => ({
      categoria: filtersForApi.categoria,
      precioMin: filtersForApi.precioMin,
      precioMax: filtersForApi.precioMax,
      ordenar: filtersForApi.ordenar,
      q: filtersForApi.q,
      limit: filtersForApi.limit ?? 15,
    }),
    [
      filtersForApi.categoria,
      filtersForApi.precioMin,
      filtersForApi.precioMax,
      filtersForApi.ordenar,
      filtersForApi.q,
      filtersForApi.limit,
    ],
  );

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
    refetch,
    isError,
  } = useProductsInfiniteQuery(listFilters);

  const categoriesQuery = useActiveCategoriesQuery();

  const products = useMemo(
    () => data?.pages.flatMap((p) => p.products) ?? [],
    [data],
  );

  const handleFilterChange = useCallback((key: keyof ProductFilters, value: unknown) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  }, []);

  const clearFilters = useCallback(() => {
    setQInput('');
    setFilters({
      q: '',
      categoria: '',
      precioMin: undefined,
      precioMax: undefined,
      ordenar: 'fecha-desc',
      page: 1,
      limit: 15,
    });
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [setSearchParams]);

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return {
    products,
    loading: isLoading,
    loadingMore: isFetchingNextPage,
    error: isError
      ? error instanceof Error
        ? error.message
        : 'Error cargando productos'
      : null,
    hasMore: Boolean(hasNextPage),
    categories: categoriesQuery.data ?? [],
    categoriesError: categoriesQuery.isError
      ? categoriesQuery.error instanceof Error
        ? categoriesQuery.error.message
        : 'No se pudieron cargar categorías'
      : null,
    filters: filtersForApi,
    qInput,
    setQInput,
    handleFilterChange,
    clearFilters,
    loadMore,
    showFilters,
    setShowFilters,
    refetch,
  };
}
