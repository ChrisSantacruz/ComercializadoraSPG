import React, { useState, useEffect, useCallback } from 'react';
import { Product, Category } from '../../types';
import merchantService from '../../services/merchantService';
import { loadActiveCategories } from '../../lib/data/activeCategoriesResource';
import ProductForm from '../../components/forms/ProductForm';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { getFirstImageUrl } from '../../utils/imageUtils';
import ProductImage from '../../components/ui/ProductImage';

const MerchantProducts: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [createdProduct, setCreatedProduct] = useState<Product | null>(null);
  const [filters, setFilters] = useState({
    q: '',
    estado: '',
    categoria: '',
    page: 1,
    limit: 10
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [productsResponse, categoriesResponse] = await Promise.all([
        merchantService.getProducts(filters),
        loadActiveCategories()
      ]);
      
      setProducts(productsResponse?.datos || []);
      setCategories(categoriesResponse || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando productos');
      setProducts([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateProduct = async (formData: FormData) => {
    try {
      setActionLoading(true);
      setError(null);
      const newProduct = await merchantService.createProduct(formData);
      setCreatedProduct(newProduct);
      setSuccessMessage('Producto creado. Quedó pendiente de revisión antes de publicarse.');
      await loadData();
      setShowForm(false);
      
      // Auto-ocultar mensaje después de 5 segundos
      setTimeout(() => {
        setSuccessMessage(null);
        setCreatedProduct(null);
      }, 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creando producto');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateProduct = async (formData: FormData) => {
    if (!editingProduct) return;
    
    try {
      setActionLoading(true);
      await merchantService.updateProduct(editingProduct._id, formData);
      await loadData();
      setEditingProduct(null);
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error actualizando producto');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este producto?')) return;
    
    try {
      setActionLoading(true);
      await merchantService.deleteProduct(productId);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error eliminando producto');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (estado: string) => {
    const styles = {
      approved: 'bg-green-100 text-green-800',
      aprobado: 'bg-green-100 text-green-800',
      pending: 'bg-amber-100 text-amber-800',
      pendiente: 'bg-amber-100 text-amber-800',
      rejected: 'bg-red-100 text-red-800',
      rechazado: 'bg-red-100 text-red-800',
      suspended: 'bg-gray-200 text-gray-800',
      suspendido: 'bg-gray-200 text-gray-800',
      pausado: 'bg-yellow-100 text-yellow-800',
      agotado: 'bg-red-100 text-red-800'
    };
    const labels: Record<string, string> = {
      approved: 'Aprobado',
      aprobado: 'Aprobado',
      pending: 'Pendiente',
      pendiente: 'Pendiente',
      rejected: 'Rechazado',
      rechazado: 'Rechazado',
      suspended: 'Suspendido',
      suspendido: 'Suspendido',
      pausado: 'Pausado',
      agotado: 'Agotado',
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[estado as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
        {labels[estado] || estado.charAt(0).toUpperCase() + estado.slice(1)}
      </span>
    );
  };

  const getCategoryName = (categoryId: string) => {
    if (!categories || !Array.isArray(categories)) return 'Sin categoría';
    const category = categories.find(cat => cat._id === categoryId);
    return category?.nombre || 'Sin categoría';
  };

  if (loading) return <LoadingSpinner />;

  if (showForm) {
    return (
      <ProductForm
        product={editingProduct || undefined}
        onSubmit={editingProduct ? handleUpdateProduct : handleCreateProduct}
        onCancel={() => {
          setShowForm(false);
          setEditingProduct(null);
        }}
        isLoading={actionLoading}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Mis Productos</h1>
            <p className="text-gray-600 mt-2">Gestiona tu catálogo de productos</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Nuevo Producto</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium">{successMessage}</p>
              {createdProduct && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => window.open(`/productos/${createdProduct._id}`, '_blank')}
                    className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors"
                  >
                    Ver Producto
                  </button>
                  <button
                    onClick={() => {
                      setShowForm(true);
                      setSuccessMessage(null);
                      setCreatedProduct(null);
                    }}
                    className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
                  >
                    Crear Otro Producto
                  </button>
                  <button
                    onClick={() => {
                      setSuccessMessage(null);
                      setCreatedProduct(null);
                    }}
                    className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700 transition-colors"
                  >
                    Cerrar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Buscar</label>
            <input
              type="text"
              value={filters.q}
              onChange={(e) => setFilters({...filters, q: e.target.value, page: 1})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Buscar productos..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
            <select
              value={filters.estado}
              onChange={(e) => setFilters({...filters, estado: e.target.value, page: 1})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los estados</option>
              <option value="pending">Pendiente</option>
              <option value="approved">Aprobado</option>
              <option value="rejected">Rechazado</option>
              <option value="suspended">Suspendido</option>
              <option value="aprobado">Aprobado</option>
              <option value="pausado">Pausado</option>
              <option value="agotado">Agotado</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Categoría</label>
            <select
              value={filters.categoria}
              onChange={(e) => setFilters({...filters, categoria: e.target.value, page: 1})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas las categorías</option>
              {categories && Array.isArray(categories) && categories.map(category => (
                <option key={category._id} value={category._id}>
                  {category.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => setFilters({q: '', estado: '', categoria: '', page: 1, limit: 10})}
              className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Limpiar Filtros
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products && Array.isArray(products) && products.filter(product => product && product._id).map((product) => (
          <div key={product._id} className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="relative h-48 bg-gray-200">
              <ProductImage
                src={getFirstImageUrl(product.imagenes)}
                alt={product.nombre}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute top-2 right-2">
                {getStatusBadge(product.estado)}
              </div>
            </div>
            
            <div className="p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2 truncate">
                {product.nombre}
              </h3>
              <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                {product.descripcion}
              </p>
              
              <div className="flex justify-between items-center mb-3">
                <span className="text-xl font-bold text-green-600">
                  ${product.precio.toLocaleString('es-CO')}
                </span>
                <span className="text-sm text-gray-500">
                  Stock: {product.stock}
                </span>
              </div>
              
              <div className="text-xs text-gray-500 mb-3">
                {product.categoria ? getCategoryName(typeof product.categoria === 'string' ? product.categoria : product.categoria?._id || 'Sin categoría') : 'Sin categoría'}
              </div>
              {product.moderacion?.razonRechazo ? (
                <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  Razón de rechazo: {product.moderacion.razonRechazo}
                </div>
              ) : null}
              
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setEditingProduct(product);
                    setShowForm(true);
                  }}
                  className="flex-1 bg-blue-600 text-white py-2 px-3 rounded-md text-sm hover:bg-blue-700"
                >
                  <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Editar
                </button>
                
                <button
                  onClick={() => handleDeleteProduct(product._id)}
                  disabled={actionLoading}
                  className="bg-red-600 text-white py-2 px-3 rounded-md text-sm hover:bg-red-700 disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {(!products || !Array.isArray(products) || products.length === 0) && !loading && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No tienes productos</h3>
          <p className="text-gray-500 mb-4">Comienza agregando tu primer producto para empezar a vender</p>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Crear Primer Producto
          </button>
        </div>
      )}
    </div>
  );
};

export default MerchantProducts; 