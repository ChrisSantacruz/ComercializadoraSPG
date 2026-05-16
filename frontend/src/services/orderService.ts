import api, { handleApiResponse } from './api';
import { Order, ApiResponse, PaginatedResponse, OrderFilters, OrderForm } from '../types';

export const orderService = {
  // Obtener pedidos del usuario (usando ruta alternativa temporalmente)
  getMyOrders: async (filters?: OrderFilters) => {
    try {
      const response = await api.get<ApiResponse<PaginatedResponse<Order>>>('/orders/my-orders', {
        params: filters
      });
      return handleApiResponse(response);
    } catch {
      const response = await api.get<ApiResponse<PaginatedResponse<Order>>>('/orders', {
        params: filters
      });
      return handleApiResponse(response);
    }
  },

  // Obtener pedido por ID
  getOrderById: async (id: string): Promise<Order> => {
    const response = await api.get<ApiResponse<Order>>(`/orders/${id}`);
    return handleApiResponse(response);
  },

  // Obtener detalle completo de orden (cliente o comerciante)
  getOrderDetail: async (id: string): Promise<Order> => {
    const response = await api.get<ApiResponse<Order>>(`/orders/${id}/detail`);
    return handleApiResponse(response);
  },

  // Crear nuevo pedido
  createOrder: async (orderData: OrderForm, opts?: { idempotencyKey?: string }): Promise<Order> => {
    const headers: Record<string, string> = {};
    if (opts?.idempotencyKey) {
      headers['Idempotency-Key'] = opts.idempotencyKey;
    }
    const response = await api.post<ApiResponse<Order>>('/orders', orderData, { headers });
    return handleApiResponse(response);
  },

  // Actualizar estado del pedido (ruta antigua)
  updateOrderStatus: async (id: string, estado: string, comentario?: string): Promise<Order> => {
    const response = await api.put<ApiResponse<Order>>(`/orders/${id}/status`, {
      estado,
      comentario
    });
    return handleApiResponse(response);
  },

  // Actualizar estado con información de seguimiento (comerciante)
  updateOrderStatusWithTracking: async (id: string, data: {
    estado: string;
    numeroSeguimiento?: string;
    transportadora?: string;
    comentario?: string;
  }): Promise<Order> => {
    const response = await api.put<ApiResponse<Order>>(`/orders/${id}/update-status`, data);
    return handleApiResponse(response);
  },

  // Cancelar pedido
  cancelOrder: async (id: string, motivo: string): Promise<Order> => {
    const response = await api.put<ApiResponse<Order>>(`/orders/${id}/cancel`, {
      motivo
    });
    return handleApiResponse(response);
  },

  // Obtener pedidos para comerciante (nueva ruta)
  getMerchantOrders: async (filters?: OrderFilters): Promise<PaginatedResponse<Order>> => {
    const response = await api.get<ApiResponse<PaginatedResponse<Order>>>('/orders/merchant-orders', {
      params: filters
    });
    return handleApiResponse(response);
  },

  // Obtener pedidos para comerciante (ruta antigua)
  getMerchantOrdersLegacy: async (filters?: OrderFilters): Promise<PaginatedResponse<Order>> => {
    const response = await api.get<ApiResponse<PaginatedResponse<Order>>>('/orders/merchant', {
      params: filters
    });
    return handleApiResponse(response);
  },

  // Obtener todos los pedidos (admin)
  getAllOrders: async (filters?: OrderFilters): Promise<PaginatedResponse<Order>> => {
    const response = await api.get<ApiResponse<PaginatedResponse<Order>>>('/admin/orders', {
      params: filters
    });
    return handleApiResponse(response);
  },

  // Obtener información de seguimiento
  getOrderTracking: async (id: string): Promise<any> => {
    const response = await api.get<ApiResponse<any>>(`/orders/${id}/tracking`);
    return handleApiResponse(response);
  },

  // Confirmar entrega (cliente)
  confirmDelivery: async (id: string, data: {
    confirmado: boolean;
    comentario?: string;
    calificacionEntrega?: number;
    problemas?: Array<{tipo: string, descripcion: string}>;
  }): Promise<Order> => {
    const response = await api.put<ApiResponse<Order>>(`/orders/${id}/confirm-delivery`, data);
    return handleApiResponse(response);
  },

  // Agregar comentario a la orden
  addOrderComment: async (id: string, mensaje: string, esInterno: boolean = false): Promise<Order> => {
    const response = await api.post<ApiResponse<Order>>(`/orders/${id}/comment`, {
      mensaje,
      esInterno
    });
    return handleApiResponse(response);
  },

  // Actualizar información de envío
  updateShippingInfo: async (id: string, data: {
    empresa?: string;
    numeroGuia?: string;
    fechaEntregaEstimada?: string;
    tipoEnvio?: string;
  }): Promise<Order> => {
    const response = await api.put<ApiResponse<Order>>(`/orders/${id}/shipping`, data);
    return handleApiResponse(response);
  },

  // Generar reporte de pedidos
  generateOrderReport: async (filters: {
    fechaDesde?: string;
    fechaHasta?: string;
    formato?: 'pdf' | 'excel';
  }): Promise<Blob> => {
    const response = await api.get('/orders/report', {
      params: filters,
      responseType: 'blob'
    });
    return response.data;
  }
};

export default orderService; 