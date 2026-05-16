import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { Button } from '../ui/Button';
import { Card, CardBody, CardHeader } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Spinner } from '../ui/Spinner';
import { Skeleton, SkeletonText } from '../ui/Skeleton';
import type { CheckoutPaymentContext } from '../../state/checkoutPaymentMachine';

type Props = {
  ctx: CheckoutPaymentContext;
  onRetry: () => void;
  onGoLogin: () => void;
  onGoOrders: () => void;
  onGoOrder: () => void;
  onGoCheckout?: () => void;
};

function ReturnSkeleton() {
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardBody className="space-y-4 p-8">
        <Skeleton className="h-10 w-3/4 mx-auto rounded-lg" />
        <SkeletonText lines={3} />
        <Skeleton className="h-11 w-full rounded-xl mt-4" />
      </CardBody>
    </Card>
  );
}

function StepRow({
  done,
  active,
  label,
  detail
}: {
  done: boolean;
  active: boolean;
  label: string;
  detail?: string;
}) {
  return (
    <div className="flex gap-3 text-left">
      <div
        className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full border ${
          done ? 'border-success-600 bg-success-500' : active ? 'border-primary-500 bg-primary-100' : 'border-gray-300 bg-white'
        }`}
        aria-hidden
      />
      <div>
        <p className={`text-sm font-medium ${done || active ? 'text-gray-900' : 'text-gray-400'}`}>{label}</p>
        {detail ? <p className="text-xs text-gray-500 mt-0.5">{detail}</p> : null}
      </div>
    </div>
  );
}

export default function CheckoutPaymentReturnView({
  ctx,
  onRetry,
  onGoLogin,
  onGoOrders,
  onGoOrder,
  onGoCheckout
}: Props) {
  const { phase, message, needsAuth, pollAttempt, pollMax, technicalDetail } = ctx;

  const showProgress =
    phase === 'verifying' || phase === 'validating' || phase === 'pending_confirmation';

  const pollLabel =
    phase === 'pending_confirmation' && pollMax > 0
      ? `Consulta ${pollAttempt} de ${pollMax} al proveedor de pagos`
      : 'Validación con el proveedor';

  return (
    <div className="min-h-[70vh] bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-lg w-full">
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-gray-100 bg-white px-6 py-4">
            <div className="flex items-center gap-2 text-gray-900">
              <ShieldCheckIcon className="h-5 w-5 text-primary-600 shrink-0" aria-hidden />
              <span className="text-sm font-semibold tracking-tight">Resultado del pago</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              El estado definitivo lo confirma nuestro servidor consultando a Wompi; no se aprueba solo por la URL.
            </p>
          </CardHeader>

          <CardBody className="p-6 sm:p-8">
            {phase === 'idle' && <ReturnSkeleton />}

            {showProgress && (
              <div className="space-y-6">
                <div className="flex justify-center">
                  <Spinner size="xl" color="primary" />
                </div>
                <div className="text-center space-y-2">
                  <h1 className="text-lg font-semibold text-gray-900 tracking-tight">
                    {phase === 'pending_confirmation' ? 'Pago en verificación' : 'Verificando tu pago'}
                  </h1>
                  <p className="text-sm text-gray-600 leading-relaxed">{message || 'Consultando estado en Wompi…'}</p>
                  {phase === 'pending_confirmation' && pollMax > 0 ? (
                    <Badge variant="primary" className="mt-2">
                      {pollLabel}
                    </Badge>
                  ) : null}
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-4 space-y-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Avance</p>
                  <StepRow
                    done={phase !== 'validating'}
                    active={phase === 'validating'}
                    label="Parámetros de retorno"
                  />
                  <StepRow
                    done={phase === 'verifying' || phase === 'pending_confirmation'}
                    active={phase === 'verifying'}
                    label="Confirmación con el servidor"
                    detail="Incluye validación de monto y referencia"
                  />
                  <StepRow
                    done={phase === 'pending_confirmation'}
                    active={phase === 'pending_confirmation'}
                    label="Sincronización con el banco"
                    detail={phase === 'pending_confirmation' ? 'Reintentos automáticos acotados' : undefined}
                  />
                </div>
                <p className="text-center text-xs text-gray-500">Puedes mantener esta pestaña abierta; al terminar verás el resultado.</p>
              </div>
            )}

            {phase === 'success' && (
              <div className="text-center space-y-6">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-50 text-success-600">
                  <CheckCircleIcon className="h-9 w-9" aria-hidden />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">Pago confirmado</h1>
                  <p className="mt-2 text-sm text-gray-600">{message}</p>
                </div>
                <Button type="button" variant="primary" className="w-full" size="lg" onClick={onGoOrder}>
                  Ver mi pedido
                </Button>
                <Link
                  to="/"
                  className="block text-sm text-gray-600 hover:text-gray-900 underline-offset-2 hover:underline"
                >
                  Volver al inicio
                </Link>
              </div>
            )}

            {(phase === 'failed' || phase === 'expired' || phase === 'cancelled') && (
              <div className="text-center space-y-6">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-error-50 text-error-600">
                  <XCircleIcon className="h-9 w-9" aria-hidden />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">
                    {needsAuth ? 'Sesión requerida' : 'Pago no completado'}
                  </h1>
                  <p className="mt-2 text-sm text-gray-600 leading-relaxed">{message}</p>
                  {technicalDetail && !needsAuth ? (
                    <p className="mt-2 text-xs text-gray-400 font-mono break-all">Ref: {technicalDetail}</p>
                  ) : null}
                </div>
                {needsAuth ? (
                  <Button type="button" variant="primary" className="w-full" size="lg" onClick={onGoLogin}>
                    Iniciar sesión
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <Button type="button" variant="primary" className="w-full" size="lg" onClick={onGoOrders}>
                      Ir a mis pedidos
                    </Button>
                    {onGoCheckout ? (
                      <Button type="button" variant="outline" className="w-full" size="lg" onClick={onGoCheckout}>
                        Reintentar checkout
                      </Button>
                    ) : (
                      <Link
                        to="/checkout"
                        className="flex h-11 w-full items-center justify-center rounded-xl border border-gray-300 bg-white text-base font-medium text-gray-900 hover:bg-gray-50"
                      >
                        Volver al checkout
                      </Link>
                    )}
                  </div>
                )}
              </div>
            )}

            {phase === 'retryable_error' && (
              <div className="text-center space-y-6">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-warning-50 text-warning-700">
                  <ExclamationTriangleIcon className="h-9 w-9" aria-hidden />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">No pudimos finalizar la verificación</h1>
                  <p className="mt-2 text-sm text-gray-600 leading-relaxed">{message}</p>
                  {technicalDetail ? (
                    <p className="mt-2 text-xs text-gray-400 font-mono break-all">Ref: {technicalDetail}</p>
                  ) : null}
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button type="button" variant="primary" className="flex-1 gap-2" size="lg" onClick={onRetry}>
                    <ArrowPathIcon className="h-4 w-4 shrink-0" aria-hidden />
                    Reintentar verificación
                  </Button>
                  <Button type="button" variant="outline" className="flex-1" size="lg" onClick={onGoOrders}>
                    Mis pedidos
                  </Button>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
