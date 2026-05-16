import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { productService } from '../../../services/productService';
import type { Product, ProductFilters } from '../../../types';
import { parseProductListResponse, hasMoreProducts } from '../parseProductList';
import { queryKeys } from '../queryKeys';
import { STALE_TIMES } from '../queryClient';

export function useProductsListQuery(filters: ProductFilters) {
  return useQuery({
    queryKey: queryKeys.products.list(filters),
    queryFn: async () => {
      const res = await productService.getProducts({ ...filters, page: filters.page ?? 1 });
      return parseProductListResponse(res, filters.page ?? 1, filters.limit ?? 15);
    },
    staleTime: STALE_TIMES.catalog,
    placeholderData: (prev) => prev,
  });
}

export function useProductsInfiniteQuery(filters: Omit<ProductFilters, 'page'>) {
  const limit = filters.limit ?? 15;
  return useInfiniteQuery({
    queryKey: queryKeys.products.list({ ...filters, page: 1 }),
    queryFn: async ({ pageParam }) => {
      const page = pageParam as number;
      const res = await productService.getProducts({ ...filters, page, limit });
      return parseProductListResponse(res, page, limit);
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const merged = allPages.flatMap((p) => p.products).length;
      const lastSize = lastPage.products.length;
      if (
        !hasMoreProducts(merged, lastPage.total, lastSize, limit)
      ) {
        return undefined;
      }
      return lastPage.page + 1;
    },
    staleTime: STALE_TIMES.catalog,
    placeholderData: (prev) => prev,
  });
}

export function useProductDetailQuery(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.products.detail(id ?? ''),
    queryFn: () => productService.getProductById(id!),
    enabled: Boolean(id),
    staleTime: STALE_TIMES.productDetail,
  });
}

/** PDP prefetch on hover/focus (TanStack prefetching guide). */
export function prefetchProductDetail(client: QueryClient, id: string | undefined) {
  if (!id) return Promise.resolve();
  return client.prefetchQuery({
    queryKey: queryKeys.products.detail(id),
    queryFn: () => productService.getProductById(id),
    staleTime: STALE_TIMES.productDetail,
  });
}

export function useRelatedProductsQuery(productId: string | undefined, categoryId?: string, enabledOverride = true) {
  return useQuery({
    queryKey: queryKeys.products.related(productId ?? ''),
    queryFn: async (): Promise<Product[]> => {
      const res = await productService.getProducts({
        categoria: categoryId,
        limit: 4,
        estado: 'aprobado',
      });
      const { products } = parseProductListResponse(res);
      return products.filter((p) => p._id !== productId).slice(0, 4);
    },
    enabled: Boolean(productId && categoryId) && enabledOverride,
    staleTime: STALE_TIMES.catalog,
  });
}

export function useHomeProductsQueries() {
  const featured = useQuery({
    queryKey: queryKeys.products.home.featured(),
    queryFn: async () =>
      parseProductListResponse(
        await productService.getProducts({ limit: 6, estado: 'aprobado' }),
      ).products,
    staleTime: STALE_TIMES.homeRails,
  });
  const newArrivals = useQuery({
    queryKey: queryKeys.products.home.newArrivals(),
    queryFn: async () =>
      parseProductListResponse(
        await productService.getProducts({ limit: 6, ordenar: 'fecha-desc' }),
      ).products,
    staleTime: STALE_TIMES.homeRails,
  });
  const valuePicks = useQuery({
    queryKey: queryKeys.products.home.valuePicks(),
    queryFn: async () =>
      parseProductListResponse(
        await productService.getProducts({ limit: 6, ordenar: 'precio-asc' }),
      ).products,
    staleTime: STALE_TIMES.homeRails,
  });
  return { featured, newArrivals, valuePicks };
}

export function useInvalidateProducts() {
  const qc = useQueryClient();
  return {
    invalidateCatalog: () =>
      qc.invalidateQueries({ queryKey: queryKeys.products.lists() }),
    invalidateDetail: (id: string) =>
      qc.invalidateQueries({ queryKey: queryKeys.products.detail(id) }),
    invalidateHome: () =>
      qc.invalidateQueries({ queryKey: queryKeys.products.all }),
  };
}
