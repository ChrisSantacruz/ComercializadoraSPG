import React from 'react';
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import ErrorBoundary from '../ui/ErrorBoundary';

type Props = { children: React.ReactNode };

/**
 * Binds TanStack Query reset to the root error boundary so "Reintentar"
 * clears query error state and avoids infinite loading after a thrown error.
 */
export function ProductionShell({ children }: Props) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary zone="root" onRecoverQueries={reset}>
          {children}
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}
