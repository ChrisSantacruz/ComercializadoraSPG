import React, { useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { CalendarDaysIcon, CreditCardIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';
import { Order, OrderTimeline } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card, CardBody } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { getImageUrl, getFirstImageUrl } from '../../utils/imageUtils';
import { formatDeliveryInfo } from '../../utils/addressUtils';
import { useOrderDetailQuery } from '../../lib/query/hooks/useOrdersQuery';
import { Container } from '../../components/ui/Container';

function humanizeEstado(estado: string): string {
  const map: Record<string, string> = {
    pendiente: 'Pendiente',
    payment_pending: 'Pago pendiente',
    payment_failed: 'Pago no aprobado',
    confirmado: 'Confirmado',
    procesando: 'En preparación',
    enviado: 'Enviado',
    entregado: 'Entregado',
    cancelado: 'Cancelado',
    devuelto: 'Devuelto',
    paid: 'Pagado'
  };
  return map[estado] || estado;
}

/** Timeline basada solo en datos del pedido (sin simulaciones ni tracking inventado). */
function buildOrderTimelineFromOrder(order: Order): OrderTimeline[] {
  const hist = order.historialEstados;
  if (hist?.length) {
    return hist.map((h) => ({
      estado: h.estado,
      titulo: humanizeEstado(h.estado),
      descripcion: h.comentario || 'Actualización de estado registrada en el sistema.',
      fecha: typeof h.fecha === 'string' ? h.fecha : String(h.fecha),
      completado: true,
      icono: '•'
    }));
  }

  const est = order.estado;
  const mp = order.metodoPago;
  const rows: OrderTimeline[] = [];

  rows.push({
    estado: 'registrado',
    titulo: 'Pedido registrado',
    descripcion: 'Tu pedido quedó registrado.',
    fecha: order.fechaCreacion,
    completado: true,
    icono: '1'
  });

  const pagoAprobado =
    mp.estado === 'aprobado' || ['confirmado', 'procesando', 'enviado', 'entregado', 'paid'].includes(est);
  const pagoFallido = est === 'payment_failed' || mp.estado === 'rechazado';

  rows.push({
    estado: 'pago',
    titulo: pagoFallido ? 'Pago no aprobado' : pagoAprobado ? 'Pago acreditado' : 'Pago en proceso',
    descripcion: pagoFallido
      ? order.paymentInfo?.failureReason || 'El proveedor de pagos no aprobó la transacción.'
      : pagoAprobado
        ? 'El pago fue acreditado correctamente.'
        : 'Esperando confirmación del proveedor de pagos.',
    fecha: pagoAprobado && mp.fechaPago ? mp.fechaPago : undefined,
    completado: pagoAprobado || pagoFallido,
    icono: '2'
  });

  if (pagoFallido) {
    return rows;
  }

  rows.push({
    estado: 'preparacion',
    titulo: 'Preparación del pedido',
    descripcion: 'El comerciante prepara tu pedido para envío.',
    fecha: ['confirmado', 'procesando', 'enviado', 'entregado'].includes(est) ? order.fechaActualizacion : undefined,
    completado: ['confirmado', 'procesando', 'enviado', 'entregado'].includes(est),
    icono: '3'
  });

  rows.push({
    estado: 'enviado',
    titulo: 'Envío',
    descripcion: order.envio?.numeroGuia
      ? `Guía ${order.envio.numeroGuia}${order.envio.empresa ? ` · ${order.envio.empresa}` : ''}`
      : order.seguimiento?.numeroSeguimiento
        ? `Seguimiento ${order.seguimiento.numeroSeguimiento}`
        : 'Cuando exista información de envío, aparecerá aquí.',
    fecha: order.envio?.fechaEnvio || order.seguimiento?.fechaEnvio,
    completado: ['enviado', 'entregado'].includes(est),
    icono: '4',
    detalles:
      order.seguimiento?.numeroSeguimiento && order.seguimiento?.transportadora
        ? {
            numeroSeguimiento: order.seguimiento.numeroSeguimiento,
            transportadora: String(order.seguimiento.transportadora)
          }
        : undefined
  });

  rows.push({
    estado: 'entregado',
    titulo: 'Entrega',
    descripcion: 'Pedido entregado al destinatario.',
    fecha: order.envio?.fechaEntregaReal,
    completado: est === 'entregado',
    icono: '5'
  });

  return rows;
}

const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation() as { state?: { fromWompi?: boolean } };
  const [showWompiBanner, setShowWompiBanner] = useState(!!location.state?.fromWompi);

  const {
    data: order,
    isLoading,
    isError,
    error: queryError,
    refetch,
    isFetching,
  } = useOrderDetailQuery(id, { pollPaymentPending: true });

  const loadOrderDetail = () => void refetch();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pendiente: 'bg-yellow-100 text-yellow-800',
      payment_pending: 'bg-amber-100 text-amber-900',
      payment_failed: 'bg-red-100 text-red-800',
      confirmado: 'bg-blue-100 text-blue-800',
      procesando: 'bg-orange-100 text-orange-800',
      enviado: 'bg-purple-100 text-purple-800',
      entregado: 'bg-green-100 text-green-800',
      cancelado: 'bg-red-100 text-red-800',
      paid: 'bg-green-100 text-green-800',
      devuelto: 'bg-gray-200 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      pendiente: 'Pendiente',
      payment_pending: 'Pago pendiente',
      payment_failed: 'Pago rechazado',
      confirmado: 'Confirmado',
      procesando: 'Preparando',
      enviado: 'Enviado',
      entregado: 'Entregado',
      cancelado: 'Cancelado',
      paid: 'Pagado',
      devuelto: 'Devuelto'
    };
    return texts[status] || status;
  };

  if (isLoading && !order) {
    return (
      <Container as="main" className="py-8">
        <div className="space-y-4">
          <Skeleton className="h-10 w-2/3 max-w-md" />
          <Skeleton className="min-h-[120px] w-full rounded-xl" />
        </div>
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      </Container>
    );
  }

  if (isError || !order) {
    const message =
      queryError instanceof Error
        ? queryError.message
        : 'No pudimos cargar el pedido. Reintenta en unos segundos.';
    return (
      <Container as="main" className="py-8">
        <Card>
          <CardBody className="space-y-4 text-center">
            <p className="font-medium text-gray-800">No pudimos cargar este pedido</p>
            <p className="text-sm text-gray-600">{message}</p>
            <Button type="button" variant="primary" onClick={loadOrderDetail}>
              Reintentar
            </Button>
          </CardBody>
        </Card>
      </Container>
    );
  }

  const timeline = buildOrderTimelineFromOrder(order);
  const isStorePickup =
    order.tipoEntrega === 'recoger_establecimiento' || order.envio?.tipoEnvio === 'recoger_tienda';

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {showWompiBanner ? (
          <div className="mb-6 rounded-xl border border-success-200 bg-success-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-sm text-success-900">
              Pago verificado correctamente. El detalle de tu pedido se actualiza con la información del comerciante.
            </p>
            <Button type="button" variant="outline" size="sm" onClick={() => setShowWompiBanner(false)}>
              Entendido
            </Button>
          </div>
        ) : null}
        {isFetching ? (
          <p className="mb-4 text-xs text-gray-500" aria-live="polite">
            Sincronizando estado del pedido…
          </p>
        ) : null}
        {/* Header del pedido */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Pedido #{order.numeroOrden}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDaysIcon className="h-4 w-4 text-gray-500" aria-hidden />
                  {formatDate(order.fechaCreacion)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CreditCardIcon className="h-4 w-4 text-gray-500" aria-hidden />
                  {order.metodoPago.tipo}
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium text-gray-800">
                  <CurrencyDollarIcon className="h-4 w-4 text-gray-500" aria-hidden />
                  ${order.total.toLocaleString('es-CO')}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(order.estado)}`}>
                {getStatusText(order.estado)}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Timeline de estados */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-8">Estado de tu pedido</h2>
              
              <div className="relative">
                {timeline.map((step, index) => (
                  <div key={`${step.estado}-${index}`} className="flex items-start mb-8 last:mb-0">
                    {/* Línea conectora */}
                    {index < timeline.length - 1 && (
                      <div className={`absolute left-6 top-12 w-0.5 h-16 ${
                        step.completado ? 'bg-green-400' : 'bg-gray-200'
                      }`} />
                    )}
                    
                    {/* Icono del estado */}
                    <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold border-4 ${
                      step.completado 
                        ? 'bg-green-100 border-green-400 text-green-800' 
                        : 'bg-gray-100 border-gray-300 text-gray-500'
                    }`}>
                      {step.icono}
                    </div>
                    
                    {/* Contenido del estado */}
                    <div className="ml-6 flex-grow">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className={`text-lg font-semibold ${
                          step.completado ? 'text-gray-900' : 'text-gray-500'
                        }`}>
                          {step.titulo}
                        </h3>
                        {step.fecha && (
                          <span className="text-sm text-gray-500">
                            {formatDate(step.fecha)}
                          </span>
                        )}
                      </div>
                      <p className={`text-sm ${
                        step.completado ? 'text-gray-600' : 'text-gray-400'
                      }`}>
                        {step.descripcion}
                      </p>
                      
                      {/* Detalles adicionales */}
                      {step.detalles && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                          <div className="text-sm">
                            <span className="font-medium text-blue-900">Número de seguimiento:</span>
                            <span className="ml-2 font-mono text-blue-700">{step.detalles.numeroSeguimiento}</span>
                          </div>
                          <div className="text-sm mt-1">
                            <span className="font-medium text-blue-900">Transportadora:</span>
                            <span className="ml-2 text-blue-700">{step.detalles.transportadora}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Productos del pedido */}
            <div className="bg-white rounded-xl shadow-lg p-8 mt-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Productos ordenados</h2>
              
              <div className="space-y-6">
                {order.productos.map((item) => (
                  <div key={item._id} className="flex items-center space-x-4 p-4 border border-gray-100 rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex-shrink-0">
                      <img
                        src={(() => {
                          if (item.imagen) {
                            try {
                              return getImageUrl(item.imagen);
                            } catch {
                              /* continuar con producto */
                            }
                          }

                          if (item.producto?.imagenes && item.producto.imagenes.length > 0) {
                            try {
                              return getFirstImageUrl(item.producto.imagenes);
                            } catch {
                              /* fallback abajo */
                            }
                          }

                          return '/images/default-product.svg';
                        })()}
                        alt={item.producto.nombre}
                        className="w-20 h-20 object-cover rounded-lg"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/images/default-product.svg';
                        }}
                      />
                    </div>
                    
                    <div className="flex-grow">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {item.producto.nombre}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">
                        {item.producto.descripcion}
                      </p>
                      
                      {/* Especificaciones */}
                      {item.producto.especificaciones && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {Object.entries(item.producto.especificaciones).map(([key, value]) => (
                            <span key={key} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                              {key}: {value}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                          Cantidad: <span className="font-semibold">{item.cantidad}</span>
                        </div>
                        <div className="text-lg font-bold text-green-600">
                          ${item.subtotal.toLocaleString('es-CO')}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Información del pedido */}
          <div className="lg:col-span-1 space-y-8">
            {/* Resumen de costos */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Resumen del pedido</h3>
              
              <div className="space-y-4">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>${order.subtotal.toLocaleString('es-CO')}</span>
                </div>
                
                {order.descuentos > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Descuentos</span>
                    <span>-${order.descuentos.toLocaleString('es-CO')}</span>
                  </div>
                )}
                
                {order.impuestos > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Impuestos</span>
                  <span>${order.impuestos.toLocaleString('es-CO')}</span>
                </div>
                )}
                
                <div className="flex justify-between text-gray-600">
                  <span>{isStorePickup ? 'Recogida' : 'Envío'}</span>
                  <span>{order.costoEnvio === 0 ? 'Gratis' : `$${order.costoEnvio.toLocaleString('es-CO')}`}</span>
                </div>
                
                <div className="border-t pt-4">
                  <div className="flex justify-between text-xl font-bold text-gray-900">
                    <span>Total</span>
                    <span>${order.total.toLocaleString('es-CO')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Información de entrega */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Información de entrega</h3>

              {isStorePickup ? (
                <div className="space-y-3">
                  <div>
                    <div className="text-sm font-medium text-gray-700">Modalidad</div>
                    <div className="text-gray-900">Recoger en establecimiento</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-700">Notas</div>
                    <div className="text-gray-600 text-sm">Te contactaremos para coordinar la recogida de tu pedido.</div>
                  </div>
                </div>
              ) : (() => {
                const deliveryInfo = formatDeliveryInfo(order.direccionEntrega);
                
                return (
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm font-medium text-gray-700">Destinatario</div>
                      <div className="text-gray-900">{deliveryInfo.recipientName}</div>
                      <div className="text-gray-600">{deliveryInfo.recipientPhone}</div>
                    </div>
                    
                    <div>
                      <div className="text-sm font-medium text-gray-700">Dirección</div>
                      <div className="text-gray-900">{deliveryInfo.completeAddress}</div>
                      
                      {deliveryInfo.hasInstructions && (
                        <div className="mt-2">
                          <div className="text-sm font-medium text-gray-700">Instrucciones de entrega</div>
                          <div className="text-gray-600 text-sm">{deliveryInfo.instructions}</div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Información de pago */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Información de pago</h3>
              
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-medium text-gray-700">Método de pago</div>
                  <div className="text-gray-900">{order.metodoPago.tipo}</div>
                </div>
                
                <div>
                  <div className="text-sm font-medium text-gray-700">Estado del pago</div>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                      order.metodoPago.estado === 'aprobado'
                        ? 'bg-green-100 text-green-800'
                        : order.metodoPago.estado === 'rechazado'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {order.metodoPago.estado === 'aprobado'
                      ? 'Pagado'
                      : order.metodoPago.estado === 'rechazado'
                        ? 'Rechazado'
                        : order.metodoPago.estado === 'procesando'
                          ? 'Procesando'
                          : 'Pendiente'}
                  </span>
                </div>
                
                {order.metodoPago.transaccionId && (
                  <div>
                    <div className="text-sm font-medium text-gray-700">ID de transacción</div>
                    <div className="text-gray-900 font-mono text-sm">{order.metodoPago.transaccionId}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailPage; 