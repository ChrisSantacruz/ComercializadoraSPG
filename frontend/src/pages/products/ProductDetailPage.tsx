import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { StarIcon } from '@heroicons/react/24/solid';
import { StarIcon as StarOutlineIcon } from '@heroicons/react/24/outline';
import {
  BuildingStorefrontIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  TruckIcon,
} from '@heroicons/react/24/outline';
import { Category, type User as AppUser, type Product } from '../../types';
import { useCartStore } from '../../stores/cartStore';
import ErrorDisplay from '../../components/ui/ErrorDisplay';
import { Container } from '../../components/ui/Container';
import { Button } from '../../components/ui/Button';
import { Tabs, TabItem } from '../../components/ui/Tabs';
import { Card, CardBody } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { getFirstImageUrl, getImageUrl } from '../../utils/imageUtils';
import { ProductDetailGallery, type GalleryImage } from './ProductDetailGallery';
import { safeInt, safeMoney } from '../../lib/safeNumeric';
import { SeoHead } from '../../components/seo/SeoHead';
import { BRAND_NAME } from '../../components/nav/navData';
import { useProductDetailQuery, useRelatedProductsQuery } from '../../lib/query/hooks/useProductsQuery';
import { useCategoryQuery } from '../../lib/query/hooks/useCategoriesQuery';
import ProductImage from '../../components/ui/ProductImage';

function merchantFromProduct(product: Pick<Product, 'comerciante'>): AppUser | null {
  const c = product?.comerciante;
  if (c && typeof c === 'object' && '_id' in c && 'nombre' in c) {
    return c as AppUser;
  }
  return null;
}

function StarRating({ value, max = 5 }: { value: number; max?: number }) {
  const rounded = Math.round(Math.min(max, Math.max(0, value)));
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`Calificación ${value} de ${max}`}>
      {Array.from({ length: max }, (_, i) =>
        i < rounded ? (
          <StarIcon key={i} className="h-5 w-5 text-warning-500" aria-hidden />
        ) : (
          <StarOutlineIcon key={i} className="h-5 w-5 text-gray-300" aria-hidden />
        ),
      )}
    </span>
  );
}

