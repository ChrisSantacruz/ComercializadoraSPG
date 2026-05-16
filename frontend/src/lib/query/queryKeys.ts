import type { OrderFilters, ProductFilters } from '../../types';

/** Query key factory — single source of truth (DEC-FE-007, no magic strings). */
export const queryKeys = {
  categories: {
    all: ['categories'] as const,
    active: () => [...queryKeys.categories.all, 'active'] as const,
    detail: (id: string) => [...queryKeys.categories.all, 'detail', id] as const,
  },
  products: {
    all: ['products'] as const,
    lists: () => [...queryKeys.products.all, 'list'] as const,
    list: (filters: ProductFilters) => [...queryKeys.products.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.products.all, 'detail', id] as const,
    related: (id: string) => [...queryKeys.products.all, 'related', id] as const,
    home: {
      featured: () => [...queryKeys.products.all, 'home', 'featured'] as const,
      newArrivals: () => [...queryKeys.products.all, 'home', 'new'] as const,
      valuePicks: () => [...queryKeys.products.all, 'home', 'value'] as const,
    },
  },
  cart: {
    all: ['cart'] as const,
    current: () => [...queryKeys.cart.all, 'current'] as const,
  },
  orders: {
    all: ['orders'] as const,
    list: (filters?: OrderFilters) => [...queryKeys.orders.all, 'list', filters ?? {}] as const,
    detail: (id: string) => [...queryKeys.orders.all, 'detail', id] as const,
    merchant: (filters?: OrderFilters) =>
      [...queryKeys.orders.all, 'merchant', filters ?? {}] as const,
  },
  profile: {
    all: ['profile'] as const,
    me: () => [...queryKeys.profile.all, 'me'] as const,
    addresses: () => [...queryKeys.profile.all, 'addresses'] as const,
    favorites: () => [...queryKeys.profile.all, 'favorites'] as const,
  },
  merchant: {
    all: ['merchant'] as const,
    dashboard: () => [...queryKeys.merchant.all, 'dashboard'] as const,
    analytics: (period: string) => [...queryKeys.merchant.all, 'analytics', period] as const,
    products: (filters?: ProductFilters) =>
      [...queryKeys.merchant.all, 'products', filters ?? {}] as const,
    orders: (filters?: OrderFilters) =>
      [...queryKeys.merchant.all, 'orders', filters ?? {}] as const,
    reviews: () => [...queryKeys.merchant.all, 'reviews'] as const,
    sales: (period: string) => [...queryKeys.merchant.all, 'sales', period] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    list: () => [...queryKeys.notifications.all, 'list'] as const,
  },
} as const;
