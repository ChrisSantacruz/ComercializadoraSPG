import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Cart, DeliveryType } from '../types';
import { cartService } from '../services/cartService';
import { notifyCartError, notifyCartSuccess, type NotificationAction } from '../lib/appNotifications';
import { getApiErrorMessage } from '../lib/apiErrors';
import { safeInt, safeMoney } from '../lib/safeNumeric';
import { appQueryClient } from '../lib/query/queryClient';
import { queryKeys } from '../lib/query/queryKeys';

function syncCartQuery(cart: Cart | null) {
  appQueryClient.setQueryData(queryKeys.cart.current(), cart);
}

export type AddToCartOptions = {
  /** Secondary CTA on success toast (e.g. view cart). */
  action?: NotificationAction;
  successTitle?: string;
  successMessage?: string;
  /** Skip success toast (caller shows its own feedback). */
  silent?: boolean;
};

interface CartState {
  cart: Cart | null;
  isLoading: boolean;
  error: string | null;

  /** Alinea Zustand + caché Query (mutaciones optimistas / bridge). */
  syncCart: (cart: Cart | null) => void;

  getCart: () => Promise<void>;
  addToCart: (productId: string, cantidad: number, options?: AddToCartOptions & { variantId?: string }) => Promise<void>;
  updateQuantity: (productId: string, cantidad: number, variantId?: string) => Promise<void>;
  removeItem: (productId: string, variantId?: string) => Promise<void>;
  clearCart: () => Promise<void>;
  updateDeliveryType: (tipoEntrega: DeliveryType) => Promise<void>;
  applyCoupon: (codigo: string) => Promise<void>;
  removeCoupon: (codigo: string) => Promise<void>;
  getItemCount: () => number;
  getTotalPrice: () => number;
  clearError: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      cart: null,
      isLoading: false,
      error: null,

      syncCart: (cart: Cart | null) => {
        syncCartQuery(cart);
        set({ cart, error: null });
      },

      getCart: async () => {
        set({ isLoading: true, error: null });
        try {
          const cart = await cartService.getCart();
          syncCartQuery(cart);
          set({ cart, isLoading: false });
        } catch (error: unknown) {
          const message = getApiErrorMessage(error, 'Error al obtener carrito');
          set({
            error: message,
            isLoading: false,
          });
          throw new Error(message);
        }
      },

      addToCart: async (productId: string, cantidad: number, options?: AddToCartOptions & { variantId?: string }) => {
        set({ isLoading: true, error: null });
        try {
          const cart = await cartService.addProduct(productId, cantidad, options?.variantId);
          syncCartQuery(cart);
          set({ cart, isLoading: false });
          if (!options?.silent) {
            notifyCartSuccess(
              options?.successTitle ?? 'Carrito',
              options?.successMessage ?? 'Producto agregado al carrito',
              options?.action,
            );
          }
        } catch (error: unknown) {
          const message = getApiErrorMessage(error, 'Error al agregar producto');
          set({
            error: message,
            isLoading: false,
          });
          notifyCartError('Carrito', message);
          throw error;
        }
      },

      updateQuantity: async (productId: string, cantidad: number, variantId?: string) => {
        set({ isLoading: true, error: null });
        try {
          const cart = await cartService.updateQuantity(productId, cantidad, variantId);
          syncCartQuery(cart);
          set({ cart, isLoading: false });
        } catch (error: unknown) {
          const message = getApiErrorMessage(error, 'Error al actualizar cantidad');
          set({
            error: message,
            isLoading: false,
          });
          notifyCartError('Carrito', message);
          throw error;
        }
      },

      removeItem: async (productId: string, variantId?: string) => {
        set({ isLoading: true, error: null });
        try {
          const cart = await cartService.removeProduct(productId, variantId);
          syncCartQuery(cart);
          set({ cart, isLoading: false });
          notifyCartSuccess('Carrito', 'Producto eliminado del carrito');
        } catch (error: unknown) {
          const message = getApiErrorMessage(error, 'Error al eliminar producto');
          set({
            error: message,
            isLoading: false,
          });
          notifyCartError('Carrito', message);
          throw error;
        }
      },

      clearCart: async () => {
        set({ isLoading: true, error: null });
        try {
          await cartService.clearCart();
          syncCartQuery(null);
          set({ cart: null, isLoading: false });
          notifyCartSuccess('Carrito', 'Carrito limpiado');
        } catch (error: unknown) {
          const message = getApiErrorMessage(error, 'Error al limpiar carrito');
          set({
            error: message,
            isLoading: false,
          });
          notifyCartError('Carrito', message);
          throw error;
        }
      },

      updateDeliveryType: async (tipoEntrega: DeliveryType) => {
        set({ isLoading: true, error: null });
        try {
          const cart = await cartService.updateDeliveryType(tipoEntrega);
          syncCartQuery(cart);
          set({ cart, isLoading: false });
        } catch (error: unknown) {
          const message = getApiErrorMessage(error, 'Error al actualizar tipo de entrega');
          set({
            error: message,
            isLoading: false,
          });
          notifyCartError('Carrito', message);
          throw error;
        }
      },

      applyCoupon: async (codigo: string) => {
        set({ isLoading: true, error: null });
        try {
          const cart = await cartService.applyCoupon(codigo);
          syncCartQuery(cart);
          set({ cart, isLoading: false });
          notifyCartSuccess('Carrito', 'Cupón aplicado correctamente');
        } catch (error: unknown) {
          const message = getApiErrorMessage(error, 'Error al aplicar cupón');
          set({
            error: message,
            isLoading: false,
          });
          notifyCartError('Carrito', message);
          throw error;
        }
      },

      removeCoupon: async (codigo: string) => {
        set({ isLoading: true, error: null });
        try {
          const cart = await cartService.removeCoupon(codigo);
          syncCartQuery(cart);
          set({ cart, isLoading: false });
          notifyCartSuccess('Carrito', 'Cupón removido');
        } catch (error: unknown) {
          const message = getApiErrorMessage(error, 'Error al remover cupón');
          set({
            error: message,
            isLoading: false,
          });
          notifyCartError('Carrito', message);
          throw error;
        }
      },

      getItemCount: () => {
        const { cart } = get();
        if (!cart?.productos?.length) return 0;
        return cart.productos.reduce((total, item) => total + safeInt(item.cantidad, 0), 0);
      },

      getTotalPrice: () => {
        const { cart } = get();
        return safeMoney(cart?.total);
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        cart: state.cart,
      }),
    },
  ),
);
