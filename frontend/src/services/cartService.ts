import api, { handleApiResponse } from './api';
import { Cart, Coupon, DeliveryType } from '../types';

export const cartService = {
  // Obtener carrito
  getCart: async (): Promise<Cart> => {
    const response = await api.get('/cart');
    return handleApiResponse<Cart>(response);
  },

  // Agregar producto al carrito
  addProduct: async (productId: string, cantidad: number): Promise<Cart> => {
    const response = await api.post('/cart/add', {
      productoId: productId,
      cantidad,
    });
    return handleApiResponse<Cart>(response);
  },

  // Actualizar cantidad de producto  
  updateQuantity: async (productId: string, cantidad: number): Promise<Cart> => {
    try {
      // Intentar la nueva ruta primero
      const response = await api.put(`/cart/update/${productId}`, {
        cantidad,
      });
      return handleApiResponse<Cart>(response);
    } catch (error) {
      console.warn('🔄 Intentando ruta alternativa para actualizar cantidad...');
      try {
        // Fallback a la ruta original
        const response = await api.put('/cart/update', {
          productoId: productId,
          cantidad,
        });
        return handleApiResponse<Cart>(response);
      } catch (fallbackError) {
        console.error('❌ Ambas rutas fallaron:', error, fallbackError);
        throw error;
      }
    }
  },

  // Remover producto del carrito
  removeProduct: async (productId: string): Promise<Cart> => {
    const response = await api.delete(`/cart/remove/${productId}`);
    return handleApiResponse<Cart>(response);
  },

  // Limpiar carrito
  clearCart: async (): Promise<void> => {
    const response = await api.delete('/cart/clear');
    return handleApiResponse<void>(response);
  },

  // Aplicar cupón
  applyCoupon: async (codigo: string): Promise<Cart> => {
    const response = await api.post('/cart/coupon', { codigo });
    return handleApiResponse<Cart>(response);
  },

  // Remover cupón
  removeCoupon: async (codigo: string): Promise<Cart> => {
    const response = await api.delete(`/cart/coupon/${codigo}`);
    return handleApiResponse<Cart>(response);
  },

  // Obtener cupones disponibles
  getAvailableCoupons: async (): Promise<Coupon[]> => {
    const response = await api.get('/cart/available-coupons');
    return handleApiResponse<Coupon[]>(response);
  },

  // Recalcular totales del carrito
  recalculateCart: async (): Promise<Cart> => {
    const response = await api.post('/cart/recalculate');
    return handleApiResponse<Cart>(response);
  },

  // Actualizar tipo de entrega del carrito
  updateDeliveryType: async (tipoEntrega: DeliveryType): Promise<Cart> => {
    const response = await api.put('/cart/delivery-type', { tipoEntrega });
    return handleApiResponse<Cart>(response);
  },
}; 