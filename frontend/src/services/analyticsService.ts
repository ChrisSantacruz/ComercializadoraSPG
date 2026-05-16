import api, { handleApiResponse } from './api';
import { ApiResponse } from '../types';

export interface AnalyticsData {
  // Ventas
  totalIngresos: number;
  ingresosDelMes: number;
  ingresosMesAnterior: number;
  porcentajeCambio: number;
  ventasDelMes: number;
  ventasTotales: number;

  // Productos
  totalProductos: number;
  productosActivos: number;
  productosAgotados: number;
  productosMasVendidos: Array<{
    producto: any;
    cantidadVendida: number;
    ingresosTotales: number;
  }>;

  // Pedidos
  pedidosTotales: number;
  pedidosDelMes: number;
  pedidosEnTransito: number;
  pedidosEntregados: number;
  tasaConfirmacion: number;

  // Clientes
  clientesUnicos: number;

  // Reseñas
  totalReseñas: number;
  calificacionPromedio: number;
  distribucionCalificaciones: { [key: number]: number };
  reseñasRecientes: Array<{
    _id: string;
    calificacion: number;
    comentario: string;
    fechaCreacion: string;
    usuario: string;
    producto: string;
  }>;

  // Tendencias
  ventasPorDia: Array<{
    fecha: string;
    ventas: number;
    ingresos: number;
  }>;
  pedidosPorEstado: Array<{
    estado: string;
    cantidad: number;
  }>;
}

export const analyticsService = {
  // Obtener analytics del comerciante
  getMerchantAnalytics: async (periodo?: string): Promise<AnalyticsData> => {
    const response = await api.get<ApiResponse<AnalyticsData>>('/analytics/merchant', {
      params: { periodo }
    });
    return handleApiResponse(response);
  },

  // Obtener analytics con retry
  getMerchantAnalyticsWithRetry: async (periodo?: string, maxRetries = 3): Promise<AnalyticsData> => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await analyticsService.getMerchantAnalytics(periodo);
      } catch (error: any) {
        if (i === maxRetries - 1) throw error;
        if (error.response?.status === 429) {
          await new Promise((resolve) => setTimeout(resolve, 2000 * (i + 1)));
        } else {
          throw error;
        }
      }
    }
    throw new Error('Máximo de reintentos alcanzado');
  }
};

export default analyticsService; 