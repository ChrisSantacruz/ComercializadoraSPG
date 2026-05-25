import React, { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Product } from '../../types';
import { useCartStore } from '../../stores/cartStore';
import { useNotifications } from '../../components/ui/NotificationContainer';
import { Container } from '../../components/ui/Container';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { ProductCard } from '../../components/products/ProductCard';
import { ProductCatalogSkeleton } from '../../components/products/ProductCatalogSkeleton';
import { ProductFiltersPanel } from '../../components/products/ProductFiltersPanel';
import { useProductsCatalog } from '../../hooks/useProductsCatalog';
import { FunnelIcon } from '@heroicons/react/24/outline';
import { SeoHead } from '../../components/seo/SeoHead';
import { getApiErrorMessage } from '../../lib/apiErrors';

const ProductsPage: React.FC = () => {
  const navigate = useNavigate();
  const { showError } = useNotifications();
  const { addToCart } = useCartStore();
  const {
    products,
    loading,
    loadingMore,
    error,
    hasMore,
    categories,
    categoriesError,
    filters,
    qInput,
    setQInput,
    handleFilterChange,
    clearFilters,
    loadMore,
    showFilters,
    setShowFilters,
  } = useProductsCatalog();

  const categoryNameById = useMemo(() => {
    const m = new Map<string, string>();
    categories.forEach((c) => m.set(c._id, c.nombre));
    return m;
  }, [categories]);

  const labelForProduct = useCallback(
    (p: Product) => {
      const id = typeof p.categoria === 'string' ? p.categoria : p.categoria?._id;
      if (!id) return 'Categoría';
      return categoryNameById.get(id) ?? 'Categoría';
    },
    [categoryNameById],
  );

  const handleAddToCart = useCallback(
    async (product: Product) => {
      try {
        await addToCart(product._id, 1, {
          successMessage: `${product.nombre} se agregó al carrito`,
          action: {
            label: 'Ver carrito',
            onClick: () => navigate('/carrito'),
          },
        });
      } catch (e) {
        showError('Carrito', getApiErrorMessage(e, 'No se pudo agregar al carrito.'));
      }
    },
    [addToCart, navigate, showError],
  );

  return (
    <div className="min-w-0 bg-gray-50 pb-16 pt-6 sm:pt-8">
      <SeoHead
        title="Catálogo de productos"
        description="Explora inventario aprobado con filtros compartibles por URL: categoría, precio y ordenación."
      />
      <Container>
        <PageHeader
          title="Catálogo"
          description="Listado público con filtros persistentes en la URL para compartir y auditar."
          className="mb-8"
        />

        {error ? (
          <div className="mb-6">
            <ErrorState title="No pudimos cargar el catálogo" message={error} />
          </div>
        ) : null}

        <div className="mb-4 flex items-center justify-between lg:hidden">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setShowFilters((v) => !v)}
            aria-expanded={showFilters}
          >
            <FunnelIcon className="h-4 w-4" aria-hidden />
            Filtros
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-6">
          <aside
            className={`lg:col-span-2 ${showFilters ? 'block' : 'hidden lg:block'}`}
            aria-label="Filtros del catálogo"
          >
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-soft sm:p-6 lg:sticky lg:top-28 lg:max-h-[min(calc(100dvh-7rem),calc(100vh-8rem))] lg:overflow-y-auto">
              <ProductFiltersPanel
                filters={filters}
                qInput={qInput}
                onQChange={setQInput}
                categories={categories}
                categoriesError={categoriesError}
                onChange={handleFilterChange}
                onClear={clearFilters}
                onCloseMobile={() => setShowFilters(false)}
              />
            </div>
          </aside>

          <div className="min-w-0 lg:col-span-4">
            {loading && products.length === 0 ? <ProductCatalogSkeleton count={6} /> : null}

            {!loading && products.length > 0 ? (
              <>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {products.map((product, idx) => (
                    <ProductCard
                      key={product._id}
                      product={product}
                      variant="grid"
                      categoryLabel={labelForProduct(product)}
                      imagePriority={idx < 6 ? 'high' : 'low'}
                      onAddToCart={handleAddToCart}
                    />
                  ))}
                </div>

                {hasMore ? (
                  <div className="mt-10 flex justify-center">
                    <Button type="button" variant="secondary" onClick={loadMore} disabled={loadingMore} loading={loadingMore}>
                      Cargar más
                    </Button>
                  </div>
                ) : (
                  <p className="mt-10 text-center text-sm text-gray-500">Fin del listado con los filtros actuales.</p>
                )}
              </>
            ) : null}

            {!loading && products.length === 0 && !error ? (
              <EmptyState
                title="Sin resultados"
                description="Ajusta filtros o limpia la búsqueda para ampliar el universo de productos."
                actionLabel="Limpiar filtros"
                onAction={clearFilters}
              />
            ) : null}
          </div>
        </div>
      </Container>

    </div>
  );
};

export default ProductsPage;
