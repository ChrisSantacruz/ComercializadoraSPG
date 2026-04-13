import React, { useEffect, useState } from 'react';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import orderService from '../../services/orderService';
import { Order } from '../../types';
import { getFirstImageUrl, getImageUrl } from '../../utils/imageUtils';

const MerchantOrders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('todos');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [selectedTransportadora, setSelectedTransportadora] = useState('servientrega');
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [orderToUpdate, setOrderToUpdate] = useState<Order | null>(null);
  const [, setPagination] = useState({});

  // Estados disponibles para el comerciante
  const orderStatuses = [
    { value: 'todos', label: 'Todos los pedidos', color: 'bg-gray-100 text-gray-800' },
    { value: 'pendiente', label: 'Pendientes', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'confirmado', label: 'Confirmados', color: 'bg-blue-100 text-blue-800' },
    { value: 'procesando', label: 'Preparando', color: 'bg-orange-100 text-orange-800' },
    { value: 'enviado', label: 'Enviados', color: 'bg-purple-100 text-purple-800' },
    { value: 'entregado', label: 'Entregados', color: 'bg-green-100 text-green-800' },
    { value: 'cancelado', label: 'Cancelados', color: 'bg-red-100 text-red-800' }
  ];

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus]); // Recargar cuando cambie el filtro

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Cargando órdenes del comerciante...');
      console.log('🔧 Filtro estado:', filterStatus);
      
      const response = await orderService.getMerchantOrders({
        estado: filterStatus === 'todos' ? undefined : filterStatus,
        page: 1,
        limit: 10
      });
      
      console.log('📦 Respuesta del servidor:', response);
      console.log('📦 Tipo de respuesta:', typeof response);
      console.log('📦 Es array?:', Array.isArray(response));
      console.log('📦 Length si es array:', Array.isArray(response) ? response.length : 'N/A');
      
      // FORZAR: Si recibimos un array con órdenes, usarlo directamente
      if (Array.isArray(response) && response.length > 0) {
        console.log('🎯 USANDO ARRAY DIRECTO - órdenes encontradas:', response.length);
        response.forEach((orden, index) => {
          console.log(`   ${index + 1}. ${orden.numeroOrden || orden._id} - Estado: ${orden.estado}`);
        });
        setOrders(response);
        return; // SALIR AQUÍ
      }
      
      // Si no es array, intentar extraer datos
      console.log('📦 Keys de respuesta:', Object.keys(response || {}));
      
      // Extraer órdenes de cualquier formato de respuesta
      let ordersData: Order[] = [];
      
      if (response && (response as any).datos) {
        // Si la respuesta tiene estructura con datos
        console.log('📋 Respuesta tiene estructura con datos');
        ordersData = (response as any).datos;
        if ((response as any).paginacion) {
          console.log('📄 Paginación:', (response as any).paginacion);
          setPagination((response as any).paginacion);
        }
      } else {
        console.log('📋 Intentando extraer órdenes de otros formatos...');
        // Buscar arrays en cualquier propiedad
        const keys = Object.keys(response || {});
        for (const key of keys) {
          const value = (response as any)[key];
          if (Array.isArray(value) && value.length > 0 && value[0].numeroOrden) {
            console.log(`📋 Encontrado array de órdenes en propiedad: ${key}`);
            ordersData = value;
            break;
          }
        }
      }
      
      console.log('✅ Órdenes procesadas:', ordersData.length);
      if (ordersData.length > 0) {
        console.log('📋 Primera orden:', ordersData[0]);
      }
      
      setOrders(ordersData);
      
    } catch (err) {
      console.error('❌ Error cargando órdenes:', err);
      if (err instanceof Error) {
        console.error('❌ Error detalle:', err.message);
        console.error('❌ Error stack:', err.stack);
        setError(err.message);
      } else {
        console.error('❌ Error desconocido:', err);
        setError('Error cargando órdenes');
      }
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    const statusData = orderStatuses.find(s => s.value === status);
    return statusData ? statusData.color : 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (status: string) => {
    const statusData = orderStatuses.find(s => s.value === status);
    return statusData ? statusData.label : status;
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      // Usar el servicio real para actualizar estado
      await orderService.updateOrderStatusWithTracking(orderId, {
        estado: newStatus
      });
      
      // Recargar órdenes después de la actualización
      await loadOrders();
      
      setShowModal(false);
      setSelectedOrder(null);
    } catch (err) {
      console.error('Error actualizando estado:', err);
      setError(err instanceof Error ? err.message : 'Error actualizando estado');
    }
  };

  const handleAddTracking = async () => {
    if (!orderToUpdate || !trackingNumber.trim()) return;

    try {
      // Usar el servicio real para actualizar estado con seguimiento
      await orderService.updateOrderStatusWithTracking(orderToUpdate._id, {
        estado: 'enviado',
        numeroSeguimiento: trackingNumber,
        transportadora: selectedTransportadora
      });
      
      // Recargar órdenes después de la actualización
      await loadOrders();

      setShowTrackingModal(false);
      setTrackingNumber('');
      setOrderToUpdate(null);
      setSelectedTransportadora('servientrega');
    } catch (err) {
      console.error('Error agregando seguimiento:', err);
      setError(err instanceof Error ? err.message : 'Error agregando seguimiento');
    }
  };

  const filteredOrders = orders || [];
  const pendingOrdersCount = (orders || []).filter(order => (order.estado || 'pendiente') === 'pendiente').length;

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Mostrar errores si los hay */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            <div className="flex">
              <div className="py-1">
                <svg className="fill-current h-4 w-4 text-red-500 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M2.93 17.07A10 10 0 1 1 17.07 2.93 10 10 0 0 1 2.93 17.07zm12.73-1.41A8 8 0 1 0 4.34 4.34a8 8 0 0 0 11.32 11.32zM9 11V9h2v6H9v-4zm0-6h2v2H9V5z"/>
                </svg>
              </div>
              <div>
                <p className="text-sm">{error}</p>
                <p className="text-xs mt-1">Mostrando datos de ejemplo. Verifica tu conexión.</p>
              </div>
            </div>
          </div>
        )}

        {/* Botón de debugging temporal */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-blue-800">🔧 Modo Debug</h3>
              <p className="text-xs text-blue-600 mt-1">
                Órdenes en memoria: {orders.length} | Filtro: {filterStatus}
              </p>
            </div>
            <button
              onClick={() => {
                console.log('🔧 FORZANDO RECARGA...');
                loadOrders();
              }}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm"
            >
              🔄 Recargar
            </button>
          </div>
        </div>

        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Gestión de Pedidos
              </h1>
              <p className="text-gray-600">
                Administra los pedidos de tus productos y actualiza su estado
              </p>
            </div>
            
            {pendingOrdersCount > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                      <span className="text-yellow-800 font-bold text-sm">{pendingOrdersCount}</span>
                    </div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-yellow-800">
                      Pedidos pendientes de confirmación
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex flex-wrap gap-2">
            {orderStatuses.map((status) => (
              <button
                key={status.value}
                onClick={() => setFilterStatus(status.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  filterStatus === status.value
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status.label}
                {status.value !== 'todos' && (
                  <span className="ml-2 bg-white bg-opacity-20 px-2 py-0.5 rounded-full text-xs">
                    {(orders || []).filter(order => (order.estado || 'pendiente') === status.value).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de órdenes */}
        <div className="space-y-6">
          {filteredOrders.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <div className="text-gray-400 text-6xl mb-4">📦</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No hay pedidos
              </h3>
              <p className="text-gray-600">
                {filterStatus === 'todos' 
                  ? 'Aún no has recibido ningún pedido'
                  : `No hay pedidos con estado "${getStatusText(filterStatus)}"`
                }
              </p>
            </div>
          ) : (
            filteredOrders.map((order: Order) => (
              <div key={order._id} className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="p-6">
                  <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-6">
                    {/* Información del pedido */}
                    <div className="flex-grow">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold text-gray-900">
                          Pedido #{order.numeroOrden || order._id || 'N/A'}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(order.estado || 'pendiente')}`}>
                          {getStatusText(order.estado || 'pendiente')}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">Cliente</h4>
                          <p className="text-gray-600">{order.cliente?.nombre || 'Cliente no especificado'}</p>
                          <p className="text-gray-600 text-sm">{order.cliente?.email || 'Email no disponible'}</p>
                          <p className="text-gray-600 text-sm">{order.cliente?.telefono || 'Teléfono no disponible'}</p>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">Entrega</h4>
                          <p className="text-gray-600 text-sm">
                            {(order as any).tipoEntrega === 'recoger_establecimiento' || (order as any).envio?.tipoEnvio === 'recoger_tienda'
                              ? 'Recoger en establecimiento'
                              : (order as any).direccionEntrega?.direccionCompleta || 
                                `${(order as any).direccionEntrega?.calle || ''} ${(order as any).direccionEntrega?.ciudad || ''}`.trim() ||
                                'Dirección no especificada'}
                          </p>
                          <p className="text-gray-600 text-sm">
                            📅 {formatDate((order as any).fechaCreacion || (order as any).createdAt || new Date().toISOString())}
                          </p>
                        </div>
                      </div>

                      {/* Productos */}
                      <div className="border-t pt-4">
                        <h4 className="font-semibold text-gray-900 mb-3">Productos</h4>
                        <div className="space-y-3">
                          {(order.productos || []).map((item, index) => (
                            <div key={item._id || `product-${index}`} className="flex items-center space-x-3">
                              <img
                                src={getImageUrl(item.imagen) || getFirstImageUrl(item.producto?.imagenes)}
                                alt={item.producto?.nombre || 'Producto'}
                                className="w-12 h-12 object-cover rounded-lg"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = '/images/default-product.svg';
                                }}
                              />
                              <div className="flex-grow">
                                <p className="font-medium text-gray-900">{item.producto?.nombre || (item as any).nombre || 'Producto sin nombre'}</p>
                                <p className="text-sm text-gray-600">
                                  Cantidad: {item.cantidad || 0} x ${(item.precio || 0).toLocaleString('es-CO')}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-gray-900">
                                  ${(item.subtotal || 0).toLocaleString('es-CO')}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        <div className="mt-4 pt-4 border-t">
                          <div className="flex justify-between items-center">
                            <span className="text-lg font-bold text-gray-900">Total:</span>
                            <span className="text-xl font-bold text-green-600">
                              ${(order.total || 0).toLocaleString('es-CO')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex-shrink-0 lg:w-48">
                      <div className="space-y-3">
                        {(order.estado || 'pendiente') === 'pendiente' && (
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowModal(true);
                            }}
                            className="w-full bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
                          >
                            ✅ Confirmar Pedido
                          </button>
                        )}
                        
                        {(order.estado || 'pendiente') === 'confirmado' && (
                          <button
                            onClick={() => handleUpdateStatus(order._id || '', 'procesando')}
                            className="w-full bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
                          >
                            📦 Iniciar Preparación
                          </button>
                        )}
                        
                        {(order.estado || 'pendiente') === 'procesando' && (
                          <button
                            onClick={() => {
                              setOrderToUpdate(order);
                              setShowTrackingModal(true);
                            }}
                            className="w-full bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors"
                          >
                            🚚 Marcar como Enviado
                          </button>
                        )}
                        
                        {(order.estado || 'pendiente') === 'enviado' && (
                          <button
                            onClick={() => handleUpdateStatus(order._id || '', 'entregado')}
                            className="w-full bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
                          >
                            🎉 Marcar como Entregado
                          </button>
                        )}
                        
                        {(order.estado || 'pendiente') !== 'cancelado' && (order.estado || 'pendiente') !== 'entregado' && (
                          <button
                            onClick={() => handleUpdateStatus(order._id || '', 'cancelado')}
                            className="w-full bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
                          >
                            ❌ Cancelar Pedido
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal de confirmación */}
        {showModal && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Confirmar Pedido
              </h3>
              <p className="text-gray-600 mb-6">
                ¿Estás seguro de que quieres confirmar el pedido #{selectedOrder.numeroOrden || selectedOrder._id || 'N/A'}?
                Esto notificará al cliente que su pedido está siendo procesado.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedOrder(null);
                  }}
                  className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedOrder._id || '', 'confirmado')}
                  className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de número de seguimiento */}
        {showTrackingModal && orderToUpdate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Marcar como Enviado
              </h3>
              <p className="text-gray-600 mb-4">
                Pedido #{orderToUpdate.numeroOrden || orderToUpdate._id || 'N/A'}
              </p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número de Seguimiento *
                </label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="Ej: TRK123456789"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transportadora *
                </label>
                <select 
                  value={selectedTransportadora}
                  onChange={(e) => setSelectedTransportadora(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="servientrega">Servientrega</option>
                  <option value="interrapidisimo">Interrapidísimo</option>
                  <option value="coordinadora">Coordinadora</option>
                  <option value="tcc">TCC</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowTrackingModal(false);
                    setTrackingNumber('');
                    setOrderToUpdate(null);
                    setSelectedTransportadora('servientrega');
                  }}
                  className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddTracking}
                  disabled={!trackingNumber.trim()}
                  className="flex-1 bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Marcar como Enviado
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MerchantOrders; 