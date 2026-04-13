import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import api from '../../services/api';
import { cartService } from '../../services/cartService';
import { getImageUrl } from '../../utils/imageUtils';

interface OrderProduct {
  producto: {
    _id: string;
    nombre: string;
    imagenPrincipal?: string;
    precio?: number;
  };
  cantidad: number;
  precio: number;
  subtotal: number;
}

interface OrderData {
  _id: string;
  numeroOrden?: string;
  estado: string;
  total: number;
  subtotal: number;
  impuestos: number;
  costoEnvio: number;
  tipoEntrega?: string;
  paymentStatus?: string;
  productos: OrderProduct[];
}

type PaymentStatus = 'loading' | 'approved' | 'pending' | 'declined' | 'error';

const MAX_RETRIES = 5;
const RETRY_DELAY = 3000;

const WompiReturnPageFixed: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [status, setStatus] = useState<PaymentStatus>('loading');
  const [order, setOrder] = useState<OrderData | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [cartCleared, setCartCleared] = useState(false);

  const orderId = searchParams.get('orderId') || searchParams.get('reference');
  const transactionId = searchParams.get('id');

  const verifyPayment = useCallback(async (retry: number) => {
    if (!orderId) {
      setStatus('error');
      setErrorMsg('No se encontró información del pedido en la URL.');
      return;
    }

    try {
      if (retry === 0) setStatus('loading');

      const response = await api.get(`/orders/${orderId}/payment-status`);

      if (!response.data?.exito || !response.data?.datos) {
        throw new Error('Respuesta inválida del servidor');
      }

      const orderData: OrderData = response.data.datos;
      setOrder(orderData);

      const estado = orderData.estado;
      const pSt = orderData.paymentStatus;

      if (estado === 'confirmado' || estado === 'procesando' || estado === 'enviado' || estado === 'entregado' || pSt === 'approved') {
        setStatus('approved');
        // Limpiar carrito solo cuando el pago está confirmado
        if (!cartCleared) {
          try {
            await cartService.clearCart();
            setCartCleared(true);
          } catch {
            // No bloquear flujo si falla limpiar carrito
          }
        }
      } else if (estado === 'cancelado' || pSt === 'declined' || pSt === 'error') {
        setStatus('declined');
      } else if (retry < MAX_RETRIES) {
        // Pago pendiente: el webhook aún no ha procesado, reintentar
        setStatus('pending');
        setRetryCount(retry + 1);
        setTimeout(() => verifyPayment(retry + 1), RETRY_DELAY);
      } else {
        setStatus('pending');
      }
    } catch (err: any) {
      console.error('Error verificando pago:', err);
      setStatus('error');
      setErrorMsg(err.response?.data?.mensaje || err.message || 'Error al verificar el pago');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, cartCleared]);

  useEffect(() => {
    verifyPayment(0);
  }, [verifyPayment]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full space-y-8">
        {/* Status icon + message */}
        <div className="text-center space-y-4">
          {status === 'loading' && (
            <>
              <div className="mx-auto"><LoadingSpinner size="lg" /></div>
              <h2 className="text-2xl font-bold text-gray-900">Verificando tu pago...</h2>
              <p className="text-gray-600">Estamos confirmando la transacción con la pasarela de pagos.</p>
            </>
          )}

          {status === 'approved' && (
            <>
              <div className="mx-auto h-20 w-20 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="h-10 w-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">¡Pago exitoso!</h2>
              <p className="text-gray-600">Tu pago ha sido procesado correctamente. Tu pedido está siendo preparado.</p>
            </>
          )}

          {status === 'pending' && (
            <>
              <div className="mx-auto h-20 w-20 bg-yellow-100 rounded-full flex items-center justify-center">
                <svg className="h-10 w-10 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Pago en proceso</h2>
              <p className="text-gray-600">
                {retryCount < MAX_RETRIES
                  ? 'Tu pago está siendo procesado. Verificando automáticamente...'
                  : 'Tu pago está siendo procesado. Puede tardar unos minutos en confirmarse.'}
              </p>
              {retryCount < MAX_RETRIES && (
                <div className="flex items-center justify-center gap-2 text-sm text-yellow-600">
                  <LoadingSpinner size="sm" />
                  <span>Verificando... (intento {retryCount}/{MAX_RETRIES})</span>
                </div>
              )}
            </>
          )}

          {status === 'declined' && (
            <>
              <div className="mx-auto h-20 w-20 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="h-10 w-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Pago rechazado</h2>
              <p className="text-gray-600">Tu pago no pudo ser procesado. Por favor intenta con otro método de pago.</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="mx-auto h-20 w-20 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="h-10 w-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Error al verificar el pago</h2>
              <p className="text-gray-600">{errorMsg || 'No pudimos verificar el estado de tu pago.'}</p>
            </>
          )}
        </div>

        {/* Order details */}
        {order && status !== 'loading' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Resumen del pedido</h3>
              {order.numeroOrden && (
                <p className="text-sm text-gray-500 mt-1">Orden #{order.numeroOrden}</p>
              )}
            </div>

            <div className="divide-y divide-gray-100">
              {order.productos.map((item, index) => (
                <div key={index} className="px-6 py-3 flex items-center gap-4">
                  <img
                    src={getImageUrl(item.producto?.imagenPrincipal)}
                    alt={item.producto?.nombre || 'Producto'}
                    className="w-12 h-12 rounded-lg object-cover bg-gray-100"
                    onError={(e) => { (e.target as HTMLImageElement).src = '/images/default-product.svg'; }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.producto?.nombre}</p>
                    <p className="text-xs text-gray-500">Cant: {item.cantidad}</p>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    ${item.subtotal?.toLocaleString('es-CO')}
                  </span>
                </div>
              ))}
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span>${order.subtotal?.toLocaleString('es-CO')}</span>
              </div>
              {order.impuestos > 0 && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Impuestos</span>
                  <span>${order.impuestos?.toLocaleString('es-CO')}</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-gray-600">
                <span>{order.tipoEntrega === 'recoger_establecimiento' ? 'Recogida' : 'Envío'}</span>
                <span>{order.costoEnvio === 0 ? 'Gratis' : `$${order.costoEnvio?.toLocaleString('es-CO')}`}</span>
              </div>
              <hr />
              <div className="flex justify-between text-lg font-bold text-gray-900">
                <span>Total</span>
                <span className="text-green-600">${order.total?.toLocaleString('es-CO')}</span>
              </div>
            </div>
          </div>
        )}

        {/* Transaction ID */}
        {transactionId && status !== 'loading' && (
          <p className="text-center text-xs text-gray-400">ID de transacción: {transactionId}</p>
        )}

        {/* Action buttons */}
        {status !== 'loading' && (
          <div className="space-y-3">
            {(status === 'approved' || status === 'pending') && orderId && (
              <button
                onClick={() => navigate(`/orders/${orderId}`)}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Ver detalle del pedido
              </button>
            )}

            {status === 'pending' && retryCount >= MAX_RETRIES && (
              <button
                onClick={() => { setRetryCount(0); verifyPayment(0); }}
                className="w-full bg-yellow-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-yellow-600 transition-colors"
              >
                Reintentar verificación
              </button>
            )}

            {(status === 'declined' || status === 'error') && (
              <button
                onClick={() => navigate('/cart')}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Volver al carrito
              </button>
            )}

            <button
              onClick={() => navigate('/orders')}
              className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Ver todos mis pedidos
            </button>

            <button
              onClick={() => navigate('/')}
              className="w-full text-gray-500 py-2 px-4 rounded-lg text-sm hover:text-gray-700 transition-colors"
            >
              Volver al inicio
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WompiReturnPageFixed;
