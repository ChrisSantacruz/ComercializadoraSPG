import type { Category } from '../types';
import { useActiveCategoriesQuery } from '../lib/query/hooks/useCategoriesQuery';

export function useNavCategories(): Category[] {
  const { data } = useActiveCategoriesQuery();
  return data ?? [];
}
