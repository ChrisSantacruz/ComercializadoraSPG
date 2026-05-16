import React from 'react';
import { Link } from 'react-router-dom';
import type { Product } from '../../types';
import { Container } from '../ui/Container';
import { Section } from '../ui/Section';
import { ErrorState } from '../ui/ErrorState';
import { EmptyState } from '../ui/EmptyState';
import { ProductCard } from '../products/ProductCard';
import { ProductCatalogSkeleton } from '../products/ProductCatalogSkeleton';

export interface HomeProductRailSectionProps {
  eyebrow?: string;
  title: string;
  description: string;
  products: Product[];
  state: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
  showOffer?: boolean;
  onRetry: () => void;
  onAddToCart: (product: Product) => void;
}

export const HomeProductRailSection: React.FC<HomeProductRailSectionProps> = ({
  eyebrow,
  title,
  description,
  products,
  state,
  error,
  showOffer = false,
  onRetry,
  onAddToCart,
}) => (
  <Section padded={false} className="border-b border-gray-200 py-16 sm:py-20">
    <Container>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-xl">
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">{eyebrow}</p>
          ) : null}
          <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
            {title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-600 sm:text-base">{description}</p>
        </div>
        <Link
          to="/productos"
          className="shrink-0 text-sm font-semibold text-primary-700 underline-offset-4 hover:text-primary-900 hover:underline"
        >
          Ir al catálogo
        </Link>
      </div>

      {state === 'loading' ? (
        <div className="mt-10">
          <ProductCatalogSkeleton count={3} />
        </div>
      ) : null}

      {state === 'error' && error ? (
        <div className="mt-10 max-w-md">
          <ErrorState title="Sección no disponible" message={error} onRetry={onRetry} />
        </div>
      ) : null}

      {state === 'success' && products.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title="Sin productos por ahora"
            description="Vuelve pronto o explora el catálogo completo."
          />
        </div>
      ) : null}

      {state === 'success' && products.length > 0 ? (
        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {products.map((p, idx) => (
            <ProductCard
              key={p._id}
              product={p}
              variant="compact"
              showOfferBadge={showOffer}
              imagePriority={idx < 3 ? 'high' : 'low'}
              onAddToCart={onAddToCart}
            />
          ))}
        </div>
      ) : null}
    </Container>
  </Section>
);
