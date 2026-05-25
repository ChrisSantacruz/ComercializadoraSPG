import { Cart, Coupon, DeliveryType } from '../types';
import api, { handleApiResponse } from './api';

export const cartService = {
  // Obtener carrito
  getCart: async (): Promise<Cart> => {
    const response = await api.get('/cart');
    return handleApiResponse<Cart>(response);
  },

  // Agregar producto al carrito
  addProduct: async (productId: string, cantidad: number, variantId?: string): Promise<Cart> => {
    const qty = Math.max(1, Math.min(99, Math.floor(Number(cantidad)) || 1));
    if (!productId || String(productId).trim() === '') {
      throw new Error('No se pudo identificar el producto. Recarga la página e inténtalo de nuevo.');
    }
    const response = await api.post('/cart/add', {
      productoId: String(productId).trim(),
      cantidad: qty,
      ...(variantId ? { variantId: String(variantId).trim() } : {}),
    });
    return handleApiResponse<Cart>(response);
  },

  // Actualizar cantidad de producto  
  updateQuantity: async (productId: string, cantidad: number, variantId?: string): Promise<Cart> => {
    try {
      // Intentar la nueva ruta primero
      const qty = Math.max(1, Math.min(99, Math.floor(Number(cantidad)) || 1));
      const response = await api.put(`/cart/update/${productId}`, {
        cantidad: qty,
        ...(variantId ? { variantId } : {}),
      });
      return handleApiResponse<Cart>(response);
    } catch (primary: unknown) {
      try {
        // Fallback a la ruta original
        const response = await api.put('/cart/update', {
          productoId: productId,
          cantidad,
          ...(variantId ? { variantId } : {}),
        });
        return handleApiResponse<Cart>(response);
      } catch {
        throw primary;
      }
    }
  },

  // Remover producto del carrito
  removeProduct: async (productId: string, variantId?: string): Promise<Cart> => {
    const response = await api.delete(`/cart/remove/${productId}`, {
      params: variantId ? { variantId } : undefined,
    });
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