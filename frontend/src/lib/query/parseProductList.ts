import type { Product } from '../../types';

export interface ProductListResult {
  products: Product[];
  total: number;
  page: number;
}

export function parseProductListResponse(
  response: unknown,
  page = 1,
  limit = 15,
): ProductListResult {
  if (Array.isArray(response)) {
    return { products: response, total: response.length, page };
  }
  if (response && typeof response === 'object' && 'datos' in response) {
    const api = response as {
      datos?: Product[];
      paginacion?: { totalElementos?: number; paginaActual?: number };
    };
    const list = Array.isArray(api.datos) ? api.datos : [];
    const total = api.paginacion?.totalElementos ?? list.length;
    return { products: list, total, page: api.paginacion?.paginaActual ?? page };
  }
  return { products: [], total: 0, page };
}

export function hasMoreProducts(
  mergedLength: number,
  total: number,
  lastPageSize: number,
  limit: number,
): boolean {
  if (total > 0) return mergedLength < total;
  return lastPageSize >= limit;
}
