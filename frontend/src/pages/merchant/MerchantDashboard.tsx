import React, { useState, useEffect, useCallback } from 'react';
import { DashboardStats, AnalyticsData, Order, Product } from '../../types';
import merchantService from '../../services/merchantService';
import reviewService from '../../services/reviewService';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import TopProductsWidget from '../../components/dashboard/TopProductsWidget';

const MerchantDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realOrders, setRealOrders] = useState<Order[]>([]);
  const [reviewStats, setReviewStats] = useState<{
    totalReseñas: number;
    calificacionPromedio: number;
    distribucionCalificaciones: { [key: number]: number };
    reseñasRecientes: any[];
  } | null>(null);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [merchantProducts, setMerchantProducts] = useState<Product[]>([]);
  const [dashboardMetrics, setDashboardMetrics] = useState<{
    ingresosMensuales: number;
    crecimientoMensual: number;
    pedidosEnTransito: number;
    productosAgotados: number;
    tasaConfirmacion: number;
    clientesNuevos: number;
  } | null>(null);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Cargar datos reales del comerciante
      console.log('📊 Cargando datos reales del dashboard...');
      
      const [statsData, analyticsData] = await Promise.all([
        merchantService.getDashboardStats(),
        merchantService.getAnalytics('30d')
      ]);
      
      setStats(statsData);
      setAnalytics(analyticsData);
      
      // Cargar datos adicionales si están disponibles
      try {
        const [ordersResponse, productsResponse, reviewStatsResponse] = await Promise.all([
          merchantService.getOrders({ limit: 1000 }),
          merchantService.getProducts({ limit: 1000 }),
          reviewService.getMerchantReviewStats()
        ]);
        
        setRealOrders(ordersResponse.datos || []);
        setReviewStats(reviewStatsResponse);
        setMerchantProducts(productsResponse.datos || []);
        
        // Calcular métricas adicionales
        const ordenes = (ordersResponse.datos || []) as any[];
        const products = (productsResponse.datos || []) as any[];
        
        const fechaLimite = new Date();
        fechaLimite.setDate(fechaLimite.getDate() - 30);
        const ordenesDelMes = ordenes.filter((o: any) => new Date(o.fechaCreacion) >= fechaLimite);
        const ventasDelMes = ordenesDelMes.reduce((sum: number, order: any) => sum + (order.total || 0), 0);
        
        const productosAgotados = products.filter((p: any) => p.stock === 0).length;
        const pedidosEnTransito = ordenes.filter((o: any) => 
          ['pendiente', 'procesando', 'enviado'].includes(o.estado)
        ).length;
        
        const pedidosEntregados = ordenes.filter((o: any) => o.estado === 'entregado').length;
        const tasaConfirmacion = pedidosEntregados > 0 ? 
          (pedidosEntregados / (pedidosEntregados + pedidosEnTransito)) * 100 : 0;
        
        const clientesDelMes = new Set(
          ordenesDelMes.map((o: any) => o.cliente?.toString() || o.cliente)
        ).size;
        
        // Calcular productos más vendidos
        const productStats: { [key: string]: { producto: any, cantidadVendida: number, ingresosTotales: number } } = {};
        
        ordenes.forEach((order: any) => {
          if (order.productos && Array.isArray(order.productos)) {
            order.productos.forEach((item: any) => {
              const productId = item.producto?._id || item.producto;
              if (productId && typeof item.producto === 'object') {
                if (!productStats[productId]) {
                  productStats[productId] = {
                    producto: item.producto,
                    cantidadVendida: 0,
                    ingresosTotales: 0
                  };
                }
                productStats[productId].cantidadVendida += item.cantidad || 1;
                productStats[productId].ingresosTotales += (item.precio || 0) * (item.cantidad || 1);
              }
            });
          }
        });
        
        const topProductsArray = Object.values(productStats)
          .filter(stat => stat.producto && typeof stat.producto === 'object')
          .sort((a, b) => b.cantidadVendida - a.cantidadVendida);
        
        setTopProducts(topProductsArray);
        
        // Actualizar métricas del dashboard
        setDashboardMetrics({
          ingresosMensuales: ventasDelMes,
          crecimientoMensual: 0, // Se calcularía con datos del mes anterior
          pedidosEnTransito,
          productosAgotados,
          tasaConfirmacion,
          clientesNuevos: clientesDelMes
        });
        
      } catch (additionalDataError) {
        console.warn('⚠️ Error cargando datos adicionales:', additionalDataError);
      }
      
      setError(null);
    } catch (err) {
      console.error('❌ Error cargando datos del dashboard:', err);
      setError(err instanceof Error ? err.message : 'Error cargando datos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="bg-white shadow-sm rounded-lg p-6">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Comerciante</h1>
        <p className="text-gray-600 mt-2">Gestiona tu negocio y analiza tus ventas</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Métricas principales mejoradas */}
      {dashboardMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Pedidos en Tránsito</p>
                <p className="text-2xl font-bold">{dashboardMetrics.pedidosEnTransito}</p>
                <p className="text-blue-100 text-sm">Requieren atención</p>
              </div>
              <div className="text-3xl">🚚</div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Productos Agotados</p>
                <p className="text-2xl font-bold">{dashboardMetrics.productosAgotados}</p>
                <p className="text-purple-100 text-sm">Necesitan restock</p>
              </div>
              <div className="text-3xl">📦</div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-sm font-medium">Tasa Confirmación</p>
                <p className="text-2xl font-bold">{dashboardMetrics.tasaConfirmacion.toFixed(1)}%</p>
                <p className="text-yellow-100 text-sm">Entregas confirmadas</p>
              </div>
              <div className="text-3xl">✅</div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-indigo-100 text-sm font-medium">Clientes Únicos</p>
                <p className="text-2xl font-bold">{dashboardMetrics.clientesNuevos}</p>
                <p className="text-indigo-100 text-sm">Este mes</p>
              </div>
              <div className="text-3xl">👥</div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-pink-100 text-sm font-medium">Total Productos</p>
                <p className="text-2xl font-bold">{merchantProducts.length}</p>
                <p className="text-pink-100 text-sm">En tu catálogo</p>
              </div>
              <div className="text-3xl">🛍️</div>
            </div>
          </div>
        </div>
      )}

      {/* Perfil del Vendedor y Productos Publicados */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Perfil del Vendedor */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <span className="text-3xl mr-3">👤</span>
              Mi Perfil de Vendedor
            </h2>
            <button
              onClick={() => window.location.href = '/profile'}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Editar Perfil
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  {stats?.resumenGeneral ? stats.resumenGeneral.totalProductos : '0'}
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">Productos Activos</h3>
                <p className="text-gray-600">Total de productos en tu catálogo</p>
              </div>
            </div>

            <div className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  {stats?.resumenGeneral ? stats.resumenGeneral.pedidosDelMes : '0'}
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">Pedidos Este Mes</h3>
                <p className="text-gray-600">Ventas realizadas en los últimos 30 días</p>
              </div>
            </div>

            {reviewStats && (
              <div className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                    {reviewStats.calificacionPromedio.toFixed(1)}
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">Calificación Promedio</h3>
                  <p className="text-gray-600">{reviewStats.totalReseñas} reseñas de clientes</p>
                  <div className="flex items-center mt-1">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className={`w-5 h-5 ${
                          i < Math.round(reviewStats.calificacionPromedio)
                            ? 'text-yellow-400'
                            : 'text-gray-300'
                        }`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Productos Publicados */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <span className="text-3xl mr-3">📦</span>
              Mis Productos
            </h2>
            <button
              onClick={() => window.location.href = '/merchant/products/new'}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Nuevo Producto</span>
            </button>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {merchantProducts && merchantProducts.length > 0 ? (
              merchantProducts.slice(0, 5).map((producto) => (
                <div
                  key={producto._id}
                  className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => window.location.href = `/productos/${producto._id}`}
                >
                  <div className="flex-shrink-0">
                    {producto.imagenes && producto.imagenes.length > 0 ? (
                      <img
                        src={producto.imagenes[0]}
                        alt={producto.nombre}
                        className="w-16 h-16 object-cover rounded-lg"
                        onError={(e) => {
                          e.currentTarget.src = '/images/placeholder-product.png';
                        }}
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                        <span className="text-gray-400 text-2xl">📷</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">
                      {producto.nombre}
                    </h3>
                    <p className="text-sm text-gray-600">
                      ${producto.precio.toLocaleString('es-CO')}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        producto.stock > 10
                          ? 'bg-green-100 text-green-800'
                          : producto.stock > 0
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        Stock: {producto.stock}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">Aún no tienes productos publicados</p>
                <button
                  onClick={() => window.location.href = '/merchant/products/new'}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Publicar mi primer producto
                </button>
              </div>
            )}

            {merchantProducts && merchantProducts.length > 5 && (
              <button
                onClick={() => window.location.href = '/merchant/products'}
                className="w-full py-2 text-center text-blue-600 hover:text-blue-800 font-medium text-sm"
              >
                Ver todos los productos ({merchantProducts.length})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Alert de confirmaciones pendientes */}
      {realOrders.some(o => o.estado === 'entregado' && !(o as any).entrega?.confirmada) && (
        <div className="bg-gradient-to-r from-orange-50 to-orange-100 border-l-4 border-orange-400 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-orange-400 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-orange-800">
                  ⚠️ Entregas Pendientes de Confirmación
                </h3>
                <p className="text-orange-700">
                  Tienes {realOrders.filter(o => o.estado === 'entregado' && !(o as any).entrega?.confirmada).length} pedidos entregados esperando confirmación del cliente
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-orange-600">
                {realOrders.filter(o => o.estado === 'entregado' && !(o as any).entrega?.confirmada).length}
              </div>
              <p className="text-sm text-orange-600">Pendientes</p>
            </div>
          </div>
        </div>
      )}

      {stats && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Productos</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.resumenGeneral.totalProductos}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Pedidos del Mes</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.resumenGeneral.pedidosDelMes}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Ventas del Mes</p>
                  <p className="text-2xl font-semibold text-gray-900">${stats.resumenGeneral.ventasDelMes?.toLocaleString('es-CO') || '0'}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Reseñas Totales</p>
                  <div className="flex items-center space-x-2">
                    <p className="text-2xl font-semibold text-gray-900">{reviewStats?.totalReseñas || 0}</p>
                    {reviewStats && reviewStats.calificacionPromedio > 0 && (
                      <div className="flex items-center">
                        <span className="text-yellow-400">⭐</span>
                        <span className="text-sm font-medium text-gray-600">
                          {reviewStats.calificacionPromedio.toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Nueva sección: Entregas y Reseñas */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Estado de Entregas</h3>
              {realOrders.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Entregados</span>
                    <span className="font-medium text-blue-600">
                      {realOrders.filter(o => o.estado === 'entregado').length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Confirmados por cliente</span>
                    <span className="font-medium text-green-600">
                      {realOrders.filter(o => (o as any).entrega?.confirmada).length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Pendientes confirmación</span>
                    <span className="font-medium text-orange-600">
                      {realOrders.filter(o => o.estado === 'entregado' && !(o as any).entrega?.confirmada).length}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No hay datos de entregas</p>
              )}
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Reseñas</h3>
              {reviewStats && reviewStats.totalReseñas > 0 ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total reseñas</span>
                    <span className="font-medium text-gray-900">{reviewStats.totalReseñas}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Promedio</span>
                    <div className="flex items-center">
                      <span className="font-medium text-gray-900 mr-1">
                        {reviewStats.calificacionPromedio.toFixed(1)}
                      </span>
                      <span className="text-yellow-400">⭐</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {[5, 4, 3, 2, 1].map(rating => (
                      <div key={rating} className="flex items-center text-xs">
                        <span className="w-3">{rating}</span>
                        <span className="text-yellow-400 mx-1">⭐</span>
                        <div className="flex-1 h-2 bg-gray-200 rounded mx-2">
                          <div 
                            className="h-2 bg-yellow-400 rounded"
                            style={{
                              width: `${((reviewStats.distribucionCalificaciones[rating] || 0) / reviewStats.totalReseñas) * 100}%`
                            }}
                          />
                        </div>
                        <span className="w-6 text-right">{reviewStats.distribucionCalificaciones[rating] || 0}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No hay reseñas aún</p>
              )}
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Reseñas Recientes</h3>
              {reviewStats && reviewStats.reseñasRecientes.length > 0 ? (
                <div className="space-y-3">
                  {reviewStats.reseñasRecientes.slice(0, 3).map((review, index) => (
                    <div key={index} className="border-b border-gray-100 pb-2 last:border-b-0">
                      <div className="flex items-center mb-1">
                        <div className="flex text-yellow-400 text-sm">
                          {'⭐'.repeat(review.calificacion)}
                        </div>
                        <span className="text-xs text-gray-500 ml-2">
                          {new Date(review.fechaCreacion).toLocaleDateString('es-CO')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 line-clamp-2">
                        {review.comentario}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No hay reseñas recientes</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TopProductsWidget 
              topProducts={topProducts} 
              loading={loading}
            />

            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen de Ventas</h3>
              {analytics?.resumen ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Pedidos</span>
                    <span className="text-lg font-semibold text-gray-900">{analytics.resumen.totalPedidos}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Ingresos Totales</span>
                    <span className="text-lg font-semibold text-green-600">${analytics.resumen.totalIngresos.toLocaleString('es-CO')}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Promedio Diario</span>
                    <span className="text-lg font-semibold text-blue-600">${analytics.resumen.promedioVentaDiaria}</span>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">Cargando resumen...</p>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Acciones Rápidas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                onClick={() => window.location.href = '/merchant/products'}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center"
              >
                <svg className="w-8 h-8 text-blue-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <p className="text-sm font-medium text-gray-900">Mis Productos</p>
              </button>

              <button
                onClick={() => window.location.href = '/merchant/orders'}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center"
              >
                <svg className="w-8 h-8 text-green-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <p className="text-sm font-medium text-gray-900">Pedidos</p>
              </button>

              <button
                onClick={() => window.location.href = '/merchant/products/new'}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center"
              >
                <svg className="w-8 h-8 text-purple-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <p className="text-sm font-medium text-gray-900">Nuevo Producto</p>
              </button>

              <button
                onClick={() => loadDashboardData()}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center"
              >
                <svg className="w-8 h-8 text-yellow-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <p className="text-sm font-medium text-gray-900">Actualizar</p>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MerchantDashboard; 