const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCartStore();

  const {
    data: product,
    isLoading,
    isError,
    error: queryError,
    refetch,
  } = useProductDetailQuery(id);

  const categoryId = useMemo(() => {
    if (!product) return undefined;
    if (typeof product.categoria === 'string') return product.categoria;
    if (product.categoria && typeof product.categoria === 'object' && '_id' in product.categoria) {
      return (product.categoria as Category)._id;
    }
    return undefined;
  }, [product]);

  const needsCategoryFetch = Boolean(product && typeof product.categoria === 'string');
  const { data: fetchedCategory } = useCategoryQuery(categoryId, needsCategoryFetch);

  const category: Category | null = useMemo(() => {
    if (!product) return null;
    if (typeof product.categoria === 'object' && product.categoria) return product.categoria as Category;
    return fetchedCategory ?? null;
  }, [product, fetchedCategory]);

  const hasEmbeddedRelated = Boolean(product?.productosRelacionados && product.productosRelacionados.length > 0);
  const { data: relatedFetched, isFetching: relatedLoading } = useRelatedProductsQuery(
    id,
    categoryId,
    !hasEmbeddedRelated,
  );
  const relatedProducts = useMemo(() => {
    if (hasEmbeddedRelated && product?.productosRelacionados) return product.productosRelacionados;
    return relatedFetched ?? [];
  }, [hasEmbeddedRelated, product, relatedFetched]);

  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [tabIndex, setTabIndex] = useState(0);

  const loadProduct = () => void refetch();

  const errorMessage =
    queryError instanceof Error
      ? queryError.message
      : queryError
        ? String(queryError)
        : 'Error cargando el producto';

  useEffect(() => {
    if (!product) return;
    const stock = safeInt(product.stock, 0);
    setQuantity((q) => Math.min(Math.max(1, q), Math.max(1, stock)));
  }, [product]);

  const galleryImages: GalleryImage[] = useMemo(() => {
    if (!product) return [];
    if (!product.imagenes?.length) {
      return [{ url: getImageUrl(null), alt: product.nombre, rawSrc: null }];
    }
    return product.imagenes.map((img: string | { url?: string; alt?: string }) => {
      const raw = typeof img === 'string' ? img : img.url ?? '';
      const alt = typeof img === 'object' && img.alt ? img.alt : product.nombre;
      return { url: getImageUrl(raw), alt, rawSrc: raw || null };
    });
  }, [product]);

  const productJsonLd = useMemo(() => {
    if (!product || !id) return undefined;
    const img = getFirstImageUrl(product.imagenes);
    const stockNum = safeInt(product.stock, 0);
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.nombre,
      description: (product.descripcion || '').slice(0, 5000),
      sku: product._id,
      ...(img ? { image: [img] } : {}),
      offers: {
        '@type': 'Offer',
        priceCurrency: 'COP',
        price: String(safeMoney(product.precio)),
        availability:
          stockNum > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        ...(origin ? { url: `${origin}/productos/${id}` } : {}),
      },
    };
  }, [product, id]);

  const merchantProfile = useMemo(() => (product ? merchantFromProduct(product) : null), [product]);

  const merchantDisplayName = useMemo(() => {
    if (!product?.comerciante) return 'Comerciante';
    if (merchantProfile?.nombreEmpresa?.trim()) return merchantProfile.nombreEmpresa.trim();
    if (merchantProfile?.nombre) return merchantProfile.nombre;
    if (typeof product.comerciante === 'object' && product.comerciante && 'nombre' in product.comerciante) {
      return product.comerciante.nombre || 'Comerciante';
    }
    return 'Comerciante';
  }, [product, merchantProfile]);

  const getCategoryName = () => {
    if (category) return category.nombre;
    if (!product?.categoria) return 'Sin categoría';
    return typeof product.categoria === 'string'
      ? needsCategoryFetch && !fetchedCategory
        ? 'Cargando categoría…'
        : 'Categoría'
      : product.categoria.nombre || 'Sin categoría';
  };

  const getCategoryForBreadcrumb = () => {
    if (category) return category.nombre;
    if (!product?.categoria) return 'Sin categoría';
    return typeof product.categoria === 'string' ? 'Categoría' : product.categoria.nombre || 'Sin categoría';
  };

  const handleAddToCart = async () => {
    if (!product) return;
    const stock = safeInt(product.stock, 0);
    if (stock <= 0) return;

    try {
      setAddingToCart(true);
      await addToCart(product._id, quantity, {
        successTitle: 'Carrito',
        successMessage: `${product.nombre} · ${quantity} ${quantity === 1 ? 'unidad' : 'unidades'}`,
        action: {
          label: 'Ver carrito',
          onClick: () => navigate('/carrito'),
        },
      });
    } catch {
      /* notifyCartError en store */
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyNow = async () => {
    if (!product) return;
    const stock = safeInt(product.stock, 0);
    if (stock <= 0) return;

    try {
      setAddingToCart(true);
      await addToCart(product._id, quantity, { silent: true });
      navigate('/checkout');
    } catch {
      /* error ya notificado */
    } finally {
      setAddingToCart(false);
    }
  };

  if (!id) {
    return (
      <Container as="main" className="py-8">
        <ErrorDisplay
          error="Este enlace no es válido."
          title="Producto no disponible"
          onRetry={() => navigate('/productos')}
          redirectPath="/productos"
          redirectLabel="Ver catálogo"
        />
      </Container>
    );
  }

  if (isLoading) {
    return (
      <>
        <SeoHead
          title="Cargando producto"
          description="Obteniendo ficha de producto y disponibilidad."
          canonicalPath={id ? `/productos/${id}` : '/productos'}
        />
        <Container as="main" className="py-8">
        <div className="mb-6 flex gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <Skeleton className="aspect-square w-full rounded-xl" />
          <div className="space-y-4">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-12 w-40" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </Container>
      </>
    );
  }

  if (isError || !product) {
    const msg = !product && !isError ? 'Producto no encontrado' : errorMessage;
    const lower = msg.toLowerCase();
    const shouldAutoRedirect = !!(
      lower.includes('inválido') ||
      lower.includes('invalid') ||
      lower.includes('no encontrado') ||
      lower.includes('not found') ||
      lower.includes('no existe')
    );

    if (shouldAutoRedirect) {
      window.setTimeout(() => navigate('/productos'), 3000);
    }

    return (
      <>
        <SeoHead
          title="Producto no disponible"
          description={msg}
          canonicalPath={`/productos/${id}`}
        />
        <Container as="main" className="py-8">
          <ErrorDisplay
            error={msg}
            title="Producto no disponible"
            onRetry={loadProduct}
            redirectPath="/productos"
            redirectLabel="Ver todos los productos"
            autoRedirect={shouldAutoRedirect}
            autoRedirectDelay={3000}
          />
        </Container>
      </>
    );
  }

  const stock = safeInt(product.stock, 0);
  const price = safeMoney(product.precio);
  const reviewCount = product.estadisticasReseñas?.totalReseñas ?? 0;
  const avgReview = product.estadisticasReseñas?.promedioCalificacion ?? 0;

  const descriptionTab = (
    <div className="space-y-8 text-gray-700">
      <div>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">Descripción</h3>
        <p className="max-w-3xl leading-relaxed text-gray-800">
          {(product.descripcion || '').trim() || 'Aún no hay una descripción detallada para este producto.'}
        </p>
      </div>
      {product.especificaciones && Array.isArray(product.especificaciones) && product.especificaciones.length > 0 ? (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Especificaciones</h3>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                {product.especificaciones.map((spec, index) => (
                  <tr key={index} className="bg-white">
                    <th
                      scope="row"
                      className="w-[40%] px-4 py-3 text-left text-xs font-medium text-gray-500 sm:w-1/3 sm:px-5"
                    >
                      <span className="capitalize">{spec.nombre}</span>
                    </th>
                    <td className="px-4 py-3 text-gray-900 sm:px-5">{spec.valor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
      {product.tags && product.tags.length > 0 ? (
        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">Etiquetas</h3>
          <div className="flex flex-wrap gap-2">
            {product.tags.map((tag, index) => (
              <Badge key={index} variant="neutral">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );

  const reviewsTab = (
    <div className="space-y-6">
      {product.estadisticasReseñas && reviewCount > 0 ? (
        <>
          <Card>
            <CardBody className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-gray-500">Calificación promedio</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="text-2xl font-bold text-gray-900">{avgReview.toFixed(1)}</span>
                  <StarRating value={avgReview} />
                </div>
                <p className="mt-1 text-sm text-gray-600">{reviewCount} reseñas</p>
              </div>
              <div>
                <p className="mb-2 text-sm text-gray-500">Distribución</p>
                {[5, 4, 3, 2, 1].map((star) => {
                  const dist = product.estadisticasReseñas?.distribucionCalificaciones?.[star] ?? 0;
                  const pct = reviewCount > 0 ? (dist / reviewCount) * 100 : 0;
                  return (
                    <div key={star} className="mb-1 flex items-center text-xs">
                      <span className="w-3 text-gray-600">{star}</span>
                      <StarIcon className="mx-1 h-3.5 w-3.5 text-warning-500" aria-hidden />
                      <div className="mx-2 h-2 flex-1 rounded-full bg-gray-100">
                        <div className="h-2 rounded-full bg-primary-500 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-6 text-right text-gray-600">{dist}</span>
                    </div>
                  );
                })}
              </div>
            </CardBody>
          </Card>
          <div>
            <h3 className="mb-4 text-base font-semibold text-gray-900">Reseñas recientes</h3>
            <ul className="space-y-4">
              {product.reseñas?.map((review, idx) => (
                <li
                  key={review._id || `${review.fechaCreacion}-${idx}`}
                  className="border-b border-gray-100 pb-4 last:border-0"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <StarRating value={review.calificacion} />
                    <time className="text-xs text-gray-500" dateTime={review.fechaCreacion}>
                      {new Date(review.fechaCreacion).toLocaleDateString('es-CO')}
                    </time>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">{review.usuario?.nombre || 'Usuario'}</p>
                  <p className="mt-2 text-sm text-gray-800">{review.comentario}</p>
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : (
        <Card>
          <CardBody className="py-10 text-center text-gray-600">
            <p className="font-medium text-gray-900">Aún no hay reseñas</p>
            <p className="mt-1 text-sm">Las opiniones aparecerán aquí cuando los compradores las publiquen.</p>
          </CardBody>
        </Card>
      )}
    </div>
  );

  const merchantTab = (
    <div className="space-y-6">
      <Card className="border-gray-200">
        <CardBody className="space-y-5 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 pb-4">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <BuildingStorefrontIcon className="h-6 w-6 text-gray-900" aria-hidden />
              Perfil del vendedor
            </h3>
            {merchantProfile?.verificado ? <Badge variant="success">Verificado en plataforma</Badge> : null}
          </div>

          {merchantProfile ? (
            <div className="space-y-4 text-sm text-gray-600">
              <div>
                <p className="text-xl font-semibold tracking-tight text-gray-900">{merchantDisplayName}</p>
                {merchantProfile.nombreEmpresa?.trim() && merchantProfile.nombre !== merchantProfile.nombreEmpresa ? (
                  <p className="mt-1 text-sm text-gray-500">Representante legal: {merchantProfile.nombre}</p>
                ) : null}
              </div>

              {merchantProfile.categoriaEmpresa ? (
                <p>
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Rubro</span>
                  <span className="mt-1 block text-gray-800">{merchantProfile.categoriaEmpresa}</span>
                </p>
              ) : null}

              {merchantProfile.descripcionEmpresa?.trim() ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Sobre el negocio</p>
                  <p className="mt-2 whitespace-pre-wrap leading-relaxed text-gray-700">
                    {merchantProfile.descripcionEmpresa.trim()}
                  </p>
                </div>
              ) : (
                <p className="rounded-lg border border-gray-100 bg-gray-50/80 px-4 py-3 text-sm text-gray-600">
                  Este comerciante aún no publicó una descripción extendida. La operación sigue cubierta por las políticas de{' '}
                  {BRAND_NAME}.
                </p>
              )}

              <p className="text-xs leading-relaxed text-gray-500">
                Todas las conversaciones sobre pedidos deben hacerse mediante la plataforma para garantizar soporte en caso de
                incidencias.
              </p>

              {merchantProfile.sitioWeb?.trim() ? (
                <a
                  href={
                    /^https?:\/\//i.test(merchantProfile.sitioWeb.trim())
                      ? merchantProfile.sitioWeb.trim()
                      : `https://${merchantProfile.sitioWeb.trim()}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-primary-700 hover:text-primary-800"
                >
                  <GlobeAltIcon className="h-4 w-4 shrink-0" aria-hidden />
                  Visitar sitio web público del vendedor
                </a>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-gray-600">
              Este listado proviene de un comerciante cuyos datos públicos no están disponibles en este momento. Si necesitas más
              contexto antes de comprar, utiliza Contacto desde el pie de página.
            </p>
          )}
        </CardBody>
      </Card>
    </div>
  );

  const tabItems: TabItem[] = [
    { id: 'desc', label: 'Descripción', content: descriptionTab },
    { id: 'reviews', label: `Reseñas (${reviewCount})`, content: reviewsTab },
    { id: 'merchant', label: 'Vendedor', content: merchantTab },
  ];

  const buyControls = (
    <div className="space-y-4">
      {stock > 0 ? (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-gray-700">Cantidad</span>
            <div className="inline-flex items-center rounded-lg border border-gray-200 bg-white shadow-sm">
              <button
                type="button"
                className="px-3 py-2 text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1 || addingToCart}
                aria-label="Disminuir cantidad"
              >
                −
              </button>
              <span className="min-w-[2.5rem] border-x border-gray-200 px-3 py-2 text-center text-sm font-semibold tabular-nums">
                {quantity}
              </span>
              <button
                type="button"
                className="px-3 py-2 text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => setQuantity((q) => Math.min(stock, q + 1))}
                disabled={quantity >= stock || addingToCart}
                aria-label="Aumentar cantidad"
              >
                +
              </button>
            </div>
            <span className="text-xs text-gray-500">Máximo disponible: {stock}</span>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              variant="primary"
              size="lg"
              className="flex-1"
              loading={addingToCart}
              onClick={handleAddToCart}
            >
              Agregar al carrito
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="flex-1"
              loading={addingToCart}
              onClick={handleBuyNow}
            >
              Comprar ahora
            </Button>
          </div>
        </>
      ) : (
        <Card className="border-error-200 bg-error-50/80">
          <CardBody>
            <p className="font-medium text-error-800">Producto sin stock</p>
            <p className="mt-1 text-sm text-error-700">
              No se puede añadir al carrito. Puedes volver más tarde o explorar productos similares.
            </p>
          </CardBody>
        </Card>
      )}
    </div>
  );

  return (
    <>
      <SeoHead
        title={product.nombre}
        description={(product.descripcion || '').slice(0, 160)}
        canonicalPath={`/productos/${id}`}
        ogImage={getFirstImageUrl(product.imagenes) || undefined}
        jsonLd={productJsonLd}
      />
      <Container as="main" className="pb-28 md:pb-12">
      <nav className="mb-5 border-b border-gray-200/90 pb-4 text-[13px] text-gray-500 sm:mb-6" aria-label="Migas de pan">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <li>
            <Link to="/productos" className="font-medium text-gray-700 transition-colors hover:text-primary-700">
              Productos
            </Link>
          </li>
          <li aria-hidden className="text-gray-300">
            /
          </li>
          <li className="text-gray-600">{getCategoryForBreadcrumb()}</li>
          <li aria-hidden className="text-gray-300">
            /
          </li>
          <li className="max-w-[min(100vw-8rem,40rem)] truncate font-semibold text-gray-900">{product.nombre}</li>
        </ol>
      </nav>

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2 lg:gap-10">
        <div className="lg:sticky lg:top-28">
          <ProductDetailGallery images={galleryImages} productName={product.nombre} />
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            {stock > 0 ? (
              <Badge variant="success">En stock</Badge>
            ) : (
              <Badge variant="error">Agotado</Badge>
            )}
            <span className="text-xs text-gray-500">{getCategoryName()}</span>
          </div>

          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl lg:text-4xl">
              {product.nombre}
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Vendido por <span className="font-medium text-gray-900">{merchantDisplayName}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-baseline gap-3">
            <p className="text-3xl font-bold tabular-nums text-gray-900 sm:text-4xl">${price.toLocaleString('es-CO')}</p>
            <span className="text-sm text-gray-500">COP · impuestos según checkout</span>
          </div>
          {stock > 0 ? (
            <p className="text-sm text-gray-600">
              <span className="font-medium text-gray-900">{stock}</span> unidades disponibles
            </p>
          ) : null}

          {reviewCount > 0 ? (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3">
              <StarRating value={avgReview} />
              <span className="text-sm text-gray-700">
                <span className="font-semibold tabular-nums">{avgReview.toFixed(1)}</span>
                <span className="text-gray-500"> · {reviewCount} reseñas</span>
              </span>
            </div>
          ) : null}

          <Card className="border-gray-200 bg-white">
            <CardBody className="flex gap-3 p-4 sm:p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-900 text-white">
                <BuildingStorefrontIcon className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Vendedor</p>
                  {merchantProfile?.verificado ? (
                    <Badge variant="success" className="text-[10px]">
                      Verificado
                    </Badge>
                  ) : null}
                </div>
                <p className="font-semibold text-gray-900">{merchantDisplayName}</p>
                {merchantProfile?.descripcionEmpresa?.trim() ? (
                  <p className="text-xs leading-relaxed text-gray-600 line-clamp-4 sm:line-clamp-6">
                    {merchantProfile.descripcionEmpresa.trim()}
                  </p>
                ) : (
                  <p className="text-xs leading-snug text-gray-600">
                    Comercio en {BRAND_NAME}. Coordinamos soporte post-venta y disputes desde la plataforma.
                  </p>
                )}
                {merchantProfile?.categoriaEmpresa ? (
                  <p className="text-[11px] text-gray-500">
                    Rubro: <span className="font-medium text-gray-700">{merchantProfile.categoriaEmpresa}</span>
                  </p>
                ) : null}
                {merchantProfile?.sitioWeb?.trim() ? (
                  <a
                    href={
                      /^https?:\/\//i.test(merchantProfile.sitioWeb.trim())
                        ? merchantProfile.sitioWeb.trim()
                        : `https://${merchantProfile.sitioWeb.trim()}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary-700 hover:text-primary-800"
                  >
                    <GlobeAltIcon className="h-3.5 w-3.5" aria-hidden />
                    Sitio web del vendedor
                  </a>
                ) : null}
              </div>
            </CardBody>
          </Card>

          <ul className="grid gap-2 sm:grid-cols-3">
            <li className="flex items-start gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-xs text-gray-700 sm:text-sm">
              <ShieldCheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-primary-600 sm:h-5 sm:w-5" aria-hidden />
              Pago seguro (Wompi)
            </li>
            <li className="flex items-start gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-xs text-gray-700 sm:text-sm">
              <TruckIcon className="mt-0.5 h-4 w-4 shrink-0 text-primary-600 sm:h-5 sm:w-5" aria-hidden />
              Envío acordado al pagar
            </li>
            <li className="flex items-start gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-xs text-gray-700 sm:text-sm">
              <BuildingStorefrontIcon className="mt-0.5 h-4 w-4 shrink-0 text-primary-600 sm:h-5 sm:w-5" aria-hidden />
              Comerciante verificado
            </li>
          </ul>

          <div className="hidden md:block">{buyControls}</div>
        </div>
      </div>

      <div className="mt-10 border-t border-gray-100 pt-10 md:mt-14 md:pt-12">
        <Tabs variant="underline" tabs={tabItems} selectedIndex={tabIndex} onChange={setTabIndex} />
      </div>

      {relatedProducts.length > 0 || (!hasEmbeddedRelated && relatedLoading) ? (
        <section className="mt-14 border-t border-gray-100 pt-10">
          <h2 className="mb-6 text-xl font-bold text-gray-900">Productos relacionados</h2>
          {!hasEmbeddedRelated && relatedLoading && relatedProducts.length === 0 ? (
            <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <li key={i}>
                  <Skeleton className="aspect-[4/3] w-full rounded-xl" />
                  <Skeleton className="mt-3 h-4 w-2/3" />
                  <Skeleton className="mt-2 h-6 w-24" />
                </li>
              ))}
            </ul>
          ) : (
            <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedProducts.map((relatedProduct) => (
                <li key={relatedProduct._id}>
                  <Card className="h-full overflow-hidden transition-shadow hover:shadow-medium">
                    <Link
                      to={`/productos/${relatedProduct._id}`}
                      className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                    >
                      <div className="aspect-[4/3] overflow-hidden bg-gray-100">
                        <ProductImage
                          src={getFirstImageUrl(relatedProduct.imagenes)}
                          alt={relatedProduct.nombre}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <CardBody>
                        <h3 className="line-clamp-2 font-semibold text-gray-900">{relatedProduct.nombre}</h3>
                        <p className="mt-1 text-xs text-gray-500">
                          {(typeof relatedProduct.comerciante === 'object' &&
                          relatedProduct.comerciante &&
                          'nombre' in relatedProduct.comerciante
                            ? relatedProduct.comerciante.nombre
                            : null) || 'Comerciante'}
                        </p>
                        <p className="mt-2 text-lg font-bold tabular-nums text-gray-900">
                          ${safeMoney(relatedProduct.precio).toLocaleString('es-CO')}
                        </p>
                      </CardBody>
                    </Link>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-dropdown border-t border-gray-200 bg-white/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-strong backdrop-blur md:hidden">
        <div className="mx-auto max-w-7xl space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <p className="text-xs text-gray-500">Total estimado</p>
              <p className="text-lg font-bold tabular-nums text-gray-900">
                ${(price * quantity).toLocaleString('es-CO')}
              </p>
            </div>
          </div>
          {buyControls}
        </div>
      </div>
    </Container>
    </>
  );
};

export default ProductDetailPage;
