import { useQuery } from '@tanstack/react-query';
import categoryService from '../../../services/categoryService';
import type { Category } from '../../../types';
import { queryKeys } from '../queryKeys';
import { STALE_TIMES } from '../queryClient';

export function useActiveCategoriesQuery() {
  return useQuery({
    queryKey: queryKeys.categories.active(),
    queryFn: (): Promise<Category[]> => categoryService.getActiveCategories(),
    staleTime: STALE_TIMES.categories,
    gcTime: STALE_TIMES.categories * 2,
  });
}

export function useCategoryQuery(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.categories.detail(id ?? ''),
    queryFn: () => categoryService.getCategoryById(id!),
    enabled: Boolean(id) && enabled,
    staleTime: STALE_TIMES.categories,
  });
}
