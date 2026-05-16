import { useQuery } from '@tanstack/react-query';
import merchantService from '../../../services/merchantService';
import analyticsService, { type AnalyticsData } from '../../../services/analyticsService';
import reviewService from '../../../services/reviewService';
import type { ProductFilters } from '../../../types';
import { queryKeys } from '../queryKeys';
import { STALE_TIMES } from '../queryClient';

/** Matches GET /api/commerce/dashboard payload. */
export interface CommerceDashboard {
  resumenGeneral: {
    totalProductos: number;
    productosActivos: number;
    productosPendientes?: number;
    productosRechazados?: number;
    productosAgotados: number;
    pedidosDelMes: number;
    ventasDelMes: number;
    ventasDelMesAnterior?: number;
    porcentajeCambio?: number;
    comisionComercio?: number;
    reseñasDelMes: number;
    notificacionesNoLeidas?: number;
    pedidosEnTransito: number;
    tasaConfirmacion: number;
    clientesUnicos: number;
  };
  productosMasVendidos: Array<{
    nombre?: string;
    imagenes?: string[];
    totalVendido?: number;
    ingresos?: number;
  }>;
  ventasPorDia: Array<{ _id: string; ventas: number; ingresos: number }>;
  estadisticasReseñas?: {
    totalReseñas: number;
    promedioCalificacion: number;
    distribucionCalificaciones: Record<number, number>;
    sinResponder?: number;
  };
  pedidosRecientes?: unknown[];
  alertas: Array<{ tipo: 'info' | 'warning' | 'error'; mensaje: string }>;
}

export function useMerchantDashboardQuery() {
  return useQuery({
    queryKey: queryKeys.merchant.dashboard(),
    queryFn: () => merchantService.getDashboardStats() as Promise<CommerceDashboard>,
    staleTime: STALE_TIMES.merchantDashboard,
  });
}

export function useMerchantAnalyticsQuery(period: string) {
  return useQuery({
    queryKey: queryKeys.merchant.analytics(period),
    queryFn: (): Promise<AnalyticsData> =>
      analyticsService.getMerchantAnalytics(period),
    staleTime: STALE_TIMES.merchantAnalytics,
    placeholderData: (prev) => prev,
  });
}

export function useMerchantProductsQuery(filters?: ProductFilters) {
  return useQuery({
    queryKey: queryKeys.merchant.products(filters),
    queryFn: () => merchantService.getProducts(filters ?? { limit: 10, page: 1 }),
    staleTime: STALE_TIMES.merchantDashboard,
  });
}

export function useMerchantReviewStatsQuery() {
  return useQuery({
    queryKey: queryKeys.merchant.reviews(),
    queryFn: () => reviewService.getMerchantReviewStats(),
    staleTime: STALE_TIMES.merchantDashboard,
  });
}

export function useMerchantSalesQuery(period: string) {
  return useQuery({
    queryKey: queryKeys.merchant.sales(period),
    queryFn: () => merchantService.getAnalytics(period),
    staleTime: STALE_TIMES.merchantAnalytics,
    enabled: false,
  });
}
