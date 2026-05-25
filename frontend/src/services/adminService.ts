import { PaginatedResponse, Product, User } from '../types';
import api, { handleApiResponse } from './api';

export interface AdminDashboard {
  metrics: {
    totalUsers: number;
    totalMerchants: number;
    totalProducts: number;
    pendingProducts: number;
    rejectedProducts: number;
    totalOrders: number;
  };
  recentActivity: {
    products: Product[];
    users: User[];
  };
}

export const adminService = {
  getDashboard: async (): Promise<AdminDashboard> => {
    const response = await api.get('/admin/dashboard');
    return handleApiResponse<AdminDashboard>(response);
  },

  getProducts: async (params?: {
    page?: number;
    limit?: number;
    estado?: string;
    q?: string;
  }): Promise<PaginatedResponse<Product>> => {
    const response = await api.get('/admin/products', { params });
    return handleApiResponse<PaginatedResponse<Product>>(response);
  },

  approveProduct: async (id: string): Promise<Product> => {
    const response = await api.patch(`/admin/products/${id}/approve`);
    return handleApiResponse<Product>(response);
  },

  rejectProduct: async (id: string, reason: string): Promise<Product> => {
    const response = await api.patch(`/admin/products/${id}/reject`, { reason });
    return handleApiResponse<Product>(response);
  },

  suspendProduct: async (id: string, reason?: string): Promise<Product> => {
    const response = await api.patch(`/admin/products/${id}/suspend`, { reason });
    return handleApiResponse<Product>(response);
  },

  deleteProduct: async (id: string): Promise<void> => {
    const response = await api.delete(`/admin/products/${id}`);
    return handleApiResponse<void>(response);
  },

  getUsers: async (params?: {
    page?: number;
    limit?: number;
    rol?: string;
    estado?: string;
    q?: string;
  }): Promise<PaginatedResponse<User>> => {
    const response = await api.get('/admin/users', { params });
    return handleApiResponse<PaginatedResponse<User>>(response);
  },

  updateUserStatus: async (id: string, estado: 'activo' | 'inactivo' | 'bloqueado'): Promise<User> => {
    const response = await api.patch(`/admin/users/${id}/status`, { estado });
    return handleApiResponse<User>(response);
  },
};

export default adminService;
