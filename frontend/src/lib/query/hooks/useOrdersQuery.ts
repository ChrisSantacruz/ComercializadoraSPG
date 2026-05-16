import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import orderService from '../../../services/orderService';
import type { Order, OrderFilters } from '../../../types';
import { queryKeys } from '../queryKeys';
import { STALE_TIMES } from '../queryClient';

function normalizeOrdersResponse(response: unknown): {
  orders: Order[];
  pagination?: object;
} {
  if (Array.isArray(response)) {
    return { orders: response };
  }
  if (response && typeof response === 'object' && 'datos' in response) {
    const r = response as { datos?: Order[]; paginacion?: object };
    return { orders: Array.isArray(r.datos) ? r.datos : [], pagination: r.paginacion };
  }
  return { orders: [] };
}

export function useOrdersQuery(filters?: OrderFilters) {
  return useQuery({
    queryKey: queryKeys.orders.list(filters),
    queryFn: async () => {
      const res = await orderService.getMyOrders(filters);
      return normalizeOrdersResponse(res);
    },
    staleTime: STALE_TIMES.orders,
  });
}

export function useOrderDetailQuery(id: string | undefined, options?: { pollPaymentPending?: boolean }) {
  const poll = options?.pollPaymentPending ?? true;
  return useQuery({
    queryKey: queryKeys.orders.detail(id ?? ''),
    queryFn: () => orderService.getOrderById(id!),
    enabled: Boolean(id),
    staleTime: STALE_TIMES.orders,
    refetchInterval: (q) => {
      if (!poll) return false;
      const data = q.state.data as Order | undefined;
      if (!data) return false;
      const pay = data.metodoPago?.estado;
      const waitingPay =
        data.estado === 'payment_pending' ||
        (data.estado === 'pendiente' && pay && pay !== 'aprobado' && pay !== 'rechazado');
      return waitingPay ? 12_000 : false;
    },
  });
}

export function useMerchantOrdersQuery(filters?: OrderFilters) {
  return useQuery({
    queryKey: queryKeys.orders.merchant(filters),
    queryFn: async () => {
      const res = await orderService.getMerchantOrders(filters);
      return normalizeOrdersResponse(res);
    },
    staleTime: STALE_TIMES.orders,
  });
}

export function useUpdateMerchantOrderStatusMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['merchant', 'order-status'],
    mutationFn: ({
      orderId,
      data,
    }: {
      orderId: string;
      data: {
        estado: string;
        numeroSeguimiento?: string;
        transportadora?: string;
        comentario?: string;
      };
    }) => orderService.updateOrderStatusWithTracking(orderId, data),
    onMutate: async ({ orderId, data }) => {
      await qc.cancelQueries({ queryKey: queryKeys.orders.all });
      const snapshot = qc.getQueriesData({ queryKey: queryKeys.orders.all });
      qc.setQueriesData({ queryKey: queryKeys.orders.all }, (old) => {
        if (!old || typeof old !== 'object' || !('orders' in old)) return old;
        const d = old as { orders: Order[]; pagination?: object };
        return {
          ...d,
          orders: d.orders.map((o) =>
            o._id === orderId
              ? {
                  ...o,
                  estado: data.estado as Order['estado'],
                  fechaActualizacion: new Date().toISOString(),
                }
              : o,
          ),
        };
      });
      const prevDetail = qc.getQueryData<Order>(queryKeys.orders.detail(orderId));
      if (prevDetail) {
        qc.setQueryData(queryKeys.orders.detail(orderId), {
          ...prevDetail,
          estado: data.estado as Order['estado'],
          fechaActualizacion: new Date().toISOString(),
          envio:
            data.numeroSeguimiento != null
              ? {
                  ...prevDetail.envio,
                  numeroGuia: data.numeroSeguimiento,
                  empresa: data.transportadora ?? prevDetail.envio?.empresa,
                }
              : prevDetail.envio,
        });
      }
      return { snapshot };
    },
    onError: (_err, _vars, ctx) => {
      ctx?.snapshot.forEach(([key, data]) => {
        qc.setQueryData(key, data);
      });
    },
    onSuccess: (order) => {
      qc.setQueryData(queryKeys.orders.detail(order._id), order);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.orders.all });
      void qc.invalidateQueries({ queryKey: queryKeys.merchant.all });
    },
  });
}
