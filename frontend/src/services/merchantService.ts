import api, { handleApiResponse } from './api';
import { ApiResponse, Product, Order, PaginatedResponse, DashboardStats, AnalyticsData, ProductFilters, OrderFilters } from '../types';

export const merchantService = {
  // Dashboard y estadísticas
  getDashboardStats: async (): Promise<DashboardStats> => {
    const response = await api.get<ApiResponse<DashboardStats>>('/commerce/dashboard');
    return handleApiResponse(response);
  },

  getAnalytics: async (periodo: string): Promise<AnalyticsData> => {
    const response = await api.get<ApiResponse<AnalyticsData>>(`/commerce/sales?periodo=${periodo}`);
    return handleApiResponse(response);
  },

  // Gestión de productos
  getProducts: async (filters?: ProductFilters): Promise<PaginatedResponse<Product>> => {
    const response = await api.get<ApiResponse<any>>('/commerce/products', {
      params: {
        page: filters?.page || 1,
        limit: filters?.limit || 10,
        estado: filters?.estado,
        busqueda: filters?.q,
        ordenar: filters?.ordenar || 'fechaCreacion'
      }
    });
    
    const data = handleApiResponse(response);
    
    // Adaptar la respuesta del backend al formato esperado
    return {
      datos: data.productos || [],
      paginacion: data.paginacion || {
        paginaActual: 1,
        totalPaginas: 1,
        totalElementos: 0,
        elementosPorPagina: 10
      }
    };
  },

  getProductById: async (id: string): Promise<Product> => {
    const response = await api.get<ApiResponse<Product>>(`/products/${id}`);
    return handleApiResponse(response);
  },

  createProduct: async (productData: FormData): Promise<Product> => {
    const response = await api.post<ApiResponse<Product>>('/products', productData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return handleApiResponse(response);
  },

  updateProduct: async (id: string, productData: FormData): Promise<Product> => {
    const response = await api.put<ApiResponse<Product>>(`/products/${id}`, productData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return handleApiResponse(response);
  },

  deleteProduct: async (id: string): Promise<{ mensaje: string }> => {
    const response = await api.delete<ApiResponse<{ mensaje: string }>>(`/products/${id}`);
    return handleApiResponse(response);
  },

  // Gestión de órdenes
  getOrders: async (filters?: OrderFilters): Promise<PaginatedResponse<Order>> => {
    const response = await api.get<ApiResponse<any>>('/commerce/orders', {
      params: {
        page: filters?.page || 1,
        limit: filters?.limit || 10,
        estado: filters?.estado,
        fechaDesde: filters?.fechaDesde,
        fechaHasta: filters?.fechaHasta
      }
    });
    
    const data = handleApiResponse(response);
    
    // Adaptar la respuesta del backend al formato esperado
    return {
      datos: data.pedidos || [],
      paginacion: data.paginacion || {
        paginaActual: 1,
        totalPaginas: 1,
        totalElementos: 0,
        elementosPorPagina: 10
      }
    };
  },

  updateOrderStatus: async (orderId: string, data: {
    estado: string;
    numeroSeguimiento?: string;
    transportadora?: string;
    comentario?: string;
  }): Promise<Order> => {
    const response = await api.put<ApiResponse<Order>>(`/commerce/orders/${orderId}/status`, data);
    return handleApiResponse(response);
  },

  // Reportes
  generateSalesReport: async (filters: {
    fechaDesde?: string;
    fechaHasta?: string;
    formato?: 'pdf' | 'excel';
  }): Promise<Blob> => {
    const response = await api.get('/commerce/reports/sales', {
      params: filters,
      responseType: 'blob'
    });
    return response.data;
  },

  generateProductReport: async (filters: {
    fechaDesde?: string;
    fechaHasta?: string;
    formato?: 'pdf' | 'excel';
  }): Promise<Blob> => {
    const response = await api.get('/commerce/reports/products', {
      params: filters,
      responseType: 'blob'
    });
    return response.data;
  }
};

export default merchantService; 