import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CheckoutPaymentReturnView from '../../components/checkout/CheckoutPaymentReturnView';
import CheckoutErrorBoundary from '../../components/checkout/CheckoutErrorBoundary';
import { useCheckoutPaymentReturn } from '../../hooks/useCheckoutPaymentReturn';

function WompiReturnInner() {
  const navigate = useNavigate();
  const { ctx, retry, goToLogin, goOrders, goOrder } = useCheckoutPaymentReturn();

  useEffect(() => {
    if (ctx.phase === 'success' && ctx.orderId) {
      const t = window.setTimeout(() => {
        navigate(`/orders/${ctx.orderId}`, { replace: true, state: { fromWompi: true } });
      }, 1200);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [ctx.phase, ctx.orderId, navigate]);

  return (
    <CheckoutPaymentReturnView
      ctx={ctx}
      onRetry={retry}
      onGoLogin={goToLogin}
      onGoOrders={goOrders}
      onGoOrder={goOrder}
    />
  );
}

/**
 * Retorno desde Wompi: verificación con backend (confirm-return), polling acotado si PENDING,
 * recuperación de sesión vía login + sessionStorage.
 */
const WompiReturnPageFixed: React.FC = () => {
  return (
    <CheckoutErrorBoundary>
      <WompiReturnInner />
    </CheckoutErrorBoundary>
  );
};

export default WompiReturnPageFixed;
