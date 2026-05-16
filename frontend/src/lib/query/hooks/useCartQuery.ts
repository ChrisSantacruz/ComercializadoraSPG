import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { cartService } from '../../../services/cartService';
import type { Cart } from '../../../types';
import { notifyCartError, notifyCartSuccess, type NotificationAction } from '../../appNotifications';
import { patchCartLineQuantity, removeCartLine } from '../../cartOptimistic';
import { useCartStore } from '../../../stores/cartStore';
import { queryKeys } from '../queryKeys';
import { STALE_TIMES } from '../queryClient';

export type AddToCartOptions = {
  action?: NotificationAction;
  successTitle?: string;
  successMessage?: string;
  silent?: boolean;
};

function readCartSnapshot(qc: QueryClient): Cart | null {
  return (
    qc.getQueryData<Cart | null>(queryKeys.cart.current()) ?? useCartStore.getState().cart ?? null
  );
}

export function useCartQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.cart.current(),
    queryFn: () => cartService.getCart(),
    staleTime: STALE_TIMES.cart,
    enabled,
  });
}

export function useCartMutations() {
  const qc = useQueryClient();

  const setCartCache = (cart: Cart | null) => {
    qc.setQueryData(queryKeys.cart.current(), cart);
    useCartStore.getState().syncCart(cart);
  };

  const invalidate = () => void qc.invalidateQueries({ queryKey: queryKeys.cart.all });

  const addMutation = useMutation({
    mutationKey: ['cart', 'add'],
    mutationFn: ({
      productId,
      cantidad,
    }: {
      productId: string;
      cantidad: number;
      options?: AddToCartOptions;
    }) => cartService.addProduct(productId, cantidad),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: queryKeys.cart.current() });
    },
    onSuccess: (cart, { options }) => {
      setCartCache(cart);
      if (!options?.silent) {
        notifyCartSuccess(
          options?.successTitle ?? 'Carrito',
          options?.successMessage ?? 'Producto agregado al carrito',
          options?.action,
        );
      }
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Error al agregar producto';
      notifyCartError('Carrito', message);
    },
    onSettled: invalidate,
  });

  const updateMutation = useMutation({
    mutationKey: ['cart', 'update'],
    mutationFn: ({ productId, cantidad }: { productId: string; cantidad: number }) =>
      cartService.updateQuantity(productId, cantidad),
    onMutate: async ({ productId, cantidad }) => {
      await qc.cancelQueries({ queryKey: queryKeys.cart.current() });
      const previousCart = readCartSnapshot(qc);
      if (previousCart) {
        const next = patchCartLineQuantity(previousCart, productId, cantidad);
        qc.setQueryData(queryKeys.cart.current(), next);
        useCartStore.getState().syncCart(next);
      }
      return { previousCart } as { previousCart: Cart | null };
    },
    onError: (error: unknown, _vars, ctx) => {
      if (ctx?.previousCart !== undefined) {
        qc.setQueryData(queryKeys.cart.current(), ctx.previousCart);
        useCartStore.getState().syncCart(ctx.previousCart);
      }
      notifyCartError(
        'Carrito',
        error instanceof Error ? error.message : 'Error al actualizar cantidad',
      );
    },
    onSuccess: (cart) => setCartCache(cart),
    onSettled: invalidate,
  });

  const removeMutation = useMutation({
    mutationKey: ['cart', 'remove'],
    mutationFn: (productId: string) => cartService.removeProduct(productId),
    onMutate: async (productId) => {
      await qc.cancelQueries({ queryKey: queryKeys.cart.current() });
      const previousCart = readCartSnapshot(qc);
      if (previousCart) {
        const next = removeCartLine(previousCart, productId);
        qc.setQueryData(queryKeys.cart.current(), next.productos.length ? next : null);
        useCartStore.getState().syncCart(next.productos.length ? next : null);
      }
      return { previousCart } as { previousCart: Cart | null };
    },
    onError: (error: unknown, _id, ctx) => {
      if (ctx?.previousCart !== undefined) {
        qc.setQueryData(queryKeys.cart.current(), ctx.previousCart);
        useCartStore.getState().syncCart(ctx.previousCart);
      }
      notifyCartError(
        'Carrito',
        error instanceof Error ? error.message : 'Error al eliminar producto',
      );
    },
    onSuccess: (cart) => {
      setCartCache(cart);
      notifyCartSuccess('Carrito', 'Producto eliminado del carrito');
    },
    onSettled: invalidate,
  });

  const clearMutation = useMutation({
    mutationKey: ['cart', 'clear'],
    mutationFn: () => cartService.clearCart(),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: queryKeys.cart.current() });
      const previousCart = readCartSnapshot(qc);
      qc.setQueryData(queryKeys.cart.current(), null);
      useCartStore.getState().syncCart(null);
      return { previousCart } as { previousCart: Cart | null };
    },
    onError: (error: unknown, _v, ctx) => {
      if (ctx?.previousCart !== undefined) {
        qc.setQueryData(queryKeys.cart.current(), ctx.previousCart);
        useCartStore.getState().syncCart(ctx.previousCart);
      }
      notifyCartError(
        'Carrito',
        error instanceof Error ? error.message : 'Error al limpiar carrito',
      );
    },
    onSuccess: () => {
      setCartCache(null);
      notifyCartSuccess('Carrito', 'Carrito limpiado');
    },
    onSettled: invalidate,
  });

  return {
    addMutation,
    updateMutation,
    removeMutation,
    clearMutation,
  };
}
