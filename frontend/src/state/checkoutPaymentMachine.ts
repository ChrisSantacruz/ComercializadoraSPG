/**
 * Máquina de estados explícita para el retorno de pago Wompi (checkout).
 * Ver docs/testing/wompi-e2e.md
 */

export type CheckoutPaymentPhase =
  | 'idle'
  | 'validating'
  | 'creating_order'
  | 'redirecting'
  | 'pending_confirmation'
  | 'verifying'
  | 'success'
  | 'failed'
  | 'expired'
  | 'cancelled'
  | 'retryable_error';

export type CheckoutPaymentContext = {
  phase: CheckoutPaymentPhase;
  orderId: string | null;
  transactionId: string | null;
  message: string | null;
  technicalDetail: string | null;
  /** true si el usuario debe autenticarse para completar la verificación */
  needsAuth: boolean;
  /** intentos de verificación (polling controlado) */
  attempt: number;
  /** Intento actual de polling (1-based) y máximo, para UI transparente */
  pollAttempt: number;
  pollMax: number;
};

export const initialCheckoutPaymentContext: CheckoutPaymentContext = {
  phase: 'idle',
  orderId: null,
  transactionId: null,
  message: null,
  technicalDetail: null,
  needsAuth: false,
  attempt: 0,
  pollAttempt: 0,
  pollMax: 0
};

export type CheckoutPaymentEvent =
  | { type: 'RESET' }
  | { type: 'START_VERIFY'; orderId: string | null; transactionId: string | null }
  | { type: 'VERIFYING' }
  | { type: 'SUCCESS'; message?: string }
  | { type: 'FAILED'; message: string; technicalDetail?: string }
  | { type: 'PENDING'; message?: string; pollAttempt: number; pollMax: number }
  | { type: 'RETRYABLE'; message: string; technicalDetail?: string }
  | { type: 'NEEDS_AUTH' }
  | { type: 'TIMEOUT' }
  | { type: 'CANCELLED' }
  | { type: 'EXPIRED' }
  | { type: 'BUMP_ATTEMPT' };

export function reduceCheckoutPayment(
  ctx: CheckoutPaymentContext,
  event: CheckoutPaymentEvent
): CheckoutPaymentContext {
  switch (event.type) {
    case 'RESET':
      return { ...initialCheckoutPaymentContext };
    case 'START_VERIFY':
      return {
        ...ctx,
        phase: 'verifying',
        orderId: event.orderId,
        transactionId: event.transactionId,
        message: null,
        technicalDetail: null,
        needsAuth: false,
        attempt: 0,
        pollAttempt: 0,
        pollMax: 0
      };
    case 'VERIFYING':
      return { ...ctx, phase: 'verifying' };
    case 'SUCCESS':
      return {
        ...ctx,
        phase: 'success',
        message: event.message || 'Pago confirmado',
        technicalDetail: null,
        needsAuth: false,
        pollAttempt: 0,
        pollMax: 0
      };
    case 'FAILED':
      return {
        ...ctx,
        phase: 'failed',
        message: event.message,
        technicalDetail: event.technicalDetail || null,
        needsAuth: false
      };
    case 'PENDING':
      return {
        ...ctx,
        phase: 'pending_confirmation',
        message: event.message || 'Pago pendiente de confirmación',
        needsAuth: false,
        pollAttempt: event.pollAttempt,
        pollMax: event.pollMax
      };
    case 'RETRYABLE':
      return {
        ...ctx,
        phase: 'retryable_error',
        message: event.message,
        technicalDetail: event.technicalDetail || null
      };
    case 'NEEDS_AUTH':
      return { ...ctx, phase: 'failed', needsAuth: true, message: 'Inicia sesión para ver el resultado de tu pago' };
    case 'TIMEOUT':
      return {
        ...ctx,
        phase: 'retryable_error',
        message: 'La verificación tardó demasiado. Puedes reintentar o revisar tus pedidos.',
        technicalDetail: 'timeout'
      };
    case 'CANCELLED':
      return { ...ctx, phase: 'cancelled', message: 'Pago cancelado' };
    case 'EXPIRED':
      return { ...ctx, phase: 'expired', message: 'El enlace de pago expiró' };
    case 'BUMP_ATTEMPT':
      return { ...ctx, attempt: ctx.attempt + 1 };
    default:
      return ctx;
  }
}
