import React from 'react';
import { Skeleton } from '../ui/Skeleton';

/**
 * Fallback de Suspense para chunks de ruta: ocupa espacio estable (menos CLS) sin pantalla completa bloqueante.
 */
const RouteChunkFallback: React.FC = () => (
  <div
    className="mx-auto max-w-4xl px-4 py-10"
    role="status"
    aria-live="polite"
    aria-busy="true"
    aria-label="Cargando vista"
  >
    <Skeleton className="mb-4 h-8 w-2/3 max-w-md" />
    <Skeleton className="mb-8 h-4 w-full max-w-lg" />
    <div className="grid gap-4 md:grid-cols-2">
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-40 rounded-xl" />
    </div>
  </div>
);

export default RouteChunkFallback;
