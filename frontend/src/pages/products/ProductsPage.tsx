import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useNotifications } from '../../components/ui/NotificationContainer';
import categoryService from '../../services/categoryService';
import { productService } from '../../services/productService';
import { useCartStore } from '../../stores/cartStore';
import { Category, Product, ProductFilters } from '../../types';
import { getFirstImageUrl, handleImageError } from '../../utils/imageUtils';

// Tipo para la respuesta de la API
interface ApiResponse {
  datos?: Product[];
  paginacion?: {
    paginaActual: number;
    totalPaginas: number;
    totalElementos: number;
    elementosPorPagina: number;
  };
}

const ProductsPage: React.FC = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotifications();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Filtros sin paginación
  const [filters, setFilters] = useState<ProductFilters>({
    q: '',
    categoria: '',
    precioMin: undefined,
    precioMax: undefined,
    ordenar: 'fecha-desc',
    page: 1,
    limit: 15 // Mostrar 15 productos por carga (5 filas de 3 columnas)
  });
  const [showFilters, setShowFilters] = useState(false);

  const loadData = useCallback(async (isLoadMore = false) => {
    try {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      
      // Usar filtros con la página actual
      const currentFilters = {
        ...filters,
        page: isLoadMore ? currentPage + 1 : 1
      };
      
      const response = await productService.getProducts(currentFilters);
      
      // Manejar respuesta del backend
      if (response && typeof response === 'object') {
        let newProducts: Product[] = [];
        let totalElementos = 0;
        
        if (Array.isArray(response)) {
          newProducts = response;
        } else if ('datos' in response) {
          const apiResponse = response as ApiResponse;
          if (apiResponse.datos && Array.isArray(apiResponse.datos)) {
            newProducts = apiResponse.datos;
            if (apiResponse.paginacion) {
              totalElementos = apiResponse.paginacion.totalElementos;
            }
          }
        }
        
        if (isLoadMore) {
          setProducts(prev => [...prev, ...newProducts]);
          setCurrentPage(prev => prev + 1);
        } else {
          setProducts(newProducts);
          setCurrentPage(1);
        }
        
        // Verificar si hay más productos para cargar
        const totalLoaded = isLoadMore ? products.length + newProducts.length : newProducts.length;
        setHasMore(totalLoaded < totalElementos);
      }
      
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando productos');
      if (!isLoadMore) {
        setProducts([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filters, currentPage, products.length]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const response = await categoryService.getActiveCategories();
      
      if (response && Array.isArray(response)) {
        setCategories(response);
      } else {
        setCategories([]);
      }
    } catch (err) {
      console.error('Error cargando categorías:', err);
      setCategories([]);
    }
  };

  const { addToCart } = useCartStore();

  const handleAddToCart = async (productId: string) => {
    try {
      await addToCart(productId, 1);
      showSuccess(
        '¡Producto agregado!',
        'El producto se ha añadido al carrito exitosamente',
        {
          label: 'Ver carrito',
          onClick: () => navigate('/carrito')
        }
      );
    } catch (err) {
      showError('Error', err instanceof Error ? err.message : 'Error agregando al carrito');
    }
  };

  const handleFilterChange = (key: keyof ProductFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1
    }));
    setCurrentPage(1);
    setHasMore(true);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadData(true);
    }
  };

  const clearFilters = () => {
    setFilters({
      q: '',
      categoria: '',
      precioMin: undefined,
      precioMax: undefined,
      ordenar: 'fecha-desc',
      page: 1,
      limit: 15
    });
    setCurrentPage(1);
    setHasMore(true);
  };

  const getCategoryName = (categoryId: string) => {
    if (!categories || !Array.isArray(categories)) return 'Sin categoría';
    const category = categories.find(cat => cat._id === categoryId);
    return category?.nombre || 'Sin categoría';
  };

  if (loading && products.length === 0) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header mejorado */}
      <div className="bg-gradient-to-r from-[#0d8e76] to-[#1c3a35] text-white shadow-lg">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold mb-2">Catálogo de Productos</h1>
              <p className="text-blue-100 text-lg">
                {products.length > 0 
                  ? `${products.length} productos mostrados`
                  : 'Cargando productos...'
                }
              </p>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="md:hidden bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-lg hover:bg-white/30 flex items-center space-x-2 transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
              </svg>
              <span>Filtros</span>
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 pb-16">

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-6 gap-8">
        {/* Filtros mejorados - 2 columnas de ancho a la izquierda */}
        <div className={`lg:col-span-2 ${showFilters ? 'block' : 'hidden lg:block'}`}>
          <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 space-y-6 lg:sticky lg:top-24 max-h-[calc(100vh-120px)] overflow-y-auto">
            <div className="flex justify-between items-center pb-4 border-b border-gray-100">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gradient-to-br from-[#f2902f] to-[#0d8e76] rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900">Filtros</h3>
              </div>
              <button
                onClick={clearFilters}
                className="text-sm font-medium text-[#0d8e76] hover:text-[#1c3a35] px-3 py-1 rounded-lg hover:bg-[#0d8e76]/10 transition-colors"
              >
                Limpiar todo
              </button>
            </div>

            {/* Búsqueda */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                🔍 Buscar productos
              </label>
              <input
                type="text"
                value={filters.q || ''}
                onChange={(e) => handleFilterChange('q', e.target.value)}
                className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Nombre del producto..."
              />
            </div>

            {/* Categoría */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                🏷️ Categoría
              </label>
              <select
                value={filters.categoria || ''}
                onChange={(e) => handleFilterChange('categoria', e.target.value)}
                className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
              >
                <option value="">Todas las categorías</option>
                {categories && Array.isArray(categories) && categories.map(category => (
                  <option key={category._id} value={category._id}>
                    {category.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Rango de precios */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                💰 Rango de precio
              </label>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  value={filters.precioMin || ''}
                  onChange={(e) => handleFilterChange('precioMin', e.target.value ? Number(e.target.value) : undefined)}
                  className="px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Mín"
                />
                <input
                  type="number"
                  value={filters.precioMax || ''}
                  onChange={(e) => handleFilterChange('precioMax', e.target.value ? Number(e.target.value) : undefined)}
                  className="px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Máx"
                />
              </div>
            </div>

            {/* Ordenar */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                🔄 Ordenar por
              </label>
              <select
                value={filters.ordenar || 'fecha-desc'}
                onChange={(e) => handleFilterChange('ordenar', e.target.value)}
                className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
              >
                <option value="fecha-desc">Más recientes</option>
                <option value="fecha-asc">Más antiguos</option>
                <option value="precio-asc">Precio: menor a mayor</option>
                <option value="precio-desc">Precio: mayor a menor</option>
                <option value="popular">Más populares</option>
                <option value="calificacion">Mejor calificados</option>
              </select>
            </div>
          </div>
        </div>

        {/* Productos */}
        <div className="lg:col-span-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : products && Array.isArray(products) && products.length > 0 ? (
            <>
              {/* Grid de productos en 3 columnas */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                  <div key={product._id} className="group bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100">
                    <div className="relative h-64 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                      <img
                        src={getFirstImageUrl(product.imagenes)}
                        alt={product.nombre}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        onError={handleImageError}
                        loading="lazy"
                      />
                      {product.tags && product.tags.includes('oferta') && (
                        <div className="absolute top-3 left-3 bg-gradient-to-r from-red-500 to-pink-500 text-white px-3 py-1 text-xs font-bold rounded-full shadow-lg">
                          🔥 OFERTA
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                    </div>
                    
                    <div className="p-6">
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-[#0d8e76] bg-[#0d8e76]/10 px-3 py-1 rounded-full">
                            {getCategoryName(typeof product.categoria === 'string' ? product.categoria : product.categoria?._id || '')}
                          </span>
                          {product.estadisticas && (
                            <div className="flex items-center">
                              <svg className="w-4 h-4 text-yellow-400 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                              </svg>
                              <span className="text-sm text-gray-600 font-medium">
                                {product.estadisticas.calificacionPromedio?.toFixed(1) || '0.0'}
                              </span>
                            </div>
                          )}
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-[#f2902f] transition-colors leading-tight">
                          {product.nombre}
                        </h3>
                        <p className="text-gray-600 text-sm line-clamp-2 leading-relaxed">
                          {product.descripcion}
                        </p>
                      </div>
                      
                      <div className="mb-4">
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-bold text-green-600">
                            ${product.precio?.toLocaleString('es-CO') || '0'}
                          </span>
                          <div className="text-right">
                            <div className={`text-sm font-medium ${product.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>
                              {product.stock > 0 ? `${product.stock} disponibles` : 'Sin stock'}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/productos/${product._id}`)}
                          className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors duration-200 flex items-center justify-center"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Ver
                        </button>
                        
                        <button
                          onClick={() => handleAddToCart(product._id)}
                          disabled={product.stock === 0}
                          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-xl text-sm font-medium hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center shadow-lg"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m-.4-2L3 3m0 0h0m4 10v6a1 1 0 001 1h12a1 1 0 001-1v-6a1 1 0 00-1-1H8a1 1 0 00-1 1z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Botón "Cargar más" */}
              {hasMore && (
                <div className="mt-12 flex justify-center">
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg flex items-center space-x-2"
                  >
                    {loadingMore ? (
                      <>
                        <LoadingSpinner />
                        <span>Cargando...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                        <span>Cargar más productos</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Mensaje cuando no hay más productos */}
              {!hasMore && products.length > 0 && (
                <div className="mt-12 text-center">
                  <div className="bg-white rounded-xl shadow-lg p-8 max-w-md mx-auto">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-green-100 to-blue-100 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">¡Has visto todos los productos!</h3>
                    <p className="text-gray-600">
                      No hay más productos para mostrar. Intenta ajustar los filtros para ver más opciones.
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-xl shadow-lg p-16 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                  <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">¡Ups! No encontramos productos</h3>
                <p className="text-gray-600 mb-8 leading-relaxed">
                  No hay productos que coincidan con tus criterios de búsqueda. 
                  Intenta ajustar los filtros o explorar otras categorías.
                </p>
                <div className="space-y-4">
                  <button
                    onClick={clearFilters}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg"
                  >
                    🔄 Limpiar todos los filtros
                  </button>
                  <div className="text-sm text-gray-500">
                    O explora nuestras categorías más populares
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        </div>
      </div>
      
    </div>
  );
};

export default ProductsPage; 