import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { orderService } from '../../services/orderService';
import { Order, OrderFilters, PaginatedResponse } from '../../types';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import DeliveryConfirmationForm from '../../components/forms/DeliveryConfirmationForm';
import ReviewForm from '../../components/forms/ReviewForm';
import { Review } from '../../services/reviewService';
import { getImageUrl, getFirstImageUrl } from '../../utils/imageUtils';
import { getCompleteAddress } from '../../utils/addressUtils';

const OrdersPage: React.FC = () => {
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    paginaActual: 1,
    totalPaginas: 1,
    totalElementos: 0,
    elementosPorPagina: 10
  });
  const [filters, setFilters] = useState<OrderFilters>({
    page: 1,
    limit: 10
  });
  
  // Estados para modales
  const [showDeliveryConfirmation, setShowDeliveryConfirmation] = useState<Order | null>(null);
  const [showReviewForm, setShowReviewForm] = useState<{
    order: Order;
    productId: string;
    productName: string;
  } | null>(null);

  useEffect(() => {
    loadOrders();
  }, [filters]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Cargando pedidos con filtros:', filters);
      console.log('👤 Usuario actual:', user);
      
      const response: PaginatedResponse<Order> = await orderService.getMyOrders(filters);
      
      console.log('📡 RESPUESTA COMPLETA de la API:', response);
      console.log('📦 Tipo de respuesta:', typeof response);
      console.log('📊 Datos recibidos:', response?.datos);
      console.log('📄 Paginación recibida:', response?.paginacion);
      
      if (response && response.datos) {
        console.log('✅ Usando response.datos:', response.datos);
        setOrders(response.datos);
        if (response.paginacion) {
          setPagination(response.paginacion);
        }
      } else if (Array.isArray(response)) {
        console.log('🎯 RESPUESTA ES ARRAY DIRECTO:', response);
        setOrders(response);
        setPagination({
          paginaActual: 1,
          totalPaginas: 1,
          totalElementos: response.length,
          elementosPorPagina: 10
        });
      } else {
        setOrders([]);
        console.log('📋 No se recibieron datos de pedidos válidos');
        console.log('🔍 Estructura de respuesta:', Object.keys(response || {}));
      }
      
    } catch (err) {
      console.error('❌ Error cargando pedidos:', err);
      console.error('❌ Detalles del error:', {
        message: err instanceof Error ? err.message : 'Error desconocido',
        status: (err as any)?.response?.status,
        statusText: (err as any)?.response?.statusText,
        data: (err as any)?.response?.data
      });
      setError(err instanceof Error ? err.message : 'Error cargando pedidos');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmado':
        return 'bg-blue-100 text-blue-800';
      case 'procesando':
        return 'bg-purple-100 text-purple-800';
      case 'enviado':
        return 'bg-indigo-100 text-indigo-800';
      case 'entregado':
        return 'bg-green-100 text-green-800';
      case 'cancelado':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return '⏳';
      case 'confirmado':
        return '✅';
      case 'procesando':
        return '🔄';
      case 'enviado':
        return '🚚';
      case 'entregado':
        return '📦';
      case 'cancelado':
        return '❌';
      default:
        return '📋';
    }
  };

  const handleFilterChange = (key: keyof OrderFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1
    }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({
      ...prev,
      page
    }));
  };

  const handleDeliveryConfirmed = (confirmed: boolean) => {
    if (confirmed) {
      // Recargar órdenes para mostrar nuevos botones de reseña
      loadOrders();
    }
  };

  const handleReviewSubmitted = () => {
    // Recargar órdenes para actualizar estado
    loadOrders();
  };

  const canConfirmDelivery = (order: Order) => {
    return order.estado === 'entregado' && !(order as any).entrega?.confirmada;
  };

  const canReviewProducts = (order: Order) => {
    return (order as any).reseñas?.puedeReseñar === true;
  };

  const openReviewForm = (order: Order, productId: string, productName: string) => {
    setShowReviewForm({ order, productId, productName });
  };

  if (loading && orders.length === 0) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Mis Pedidos</h1>
            <p className="text-gray-600 mt-2">
              {pagination.totalElementos} pedidos encontrados
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => {
                console.log('🔄 FORZANDO RECARGA DE PEDIDOS...');
                loadOrders();
              }}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              🔄 Recargar Pedidos
            </button>
            <Link
              to="/productos"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Seguir Comprando
            </Link>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filtrar Pedidos</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estado del pedido
            </label>
            <select
              value={filters.estado || ''}
              onChange={(e) => handleFilterChange('estado', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="confirmado">Confirmado</option>
              <option value="procesando">Procesando</option>
              <option value="enviado">Enviado</option>
              <option value="entregado">Entregado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Desde fecha
            </label>
            <input
              type="date"
              value={filters.fechaDesde || ''}
              onChange={(e) => handleFilterChange('fechaDesde', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hasta fecha
            </label>
            <input
              type="date"
              value={filters.fechaHasta || ''}
              onChange={(e) => handleFilterChange('fechaHasta', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Lista de pedidos */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : orders && Array.isArray(orders) && orders.length > 0 ? (
          orders.map((order) => (
            <div key={order._id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Pedido #{order.numeroOrden}
                      </h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.estado)}`}>
                        <span className="mr-1">{getStatusIcon(order.estado)}</span>
                        {order.estado.charAt(0).toUpperCase() + order.estado.slice(1)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Realizado el {new Date(order.fechaCreacion).toLocaleDateString('es-CO')}
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">
                      ${order.total.toLocaleString('es-CO')}
                    </p>
                    <p className="text-sm text-gray-600">
                      {order.productos.length} producto{order.productos.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                {/* Productos del pedido */}
                <div className="mt-4 border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Productos:</h4>
                  <div className="space-y-2">
                    {order.productos.slice(0, 3).map((item) => (
                      <div key={item._id} className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gray-200 rounded-md flex items-center justify-center overflow-hidden">
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
                            <span className="text-gray-400 text-xs">Sin imagen</span>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{item.producto.nombre}</p>
                          <p className="text-xs text-gray-600">
                            Cantidad: {item.cantidad} • ${item.precio.toLocaleString('es-CO')} c/u
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-gray-900">
                          ${item.subtotal.toLocaleString('es-CO')}
                        </p>
                      </div>
                    ))}
                    {order.productos.length > 3 && (
                      <p className="text-sm text-gray-600 text-center py-2">
                        Y {order.productos.length - 3} producto{order.productos.length - 3 !== 1 ? 's' : ''} más...
                      </p>
                    )}
                  </div>
                </div>

                {/* Información de entrega */}
                {order.direccionEntrega && (
                  <div className="mt-4 border-t pt-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">
                      {(order as any).tipoEntrega === 'recoger_establecimiento' || (order as any).envio?.tipoEnvio === 'recoger_tienda'
                        ? 'Entrega:'
                        : 'Dirección de entrega:'}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {(order as any).tipoEntrega === 'recoger_establecimiento' || (order as any).envio?.tipoEnvio === 'recoger_tienda'
                        ? 'Recoger en establecimiento'
                        : getCompleteAddress(order.direccionEntrega)}
                    </p>
                  </div>
                )}

                {/* Estado de entrega */}
                {(order as any).entrega?.confirmada && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex items-center">
                      <span className="text-green-600 mr-2">✅</span>
                      <span className="text-sm font-medium text-green-800">
                        Entrega confirmada el {new Date((order as any).entrega.fechaConfirmacion).toLocaleDateString('es-CO')}
                      </span>
                      {(order as any).entrega?.calificacionEntrega && (
                        <span className="ml-2 text-sm text-green-600">
                          {'⭐'.repeat((order as any).entrega.calificacionEntrega)}
                        </span>
                      )}
                    </div>
                    {(order as any).entrega?.comentarioCliente && (
                      <p className="text-sm text-green-700 mt-1">
                        "{(order as any).entrega.comentarioCliente}"
                      </p>
                    )}
                  </div>
                )}

                {/* Acciones */}
                <div className="mt-4 border-t pt-4">
                  <div className="flex flex-wrap gap-3 justify-between items-center">
                    <div className="flex flex-wrap gap-3">
                      <Link
                        to={`/orders/${order._id}`}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Ver detalles
                      </Link>
                      
                      {/* Botón de confirmar entrega */}
                      {canConfirmDelivery(order) && (
                        <button
                          onClick={() => setShowDeliveryConfirmation(order)}
                          className="bg-green-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-green-700 transition-colors"
                        >
                          ✅ Confirmar Entrega
                        </button>
                      )}
                      
                      {/* Botones de reseñas */}
                      {canReviewProducts(order) && (
                        <div className="flex flex-wrap gap-2">
                          {order.productos.map((item) => {
                            const productId = typeof item.producto === 'string' ? item.producto : (item.producto._id || '');
                            const productName = typeof item.producto === 'string' 
                              ? (item as any).nombre 
                              : (item.producto?.nombre || (item as any).nombre);
                            
                            return (
                              <button
                                key={productId}
                                onClick={() => openReviewForm(order, productId, productName)}
                                className="bg-yellow-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-yellow-700 transition-colors"
                              >
                                ⭐ Reseñar: {productName}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    
                    {order.estado === 'pendiente' && (
                      <button className="text-red-600 hover:text-red-800 text-sm font-medium">
                        Cancelar pedido
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-4xl">📦</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No tienes pedidos aún</h3>
            <p className="text-gray-600 mb-6">
              ¡Explora nuestro catálogo y realiza tu primera compra!
            </p>
            <Link
              to="/productos"
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Explorar productos
            </Link>
          </div>
        )}
      </div>

      {/* Paginación */}
      {pagination.totalPaginas > 1 && (
        <div className="flex justify-center items-center space-x-2">
          <button
            onClick={() => handlePageChange(pagination.paginaActual - 1)}
            disabled={pagination.paginaActual === 1}
            className="px-3 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Anterior
          </button>
          
          {Array.from({ length: Math.min(5, pagination.totalPaginas) }, (_, i) => {
            const page = i + 1;
            return (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`px-3 py-2 border rounded-md ${
                  pagination.paginaActual === page
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            );
          })}
          
          <button
            onClick={() => handlePageChange(pagination.paginaActual + 1)}
            disabled={pagination.paginaActual === pagination.totalPaginas}
            className="px-3 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Siguiente
          </button>
        </div>
      )}

      {/* Modales */}
      {showDeliveryConfirmation && (
        <DeliveryConfirmationForm
          order={showDeliveryConfirmation}
          onConfirmed={handleDeliveryConfirmed}
          onClose={() => setShowDeliveryConfirmation(null)}
        />
      )}

      {showReviewForm && (
        <ReviewForm
          order={showReviewForm.order}
          productId={showReviewForm.productId}
          productName={showReviewForm.productName}
          onReviewSubmitted={handleReviewSubmitted}
          onClose={() => setShowReviewForm(null)}
        />
      )}
    </div>
  );
};

export default OrdersPage; 