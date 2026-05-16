import api, { handleApiResponse } from './api';
import type { Order } from '../types';

export type ConfirmPaymentReturnResult = {
  order: Order;
  transactionStatus: string;
};

/**
 * Verificación server-authoritative tras redirect Wompi (requiere sesión).
 */
export async function confirmPaymentReturn(
  transactionId: string,
  orderId: string,
  signal?: AbortSignal
): Promise<ConfirmPaymentReturnResult> {
  const response = await api.post(
    '/wompi/confirm-return',
    { transactionId, orderId },
    { signal, timeout: 45000 }
  );
  return handleApiResponse(response) as ConfirmPaymentReturnResult;
}
