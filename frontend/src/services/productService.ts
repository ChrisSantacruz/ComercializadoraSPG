import api, { handleApiResponse } from './api';
import { Product, ProductFilters, PaginatedResponse, Category } from '../types';

export const productService = {
  // Obtener productos con filtros
  getProducts: async (filters: ProductFilters = {}): Promise<PaginatedResponse<Product>> => {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response = await api.get(`/products?${params.toString()}`);
    return handleApiResponse<PaginatedResponse<Product>>(response);
  },

  // Obtener producto por ID
  getProductById: async (id: string): Promise<Product> => {
    const response = await api.get(`/products/${id}`);
    return handleApiResponse<Product>(response);
  },

  // Buscar productos
  searchProducts: async (query: string, filters: Partial<ProductFilters> = {}): Promise<PaginatedResponse<Product>> => {
    const params = new URLSearchParams({ q: query });
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response = await api.get(`/products/search?${params.toString()}`);
    return handleApiResponse<PaginatedResponse<Product>>(response);
  },

  // Obtener productos relacionados
  getRelatedProducts: async (productId: string, limit: number = 4): Promise<Product[]> => {
    const response = await api.get(`/products/${productId}/related?limit=${limit}`);
    return handleApiResponse<Product[]>(response);
  },

  // Obtener productos por categoría
  getProductsByCategory: async (categoryId: string, filters: Partial<ProductFilters> = {}): Promise<PaginatedResponse<Product>> => {
    const params = new URLSearchParams({ categoria: categoryId });
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response = await api.get(`/products?${params.toString()}`);
    return handleApiResponse<PaginatedResponse<Product>>(response);
  },

  // Obtener productos destacados
  getFeaturedProducts: async (limit: number = 8): Promise<Product[]> => {
    const response = await api.get(`/products/featured?limit=${limit}`);
    return handleApiResponse<Product[]>(response);
  },

  // Obtener productos más vendidos
  getBestSellers: async (limit: number = 8): Promise<Product[]> => {
    const response = await api.get(`/products/best-sellers?limit=${limit}`);
    return handleApiResponse<Product[]>(response);
  },

  // Obtener productos recientes
  getRecentProducts: async (limit: number = 8): Promise<Product[]> => {
    const response = await api.get(`/products/recent?limit=${limit}`);
    return handleApiResponse<Product[]>(response);
  },

  // Obtener categorías
  getCategories: async (): Promise<Category[]> => {
    const response = await api.get('/categories');
    return handleApiResponse<Category[]>(response);
  },

  // Obtener árbol de categorías
  getCategoryTree: async (): Promise<Category[]> => {
    const response = await api.get('/categories/tree');
    return handleApiResponse<Category[]>(response);
  },

  // Obtener rangos de precios para filtros
  getPriceRanges: async (categoryId?: string): Promise<{
    min: number;
    max: number;
    ranges: Array<{ min: number; max: number; count: number }>;
  }> => {
    const params = categoryId ? `?categoria=${categoryId}` : '';
    const response = await api.get(`/products/price-ranges${params}`);
    return handleApiResponse<{
      min: number;
      max: number;
      ranges: Array<{ min: number; max: number; count: number }>;
    }>(response);
  },

  // Obtener sugerencias de búsqueda
  getSearchSuggestions: async (query: string): Promise<{
    productos: Array<{ _id: string; nombre: string; imagen: string; precio: number }>;
    categorias: Array<{ _id: string; nombre: string; slug: string }>;
    comerciantes: Array<{ _id: string; nombre: string }>;
  }> => {
    const response = await api.get(`/products/suggestions?q=${encodeURIComponent(query)}`);
    return handleApiResponse<{
      productos: Array<{ _id: string; nombre: string; imagen: string; precio: number }>;
      categorias: Array<{ _id: string; nombre: string; slug: string }>;
      comerciantes: Array<{ _id: string; nombre: string }>;
    }>(response);
  },

  // Crear producto (comerciante)
  createProduct: async (productData: FormData): Promise<Product> => {
    const response = await api.post('/products', productData);
    return handleApiResponse<Product>(response);
  },

  // Actualizar producto (comerciante)
  updateProduct: async (id: string, productData: FormData): Promise<Product> => {
    const response = await api.put(`/products/${id}`, productData);
    return handleApiResponse<Product>(response);
  },

  // Eliminar producto (comerciante)
  deleteProduct: async (id: string): Promise<void> => {
    const response = await api.delete(`/products/${id}`);
    return handleApiResponse<void>(response);
  },

  // Obtener estadísticas del producto (comerciante)
  getProductStats: async (id: string): Promise<{
    vistas: number;
    ventasUltimos30Dias: number;
    ingresosTotales: number;
    promedioCalificacion: number;
    totalReseñas: number;
  }> => {
    const response = await api.get(`/products/${id}/stats`);
    return handleApiResponse<{
      vistas: number;
      ventasUltimos30Dias: number;
      ingresosTotales: number;
      promedioCalificacion: number;
      totalReseñas: number;
    }>(response);
  },
}; 