import React from 'react';
import { Link } from 'react-router-dom';
import type { Category } from '../../types';
import { Container } from '../ui/Container';
import { Section } from '../ui/Section';
import { ErrorState } from '../ui/ErrorState';
import { Skeleton } from '../ui/Skeleton';
import { CategoryGlyph } from '../../lib/categoryIcons';

export interface HomeCategoriesSectionProps {
  categories: Category[];
  state: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
  onRetry: () => void;
}

export const HomeCategoriesSection: React.FC<HomeCategoriesSectionProps> = ({
  categories,
  state,
  error,
  onRetry,
}) => (
  <Section padded={false} className="border-b border-gray-200 bg-gray-50/80 py-16 sm:py-20">
    <Container>
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-display text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
          Categorías
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-gray-600 sm:text-base">
          Acceso rápido al catálogo con el mismo criterio de filtros que verás en listados completos.
        </p>
      </div>

      {state === 'loading' ? (
        <ul className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6" aria-hidden>
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className="rounded-xl border border-gray-200 bg-white p-5 shadow-soft">
              <Skeleton className="mx-auto h-7 w-7 rounded-md" />
              <Skeleton className="mx-auto mt-4 h-3 w-20" />
            </li>
          ))}
        </ul>
      ) : null}

      {state === 'error' && error ? (
        <div className="mx-auto mt-10 max-w-md">
          <ErrorState title="No pudimos cargar categorías" message={error} onRetry={onRetry} />
        </div>
      ) : null}

      {state === 'success' && categories.length > 0 ? (
        <ul className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {categories.slice(0, 6).map((c) => (
            <li key={c._id}>
              <Link
                to={`/productos?categoria=${encodeURIComponent(c._id)}`}
                className="group flex min-h-[7.5rem] flex-col items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white p-5 text-center shadow-soft transition-colors hover:border-primary-200 hover:shadow-medium"
              >
                <CategoryGlyph name={c.nombre} />
                <span className="text-xs font-semibold leading-snug text-gray-900 group-hover:text-primary-800">
                  {c.nombre}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {state === 'success' && categories.length === 0 ? (
        <p className="mt-10 text-center text-sm text-gray-600">Pronto publicaremos categorías activas.</p>
      ) : null}
    </Container>
  </Section>
);
