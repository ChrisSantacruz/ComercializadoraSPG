import React, { memo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ShoppingCartIcon, StarIcon } from '@heroicons/react/24/solid';
import { EyeIcon } from '@heroicons/react/24/outline';
import type { Product } from '../../types';
import { cn } from '../../lib/cn';
import ProductImage from '../ui/ProductImage';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { ProductPrice } from './ProductPrice';
import { getFirstImageUrl } from '../../utils/imageUtils';
import { prefetchProductDetail } from '../../lib/query/hooks/useProductsQuery';

export type ProductCardVariant = 'grid' | 'compact';

export interface ProductCardProps {
  product: Product;
  variant?: ProductCardVariant;
  categoryLabel?: string;
  showOfferBadge?: boolean;
  imagePriority?: 'high' | 'low';
  onAddToCart?: (product: Product) => void;
  className?: string;
}

const imageHeights: Record<ProductCardVariant, string> = {
  grid: 'h-52 sm:h-56',
  compact: 'h-44',
};

export const ProductCard = memo(function ProductCard({
  product,
  variant = 'compact',
  categoryLabel,
  showOfferBadge = false,
  imagePriority = 'low',
  onAddToCart,
  className,
}: ProductCardProps) {
  const queryClient = useQueryClient();
  const href = `/productos/${product._id}`;
  const offerFromTag = Boolean(product.tags?.includes('oferta'));
  const showOffer = showOfferBadge || offerFromTag;
  const imgSrc = getFirstImageUrl(product.imagenes);
  const offerPrice =
    product.precioOferta != null && product.precioOferta > 0 && product.precioOferta < product.precio
      ? product.precioOferta
      : undefined;

  const handleCart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onAddToCart?.(product);
    },
    [onAddToCart, product],
  );

  const prefetchPdp = useCallback(() => {
    void prefetchProductDetail(queryClient, product._id);
  }, [queryClient, product._id]);

  return (
    <article
      className={cn(
        'group flex min-w-0 flex-col overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-soft transition-shadow duration-200 hover:border-gray-300 hover:shadow-medium',
        className,
      )}
    >
      <Link
        to={href}
        className="relative block min-h-0 shrink-0 overflow-hidden bg-gray-50"
        onMouseEnter={prefetchPdp}
        onFocus={prefetchPdp}
      >
        <div className={cn('relative w-full overflow-hidden', imageHeights[variant])}>
          <ProductImage
            src={imgSrc}
            alt={product.nombre}
            loading={imagePriority === 'high' ? 'eager' : 'lazy'}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
          {showOffer ? (
            <div className="pointer-events-none absolute left-3 top-3">
              <Badge variant="error" className="text-[10px] font-semibold uppercase tracking-wide">
                Oferta
              </Badge>
            </div>
          ) : null}
        </div>
      </Link>

      <div className="flex min-h-0 flex-1 flex-col gap-2 p-4">
        {categoryLabel ? (
          <p className="text-xs font-medium uppercase tracking-wide text-primary-700">{categoryLabel}</p>
        ) : null}

        {variant === 'grid' && product.estadisticas ? (
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <StarIcon className="h-3.5 w-3.5 text-amber-400" aria-hidden />
            <span className="tabular-nums font-medium">
              {product.estadisticas.calificacionPromedio?.toFixed(1) ?? '—'}
            </span>
          </div>
        ) : null}

        <Link to={href} className="block min-w-0" onMouseEnter={prefetchPdp} onFocus={prefetchPdp}>
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-gray-900 transition-colors group-hover:text-primary-800">
            {product.nombre}
          </h3>
        </Link>

        {variant === 'grid' ? (
          <p className="line-clamp-2 text-xs leading-relaxed text-gray-600">{product.descripcion}</p>
        ) : null}

        <div className="mt-auto flex items-end justify-between gap-3 pt-1">
          <ProductPrice
            amount={offerPrice ?? product.precio}
            compareAt={offerPrice ? product.precio : undefined}
          />
          <span
            className={cn(
              'shrink-0 text-xs font-medium',
              product.stock > 0 ? 'text-gray-500' : 'text-error-600',
            )}
          >
            {product.stock > 0 ? `${product.stock} u.` : 'Agotado'}
          </span>
        </div>

        <div className="flex gap-2 pt-2">
          <Link
            to={href}
            onMouseEnter={prefetchPdp}
            onFocus={prefetchPdp}
            className={cn(
              'inline-flex h-9 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2',
            )}
          >
            <EyeIcon className="h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate">Ver</span>
          </Link>
          {onAddToCart ? (
            <Button
              type="button"
              variant="primary"
              size="sm"
              className="shrink-0 px-3"
              disabled={product.stock === 0}
              onClick={handleCart}
              aria-label={`Agregar ${product.nombre} al carrito`}
            >
              <ShoppingCartIcon className="h-4 w-4" aria-hidden />
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  );
});
