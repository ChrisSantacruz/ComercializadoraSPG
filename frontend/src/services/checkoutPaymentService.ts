import api, { handleApiResponse } from './api';
import type { Order } from '../types';

export type ConfirmPaymentReturnResult = {
  order: Order;
  transactionStatus: string;
  sync?: {
    ok: boolean;
    pending?: boolean;
    reason?: string;
    status?: string;
  };
};

/**
 * Verificación server-authoritative tras redirect Wompi (requiere sesión).
 */
export async function confirmPaymentReturn(
  transactionId: string | null,
  orderId: string,
  signal?: AbortSignal
): Promise<ConfirmPaymentReturnResult> {
  const payload = transactionId ? { transactionId, orderId } : { orderId };
  const response = await api.post(
    '/wompi/confirm-return',
    payload,
    { signal, timeout: 45000 }
  );
  return handleApiResponse(response) as ConfirmPaymentReturnResult;
}
