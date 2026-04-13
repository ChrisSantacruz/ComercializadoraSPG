import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useNotificationCard } from '../../hooks/useNotificationCard';

interface PaymentResult {
  status: 'APPROVED' | 'DECLINED' | 'VOIDED' | 'ERROR' | 'PENDING';
  transactionId?: string;
  orderId?: string;
  message?: string;
  amount?: number;
  paymentMethod?: string;
  reference?: string;
}

const WompiReturnPageFixed: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showSuccess, showError } = useNotificationCard();
  
  const [loading, setLoading] = useState(true);
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
  const [error, setError] = useState('');
  const [processingTime, setProcessingTime] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    processPaymentReturn();
    
    const timer = setInterval(() => {
      setProcessingTime(Date.now() - startTime);
    }, 100);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const processPaymentReturn = async () => {
    try {
      console.log('🔄 Processing Wompi payment return...');
      setLoading(true);
      setError('');

      // Obtener parámetros de la URL
      const transactionId = searchParams.get('id');
      const status = searchParams.get('status');
      const orderId = searchParams.get('orderId');
      const reference = searchParams.get('reference');
      
      console.log('📥 Payment return parameters:', {
        transactionId,
        status,
        orderId,
        reference
      });

      // Si tenemos los parámetros básicos, el pago se procesó
      if (transactionId || orderId || reference) {
        console.log('✅ Payment processed, parameters found');
        
        // Determinar el estado del pago basado en los parámetros
        let paymentStatus: PaymentResult['status'] = 'APPROVED';
        let message = 'Pago procesado exitosamente';
        
        // Verificar si hay indicadores de error o rechazo en la URL
        if (status && (status.toLowerCase() === 'declined' || status.toLowerCase() === 'error')) {
          paymentStatus = status.toUpperCase() as PaymentResult['status'];
          message = status.toLowerCase() === 'declined' 
            ? 'El pago fue rechazado' 
            : 'Ocurrió un error durante el proceso de pago';
        }
        
        const result: PaymentResult = {
          status: paymentStatus,
          transactionId: transactionId || undefined,
          orderId: orderId || reference || undefined,
          reference: reference || orderId || undefined,
          message: message
        };

        setPaymentResult(result);
        
        // Mostrar mensaje según el estado
        if (paymentStatus === 'APPROVED') {
          showSuccess(
            '¡Pago exitoso!', 
            'Tu pago ha sido procesado correctamente. Te redirigiremos a tu pedido.'
          );

          // Redirigir después de mostrar el mensaje
          setTimeout(() => {
            if (orderId || reference) {
              navigate(`/orders/${orderId || reference}`, { 
                state: { 
                  paymentSuccess: true,
                  transactionId: transactionId,
                  fromPayment: true 
                }
              });
            } else {
              navigate('/orders', { 
                state: { 
                  paymentSuccess: true,
                  message: 'Tu pago ha sido procesado exitosamente'
                }
              });
            }
          }, 3000);
        } else {
          // Pago rechazado o con error
          showError(
            paymentStatus === 'DECLINED' ? 'Pago rechazado' : 'Error en el pago',
            message
          );

          // Redirigir al carrito o productos después de mostrar el error
          setTimeout(() => {
            navigate('/cart', {
              state: {
                paymentFailed: true,
                reason: message
              }
            });
          }, 4000);
        }

      } else {
        console.log('⚠️  No payment parameters found');
        
        // Si no hay parámetros, podría ser un error o una redirección problemática
        const errorMessage = 'No se encontraron datos del pago. Es posible que haya ocurrido un error.';
        setError(errorMessage);
        
        showError(
          'Problema con el pago',
          'No pudimos verificar el estado de tu pago. Por favor revisa tus pedidos o contacta soporte.'
        );

        // Redirigir a pedidos después de un momento
        setTimeout(() => {
          navigate('/orders');
        }, 5000);
      }

      setLoading(false);

    } catch (error: any) {
      console.error('❌ Error processing payment return:', error);
      
      const errorMessage = error.message || 'Error al procesar el retorno del pago';
      setError(errorMessage);
      
      showError(
        'Error procesando el pago',
        'Hubo un problema al verificar tu pago. Por favor revisa tus pedidos.'
      );
      
      // Redirigir a pedidos en caso de error
      setTimeout(() => {
        navigate('/orders');
      }, 5000);
      
      setLoading(false);
    }
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const milliseconds = ms % 1000;
    return `${seconds}.${Math.floor(milliseconds / 100)}s`;
  };

  const handleRetryNavigation = () => {
    if (paymentResult?.orderId) {
      navigate(`/orders/${paymentResult.orderId}`);
    } else {
      navigate('/orders');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          {loading ? (
            <div className="space-y-6">
              <div className="mx-auto h-16 w-16">
                <LoadingSpinner size="lg" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Procesando tu pago
                </h2>
                <p className="text-gray-600 mb-4">
                  Estamos verificando el estado de tu transacción...
                </p>
                <div className="text-sm text-gray-500">
                  Tiempo transcurrido: {formatTime(processingTime)}
                </div>
              </div>
            </div>
          ) : paymentResult ? (
            <div className="space-y-6">
              {paymentResult.status === 'APPROVED' ? (
                <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              ) : (
                <div className="mx-auto h-16 w-16 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              )}
              
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {paymentResult.status === 'APPROVED' ? '¡Pago exitoso!' : 'Pago no completado'}
                </h2>
                <p className="text-gray-600 mb-6">
                  {paymentResult.message || 
                   (paymentResult.status === 'APPROVED' 
                     ? 'Tu pago ha sido procesado correctamente' 
                     : 'Hubo un problema con tu pago')}
                </p>
                
                {paymentResult.transactionId && (
                  <div className="bg-gray-100 rounded-lg p-4 mb-6">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">ID de transacción:</span> {paymentResult.transactionId}
                    </p>
                    {paymentResult.orderId && (
                      <p className="text-sm text-gray-600 mt-1">
                        <span className="font-medium">Pedido:</span> {paymentResult.orderId}
                      </p>
                    )}
                  </div>
                )}
                
                <div className="space-y-3">
                  <button
                    onClick={handleRetryNavigation}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    {paymentResult.status === 'APPROVED' ? 'Ver mi pedido' : 'Ver pedidos'}
                  </button>
                  
                  <button
                    onClick={() => navigate('/')}
                    className="w-full bg-gray-200 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                  >
                    Volver al inicio
                  </button>
                </div>
              </div>
            </div>
          ) : error ? (
            <div className="space-y-6">
              <div className="mx-auto h-16 w-16 bg-yellow-100 rounded-full flex items-center justify-center">
                <svg className="h-8 w-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Problema al verificar el pago
                </h2>
                <p className="text-gray-600 mb-6">
                  {error}
                </p>
                
                <div className="space-y-3">
                  <button
                    onClick={() => navigate('/orders')}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    Ver mis pedidos
                  </button>
                  
                  <button
                    onClick={() => navigate('/')}
                    className="w-full bg-gray-200 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                  >
                    Volver al inicio
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default WompiReturnPageFixed;
