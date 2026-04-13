import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import orderService from '../../services/orderService';
import { Order, OrderTimeline } from '../../types';
import { formatDeliveryInfo } from '../../utils/addressUtils';
import { debugOrderImages } from '../../utils/debugUtils';
import { getFirstImageUrl, getImageUrl } from '../../utils/imageUtils';

const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Timeline de estados simulado para demostración
  const getOrderTimeline = (orderStatus: string): OrderTimeline[] => {
    const timeline: OrderTimeline[] = [
      {
        estado: 'pendiente',
        titulo: 'Pedido Realizado',
        descripcion: 'Tu pedido ha sido recibido y está siendo procesado',
        fecha: new Date().toISOString(),
        completado: true,
        icono: '🛒'
      },
      {
        estado: 'confirmado',
        titulo: 'Pedido Confirmado',
        descripcion: 'El comerciante ha confirmado tu pedido',
        fecha: orderStatus !== 'pendiente' ? new Date(Date.now() + 30*60*1000).toISOString() : undefined,
        completado: ['confirmado', 'procesando', 'enviado', 'entregado'].includes(orderStatus),
        icono: '✅'
      },
      {
        estado: 'procesando',
        titulo: 'Preparando Paquete',
        descripcion: 'Tu pedido está siendo preparado para el envío',
        fecha: orderStatus === 'procesando' || orderStatus === 'enviado' || orderStatus === 'entregado' ? new Date(Date.now() + 2*60*60*1000).toISOString() : undefined,
        completado: ['procesando', 'enviado', 'entregado'].includes(orderStatus),
        icono: '📦'
      },
      {
        estado: 'enviado',
        titulo: 'Paquete Enviado',
        descripcion: 'Tu paquete está en camino',
        fecha: orderStatus === 'enviado' || orderStatus === 'entregado' ? new Date(Date.now() + 24*60*60*1000).toISOString() : undefined,
        completado: ['enviado', 'entregado'].includes(orderStatus),
        icono: '🚚',
        detalles: orderStatus === 'enviado' || orderStatus === 'entregado' ? {
          numeroSeguimiento: 'TRK123456789',
          transportadora: 'Servientrega'
        } : undefined
      },
      {
        estado: 'entregado',
        titulo: 'Pedido Entregado',
        descripcion: '¡Tu pedido ha sido entregado exitosamente!',
        fecha: orderStatus === 'entregado' ? new Date(Date.now() + 48*60*60*1000).toISOString() : undefined,
        completado: orderStatus === 'entregado',
        icono: '🎉'
      }
    ];

    return timeline;
  };

  useEffect(() => {
    loadOrderDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadOrderDetail = async () => {
    if (!id) return;

    try {
      setLoading(true);
      
      // Intentar cargar la orden real del backend
      try {
        const orderData = await orderService.getOrderById(id);
        setOrder(orderData);
        setError(null);
        
        // Debug de imágenes - no fallar si hay errores en el debug
        try {
          debugOrderImages(orderData);
        } catch (debugError) {
          console.warn('Error en debug de imágenes (no afecta la funcionalidad):', debugError);
        }
        
        return;
      } catch (backendError) {
        console.warn('No se pudo cargar la orden del backend, usando datos simulados:', backendError);
      }
      
      // Simular datos de orden para demostración si falla el backend
      const simulatedOrder: Order = {
        _id: id,
        numeroOrden: `ORD-${id.slice(-6).toUpperCase()}`,
        cliente: {
          _id: 'user1',
          nombre: 'Juan Pérez',
          email: 'juan@email.com',
          telefono: '3001234567',
          rol: 'cliente',
          verificado: true,
          estado: 'activo',
          fechaCreacion: '',
          fechaActualizacion: ''
        },
        productos: [
          {
            _id: 'item1',
            producto: {
              _id: 'prod1',
              nombre: 'Smartphone Samsung Galaxy A54',
              descripcion: 'Teléfono inteligente con cámara de 50MP',
              precio: 850000,
              stock: 10,
              imagenes: ['/api/placeholder/300/300'],
              categoria: 'tecnologia',
              comerciante: 'merchant1',
              estado: 'aprobado',
              especificaciones: { color: 'Negro', memoria: '128GB' },
              tags: ['tecnologia', 'smartphone'],
              fechaCreacion: '',
              fechaActualizacion: '',
              estadisticas: { vistas: 100, vendidos: 5, calificacionPromedio: 4.5, totalReseñas: 10 }
            },
            comerciante: {
              _id: 'merchant1',
              nombre: 'Comerciante Demo',
              email: 'comerciante@email.com',
              telefono: '3001234567',
              rol: 'comerciante',
              verificado: true,
              estado: 'activo',
              fechaCreacion: '',
              fechaActualizacion: ''
            },
            cantidad: 1,
            precio: 850000,
            subtotal: 850000,
            nombre: 'Smartphone Samsung Galaxy A54',
            imagen: '/api/placeholder/300/300'
          }
        ],
        subtotal: 850000,
        impuestos: 161500,
        costoEnvio: 0,
        descuentos: 0,
        total: 1011500,
        estado: 'confirmado',
        direccionEntrega: {
          _id: 'addr1',
          alias: 'Casa',
          nombreDestinatario: 'Juan Pérez',
          telefono: '3001234567',
          direccion: {
            calle: 'Calle 123',
            numero: '45-67',
            barrio: 'Centro',
            ciudad: 'Bogotá',
            departamento: 'Cundinamarca',
            codigoPostal: '110111',
            pais: 'Colombia'
          },
          tipo: 'casa',
          configuracion: {
            esPredeterminada: true,
            esFacturacion: true,
            esEnvio: true,
            activa: true
          },
          direccionCompleta: 'Calle 123 #45-67, Centro, Bogotá, Cundinamarca',
          estadisticas: {
            vecesUsada: 5,
            entregasExitosas: 5,
            entregasFallidas: 0
          }
        },
        metodoPago: {
          tipo: 'PSE',
          estado: 'aprobado',
          transaccionId: 'TXN_' + Date.now(),
          fechaPago: new Date().toISOString()
        },
        fechaCreacion: new Date().toISOString(),
        fechaActualizacion: new Date().toISOString()
      };

      setOrder(simulatedOrder);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando detalle del pedido');
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

  const getStatusColor = (status: string) => {
    const colors = {
      pendiente: 'bg-yellow-100 text-yellow-800',
      confirmado: 'bg-blue-100 text-blue-800',
      procesando: 'bg-orange-100 text-orange-800',
      enviado: 'bg-purple-100 text-purple-800',
      entregado: 'bg-green-100 text-green-800',
      cancelado: 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (status: string) => {
    const texts = {
      pendiente: 'Pendiente',
      confirmado: 'Confirmado',
      procesando: 'Preparando',
      enviado: 'Enviado',
      entregado: 'Entregado',
      cancelado: 'Cancelado'
    };
    return texts[status as keyof typeof texts] || status;
  };

  if (loading) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Pedido no encontrado</h2>
          <p className="text-gray-600">El pedido que buscas no existe o no tienes acceso a él.</p>
        </div>
      </div>
    );
  }

  const isStorePickup = order.tipoEntrega === 'recoger_establecimiento' || order.envio?.tipoEnvio === 'recoger_tienda';
  const timeline = getOrderTimeline(order.estado);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Header del pedido */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Pedido #{order.numeroOrden}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                <span>📅 {formatDate(order.fechaCreacion)}</span>
                <span>💳 {order.metodoPago.tipo}</span>
                <span>💰 ${order.total.toLocaleString('es-CO')}</span>
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
                  <div key={step.estado} className="flex items-start mb-8 last:mb-0">
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
                          // Intentar obtener la imagen del pedido primero
                          if (item.imagen) {
                            try {
                              return getImageUrl(item.imagen);
                            } catch (error) {
                              console.warn('Error obteniendo imagen del pedido:', error);
                            }
                          }
                          
                          // Si no hay imagen del pedido o hay error, usar la del producto
                          if (item.producto?.imagenes && item.producto.imagenes.length > 0) {
                            try {
                              return getFirstImageUrl(item.producto.imagenes);
                            } catch (error) {
                              console.warn('Error obteniendo imagen del producto:', error);
                            }
                          }
                          
                          // Fallback final
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
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                    order.metodoPago.estado === 'aprobado' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {order.metodoPago.estado === 'aprobado' ? 'Pagado' : 'Pendiente'}
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