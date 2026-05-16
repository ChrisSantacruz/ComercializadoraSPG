import React, { Component, ErrorInfo, ReactNode } from 'react';
import { log } from '../../lib/observability/logger';

export interface ErrorBoundaryProps {
  children: ReactNode;
  /** Zone label for observability (e.g. root, public-shell). */
  zone?: string;
  /** TanStack Query reset — pair with QueryErrorResetBoundary at root. */
  onRecoverQueries?: () => void;
  /** Optional custom fallback */
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    log.error('render.crash', {
      zone: this.props.zone ?? 'unknown',
      message: error.message,
      stackPreview: error.stack?.slice(0, 400),
      componentStack: errorInfo.componentStack?.slice(0, 600),
    });
  }

  private handleRetry = () => {
    this.props.onRecoverQueries?.();
    this.setState({ hasError: false, error: undefined });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const devHint =
        process.env.NODE_ENV === 'development' && this.state.error
          ? this.state.error.message
          : null;

      return (
        <div className="min-h-[40vh] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-xl shadow-soft p-6 text-center">
            <div className="w-16 h-16 bg-error-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-error-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Algo salió mal en esta sección
            </h1>
            <p className="text-gray-600 mb-6">
              Puedes reintentar sin perder la sesión. Si el problema continúa, recarga la página.
            </p>
            {devHint ? (
              <p className="mb-4 font-mono text-xs text-gray-500 break-words" role="status">
                {devHint}
              </p>
            ) : null}
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <button type="button" onClick={this.handleRetry} className="btn-primary w-full sm:w-auto">
                Reintentar
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="w-full sm:w-auto rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Recargar página
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
