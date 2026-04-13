import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Order } from '../../types';
import orderService from '../../services/orderService';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { getImageUrl, getFirstImageUrl } from '../../utils/imageUtils';
import { formatDeliveryInfo } from '../../utils/addressUtils';

const OrderConfirmationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadOrder();
    }
  }, [id]);

  const loadOrder = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const orderData = await orderService.getOrderById(id);
      setOrder(orderData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando pedido');
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPaymentMethodText = (tipo: string) => {
    switch (tipo) {
      case 'PSE':
        return 'PSE - Pagos Seguros en Línea';
      case 'Nequi':
        return 'Nequi';
      case 'tarjeta_credito':
        return 'Tarjeta de Crédito';
      default:
        return tipo;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmado':
        return 'bg-blue-100 text-blue-800';
      case 'procesando':
        return 'bg-orange-100 text-orange-800';
      case 'enviado':
        return 'bg-purple-100 text-purple-800';
      case 'entregado':
        return 'bg-green-100 text-green-800';
      case 'cancelado':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pendiente':
        return 'Pendiente';
      case 'confirmado':
        return 'Confirmado';
      case 'procesando':
        return 'Preparando';
      case 'enviado':
        return 'Enviado';
      case 'entregado':
        return 'Entregado';
      case 'cancelado':
        return 'Cancelado';
      default:
        return status;
    }
  };

  if (loading) return <LoadingSpinner />;

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
            <h3 className="font-medium">Error cargando pedido</h3>
            <p className="mt-1">{error || 'Pedido no encontrado'}</p>
            <button
              onClick={() => navigate('/orders')}
              className="mt-3 text-sm text-red-600 hover:text-red-800 underline"
            >
              Ver mis pedidos
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isStorePickup = order.tipoEntrega === 'recoger_establecimiento' || order.envio?.tipoEnvio === 'recoger_tienda';

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Encabezado de confirmación */}
        <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-xl shadow-lg p-8 mb-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold mb-2">¡Pedido Confirmado!</h1>
            <p className="text-green-100 text-lg">
              Tu pedido ha sido procesado exitosamente
            </p>
            <div className="mt-4 bg-white/20 rounded-lg p-4 inline-block">
              <p className="text-sm text-green-100">Número de orden</p>
              <p className="text-2xl font-bold">{order.numeroOrden}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Información del pedido */}
          <div className="lg:col-span-2 space-y-6">
            {/* Productos */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Productos del pedido</h2>
              <div className="space-y-4">
                {order.productos.map((item, index) => (
                  <div key={index} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
                    <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                      {item.imagen || (item.producto.imagenes && item.producto.imagenes.length > 0) ? (
                        <img
                          src={getImageUrl(item.imagen) || getFirstImageUrl(item.producto.imagenes)}
                          alt={item.producto.nombre}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/images/default-product.svg';
                          }}
                        />
                      ) : (
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-grow">
                      <h3 className="font-medium text-gray-900">{item.producto.nombre}</h3>
                      <p className="text-sm text-gray-600">Cantidad: {item.cantidad}</p>
                      <p className="text-sm text-gray-600">Precio: ${item.precio.toLocaleString('es-CO')}</p>
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      ${item.subtotal.toLocaleString('es-CO')}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Información de entrega */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Información de entrega</h2>
              {isStorePickup ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Modalidad</p>
                    <p className="text-gray-900">Recoger en establecimiento</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Destinatario</p>
                    <p className="text-gray-900">{order.cliente?.nombre || 'Cliente'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Notas</p>
                    <p className="text-gray-900">Te contactaremos para coordinar la recogida de tu pedido.</p>
                  </div>
                </div>
              ) : (() => {
                const deliveryInfo = formatDeliveryInfo(order.direccionEntrega);
                
                return (
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Destinatario</p>
                      <p className="text-gray-900">{deliveryInfo.recipientName}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Teléfono</p>
                      <p className="text-gray-900">{deliveryInfo.recipientPhone}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Dirección</p>
                      <p className="text-gray-900">{deliveryInfo.completeAddress}</p>
                    </div>
                    {deliveryInfo.hasInstructions && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">Instrucciones</p>
                        <p className="text-gray-900">{deliveryInfo.instructions}</p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Método de pago */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Método de pago</h2>
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm0 2h12v8H4V6z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-900">{getPaymentMethodText(order.metodoPago.tipo)}</p>
                  <p className="text-sm text-gray-600">
                    Estado: <span className="font-medium">{order.metodoPago.estado}</span>
                  </p>
                  {order.metodoPago.transaccionId && (
                    <p className="text-sm text-gray-600">ID: {order.metodoPago.transaccionId}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Resumen y acciones */}
          <div className="lg:col-span-1 space-y-6">
            {/* Estado del pedido */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Estado del pedido</h3>
              <div className="text-center">
                <div className={`inline-flex px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(order.estado)}`}>
                  {getStatusText(order.estado)}
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Creado: {formatDate(order.fechaCreacion)}
                </p>
              </div>
            </div>

            {/* Resumen de costos */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen de compra</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">${order.subtotal.toLocaleString('es-CO')}</span>
                </div>
                {order.descuentos > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Descuentos</span>
                    <span>-${order.descuentos.toLocaleString('es-CO')}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">{isStorePickup ? 'Recogida' : 'Envío'}</span>
                  <span className="font-medium">
                    {order.costoEnvio === 0 ? 'Gratis' : `$${order.costoEnvio.toLocaleString('es-CO')}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Impuestos</span>
                  <span className="font-medium">${order.impuestos.toLocaleString('es-CO')}</span>
                </div>
                <hr className="my-4" />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-green-600">${order.total.toLocaleString('es-CO')}</span>
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="bg-white rounded-xl shadow-lg p-6 space-y-3">
              <button
                onClick={() => navigate('/orders')}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 font-medium transition-colors"
              >
                Ver mis pedidos
              </button>
              <button
                onClick={() => navigate('/products')}
                className="w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                Continuar comprando
              </button>
              <button
                onClick={() => window.print()}
                className="w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                Imprimir pedido
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmationPage; 