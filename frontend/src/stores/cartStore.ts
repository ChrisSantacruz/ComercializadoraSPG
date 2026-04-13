import toast from 'react-hot-toast';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { cartService } from '../services/cartService';
import { Cart, DeliveryType } from '../types';

interface CartState {
  // Estado
  cart: Cart | null;
  isLoading: boolean;
  error: string | null;

  // Acciones
  getCart: () => Promise<void>;
  addToCart: (productId: string, cantidad: number) => Promise<void>;
  updateQuantity: (productId: string, cantidad: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
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
      // Estado inicial
      cart: null,
      isLoading: false,
      error: null,

      // Obtener carrito
      getCart: async () => {
        set({ isLoading: true, error: null });
        
        try {
          const cart = await cartService.getCart();
          set({ cart, isLoading: false });
        } catch (error: any) {
          set({
            error: error.message || 'Error al obtener carrito',
            isLoading: false,
          });
        }
      },

      // Agregar al carrito
      addToCart: async (productId: string, cantidad: number) => {
        set({ isLoading: true, error: null });
        
        try {
          const cart = await cartService.addProduct(productId, cantidad);
          set({ cart, isLoading: false });
          toast.success('Producto agregado al carrito');
        } catch (error: any) {
          set({
            error: error.message || 'Error al agregar producto',
            isLoading: false,
          });
          toast.error(error.message || 'Error al agregar producto');
          throw error;
        }
      },

      // Actualizar cantidad
      updateQuantity: async (productId: string, cantidad: number) => {
        set({ isLoading: true, error: null });
        
        try {
          const cart = await cartService.updateQuantity(productId, cantidad);
          set({ cart, isLoading: false });
        } catch (error: any) {
          set({
            error: error.message || 'Error al actualizar cantidad',
            isLoading: false,
          });
          toast.error(error.message || 'Error al actualizar cantidad');
          throw error;
        }
      },

      // Remover item
      removeItem: async (productId: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const cart = await cartService.removeProduct(productId);
          set({ cart, isLoading: false });
          toast.success('Producto eliminado del carrito');
        } catch (error: any) {
          set({
            error: error.message || 'Error al eliminar producto',
            isLoading: false,
          });
          toast.error(error.message || 'Error al eliminar producto');
          throw error;
        }
      },

      // Limpiar carrito
      clearCart: async () => {
        set({ isLoading: true, error: null });
        
        try {
          await cartService.clearCart();
          set({ cart: null, isLoading: false });
          toast.success('Carrito limpiado');
        } catch (error: any) {
          set({
            error: error.message || 'Error al limpiar carrito',
            isLoading: false,
          });
          toast.error(error.message || 'Error al limpiar carrito');
          throw error;
        }
      },

      // Actualizar tipo de entrega
      updateDeliveryType: async (tipoEntrega: DeliveryType) => {
        set({ isLoading: true, error: null });

        try {
          const cart = await cartService.updateDeliveryType(tipoEntrega);
          set({ cart, isLoading: false });
        } catch (error: any) {
          set({
            error: error.message || 'Error al actualizar tipo de entrega',
            isLoading: false,
          });
          toast.error(error.message || 'Error al actualizar tipo de entrega');
          throw error;
        }
      },

      // Aplicar cupón
      applyCoupon: async (codigo: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const cart = await cartService.applyCoupon(codigo);
          set({ cart, isLoading: false });
          toast.success('Cupón aplicado correctamente');
        } catch (error: any) {
          set({
            error: error.message || 'Error al aplicar cupón',
            isLoading: false,
          });
          toast.error(error.message || 'Error al aplicar cupón');
          throw error;
        }
      },

      // Remover cupón
      removeCoupon: async (codigo: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const cart = await cartService.removeCoupon(codigo);
          set({ cart, isLoading: false });
          toast.success('Cupón removido');
        } catch (error: any) {
          set({
            error: error.message || 'Error al remover cupón',
            isLoading: false,
          });
          toast.error(error.message || 'Error al remover cupón');
          throw error;
        }
      },

      // Obtener cantidad de items
      getItemCount: () => {
        const { cart } = get();
        if (!cart) return 0;
        return cart.productos.reduce((total, item) => total + item.cantidad, 0);
      },

      // Obtener precio total
      getTotalPrice: () => {
        const { cart } = get();
        return cart ? cart.total : 0;
      },

      // Limpiar error
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
    }
  )
); 