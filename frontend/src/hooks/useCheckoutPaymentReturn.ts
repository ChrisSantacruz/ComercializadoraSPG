import { useCallback, useEffect, useReducer, useRef } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { useCartStore } from '../stores/cartStore';
import { confirmPaymentReturn } from '../services/checkoutPaymentService';
import { AuthHttpError } from '../services/authErrors';
import { queryKeys } from '../lib/query/queryKeys';
import {
  initialCheckoutPaymentContext,
  reduceCheckoutPayment,
  type CheckoutPaymentContext
} from '../state/checkoutPaymentMachine';

const RESUME_KEY = 'spg_wompi_return_v1';
const POLL_MS = 3500;
const POLL_MAX = 5;
const VERIFY_TIMEOUT_MS = 48000;

function isAbortError(err: unknown): boolean {
  if (axios.isCancel(err)) return true;
  if (err && typeof err === 'object' && 'code' in err && (err as { code?: string }).code === 'ERR_CANCELED') {
    return true;
  }
  return err instanceof DOMException && err.name === 'AbortError';
}

export function useCheckoutPaymentReturn() {
  const aliveRef = useRef(true);
  const [ctx, dispatch] = useReducer(
    (s: CheckoutPaymentContext, a: Parameters<typeof reduceCheckoutPayment>[1]) =>
      reduceCheckoutPayment(s, a),
    { ...initialCheckoutPaymentContext, phase: 'validating' }
  );
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const abortRef = useRef<AbortController | null>(null);
  const pollTimerRef = useRef<number | null>(null);
  const pollCount = useRef(0);
  /** Abort por cleanup del efecto (no mostrar timeout al usuario) */
  const verifyCloseRef = useRef(false);

  const clearTimers = useCallback(() => {
    verifyCloseRef.current = true;
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    if (pollTimerRef.current != null) {
      window.clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const runVerify = useCallback(
    async (transactionId: string | null, orderId: string, options?: { isPoll?: boolean }) => {
      verifyCloseRef.current = false;
      if (!options?.isPoll) {
        pollCount.current = 0;
      }
      dispatch({ type: 'VERIFYING' });
      if (abortRef.current) {
        abortRef.current.abort();
      }
      const ac = new AbortController();
      abortRef.current = ac;
      const timer = window.setTimeout(() => ac.abort(), VERIFY_TIMEOUT_MS);
      try {
        const result = await confirmPaymentReturn(transactionId, orderId, ac.signal);
        clearTimeout(timer);
        const st = (result.transactionStatus || '').toUpperCase();
        const orderState = result.order?.estado as string | undefined;

        if (st === 'APPROVED' || orderState === 'confirmado') {
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: queryKeys.cart.all }),
            queryClient.invalidateQueries({ queryKey: queryKeys.orders.all }),
            queryClient.invalidateQueries({ queryKey: queryKeys.profile.all }),
            queryClient.invalidateQueries({ queryKey: queryKeys.merchant.all })
          ]);
          useCartStore.getState().clearCart();
          dispatch({ type: 'SUCCESS', message: 'Pago confirmado' });
          sessionStorage.removeItem(RESUME_KEY);
          return;
        }

        if (st === 'CREATED' || st === 'PENDING' || result.sync?.pending || orderState === 'payment_pending' || orderState === 'pendiente') {
          if (pollCount.current < POLL_MAX) {
            pollCount.current += 1;
            dispatch({
              type: 'PENDING',
              message: 'Estamos confirmando tu pago con el banco…',
              pollAttempt: pollCount.current,
              pollMax: POLL_MAX
            });
            pollTimerRef.current = window.setTimeout(() => {
              void runVerify(transactionId, orderId, { isPoll: true });
            }, POLL_MS);
            return;
          }
          dispatch({
            type: 'RETRYABLE',
            message: 'El pago sigue pendiente. Lo mostraremos en tus pedidos solo cuando Wompi confirme la aprobación.',
            technicalDetail: 'pending_max_poll'
          });
          return;
        }

        dispatch({
          type: 'FAILED',
          message: 'El pago no fue aprobado.',
          technicalDetail: st || orderState || undefined
        });
      } catch (err: unknown) {
        clearTimeout(timer);
        if (isAbortError(err)) {
          if (verifyCloseRef.current) {
            verifyCloseRef.current = false;
            return;
          }
          if (!aliveRef.current) {
            return;
          }
          dispatch({ type: 'TIMEOUT' });
          return;
        }
        const status = err instanceof AuthHttpError ? err.status : undefined;
        if (status === 401) {
          sessionStorage.setItem(
            RESUME_KEY,
            JSON.stringify({ transactionId, orderId, savedAt: Date.now() })
          );
          dispatch({ type: 'NEEDS_AUTH' });
          return;
        }
        if (status === 502 || status === 503) {
          dispatch({
            type: 'RETRYABLE',
            message: 'No pudimos contactar a Wompi. Reintenta en unos segundos.',
            technicalDetail: String(status)
          });
          return;
        }
        const msg =
          err instanceof AuthHttpError ? err.message : err instanceof Error ? err.message : 'Error desconocido';
        dispatch({ type: 'FAILED', message: msg });
      }
    },
    [queryClient]
  );

  const searchKey = searchParams.toString();

  useEffect(() => {
    const transactionId = searchParams.get('id') || searchParams.get('transactionId');
    const orderId = searchParams.get('orderId') || searchParams.get('reference');

    let fromResume: { transactionId: string; orderId: string } | null = null;
    try {
      const raw = sessionStorage.getItem(RESUME_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { transactionId?: string; orderId?: string; savedAt?: number };
        if (parsed.transactionId && parsed.orderId && parsed.savedAt && Date.now() - parsed.savedAt < 3600000) {
          fromResume = { transactionId: parsed.transactionId, orderId: parsed.orderId };
        }
      }
    } catch {
      sessionStorage.removeItem(RESUME_KEY);
    }

    const tx = transactionId || fromResume?.transactionId || null;
    const ord = orderId || fromResume?.orderId || null;

    if (!ord) {
      dispatch({
        type: 'FAILED',
        message: 'Falta la referencia del pedido. Abre el enlace desde Wompi o vuelve al checkout.',
        technicalDetail: 'missing_params'
      });
      return () => clearTimers();
    }

    dispatch({ type: 'START_VERIFY', orderId: ord, transactionId: tx });

    if (!isAuthenticated) {
      dispatch({ type: 'NEEDS_AUTH' });
      return () => clearTimers();
    }

    void runVerify(tx, ord);
    return () => clearTimers();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- searchKey materializa la query; la referencia de searchParams cambia en cada render
  }, [searchKey, isAuthenticated, runVerify, clearTimers]);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      clearTimers();
    };
  }, [clearTimers]);

  const retry = useCallback(() => {
    if (ctx.transactionId && ctx.orderId) {
      void runVerify(ctx.transactionId, ctx.orderId);
    }
  }, [ctx.transactionId, ctx.orderId, runVerify]);

  const goToLogin = useCallback(() => {
    const q = searchParams.toString();
    const next = q ? `/payment/wompi/return?${q}` : '/payment/wompi/return';
    navigate(`/login?redirect=${encodeURIComponent(next)}`);
  }, [navigate, searchParams]);

  const goOrders = useCallback(() => {
    navigate('/orders');
  }, [navigate]);

  const goOrder = useCallback(() => {
    if (ctx.orderId) navigate(`/orders/${ctx.orderId}`);
    else navigate('/orders');
  }, [navigate, ctx.orderId]);

  return { ctx, retry, goToLogin, goOrders, goOrder };
}
