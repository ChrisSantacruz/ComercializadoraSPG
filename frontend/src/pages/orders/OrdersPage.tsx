import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Order, OrderFilters, PaginatedResponse } from '../../types';
import DeliveryConfirmationForm from '../../components/forms/DeliveryConfirmationForm';
import ReviewForm from '../../components/forms/ReviewForm';
import { getImageUrl, getFirstImageUrl } from '../../utils/imageUtils';
import { getCompleteAddress } from '../../utils/addressUtils';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  CpuChipIcon,
  ClockIcon,
  CubeIcon,
  TruckIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { Button } from '../../components/ui/Button';
import { Container } from '../../components/ui/Container';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { useOrdersQuery } from '../../lib/query/hooks/useOrdersQuery';
import { queryKeys } from '../../lib/query/queryKeys';

const OrdersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<OrderFilters>({
    page: 1,
    limit: 10,
  });

  const { data, isLoading, isFetching, isError, error, refetch } = useOrdersQuery(filters);

  const orders: Order[] = data?.orders ?? [];
  const pagination = useMemo(() => {
    const p = data?.pagination as PaginatedResponse<Order>['paginacion'] | undefined;
    if (p) return p;
    return {
      paginaActual: filters.page ?? 1,
      totalPaginas: 1,
      totalElementos: orders.length,
      elementosPorPagina: filters.limit ?? 10,
    };
  }, [data?.pagination, filters.page, filters.limit, orders.length]);
  
  // Estados para modales
  const [showDeliveryConfirmation, setShowDeliveryConfirmation] = useState<Order | null>(null);
  const [showReviewForm, setShowReviewForm] = useState<{
    order: Order;
    productId: string;
    productName: string;
  } | null>(null);

  const invalidateOrders = () =>
    void queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });

  const handleDeliveryConfirmed = (confirmed: boolean) => {
    if (confirmed) invalidateOrders();
  };

  const handleReviewSubmitted = () => {
    invalidateOrders();
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

  const statusIcon = (estado: string) => {
    const cls = 'h-4 w-4 shrink-0 text-gray-600';
    switch (estado) {
      case 'pendiente':
        return <ClockIcon className={cls} aria-hidden />;
      case 'confirmado':
        return <CheckCircleIcon className={cls} aria-hidden />;
      case 'procesando':
        return <CpuChipIcon className={cls} aria-hidden />;
      case 'enviado':
        return <TruckIcon className={cls} aria-hidden />;
      case 'entregado':
        return <CubeIcon className={cls} aria-hidden />;
      case 'cancelado':
        return <XCircleIcon className={cls} aria-hidden />;
      default:
        return <ClipboardDocumentListIcon className={cls} aria-hidden />;
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

  const canConfirmDelivery = (order: Order) => {
    return order.estado === 'entregado' && !(order as any).entrega?.confirmada;
  };

  const canReviewProducts = (order: Order) => {
    return (order as any).reseñas?.puedeReseñar === true;
  };

  const openReviewForm = (order: Order, productId: string, productName: string) => {
    setShowReviewForm({ order, productId, productName });
  };

  if (isLoading && !data) {
    return (
      <Container as="main" className="space-y-6 py-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </Container>
    );
  }

  if (isError && !data) {
    return (
      <Container as="main" className="py-8">
        <ErrorState
          title="No pudimos cargar tus pedidos"
          message={error instanceof Error ? error.message : 'Error de red'}
          onRetry={() => void refetch()}
        />
      </Container>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-soft sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
              Mis pedidos
            </h1>
            <p className="mt-1 text-sm text-gray-600 sm:text-base">
              {pagination.totalElementos}{' '}
              {pagination.totalElementos === 1 ? 'pedido encontrado' : 'pedidos encontrados'}
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-shrink-0 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
              loading={isFetching}
              className="inline-flex w-full items-center justify-center gap-2 sm:w-auto"
            >
              <ArrowPathIcon className="h-4 w-4 shrink-0" aria-hidden />
              Recargar
            </Button>
            <Link
              to="/productos"
              className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-secondary-500 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-secondary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary-200 focus-visible:ring-offset-2 sm:w-auto"
            >
              Seguir comprando
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

      {isError && data && (
        <div className="rounded-lg border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-900">
          {error instanceof Error ? error.message : 'Algunos datos pueden estar desactualizados. Reintenta.'}
        </div>
      )}

      {/* Lista de pedidos */}
      <div className="space-y-4">
        {isFetching ? (
          <p className="text-xs text-gray-500" aria-live="polite">
            Actualizando lista…
          </p>
        ) : null}
        {orders && Array.isArray(orders) && orders.length > 0 ? (
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
                        <span className="mr-1 inline-flex align-middle">{statusIcon(order.estado)}</span>
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
                              src={
                                getImageUrl(item.imagen) ||
                                getFirstImageUrl(item.producto.imagenes) ||
                                '/images/default-product.svg'
                              }
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