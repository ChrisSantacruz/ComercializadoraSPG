import React, { Component, ErrorInfo, ReactNode } from 'react';
import { log } from '../../lib/observability/logger';

type Props = { children: ReactNode };

type State = { hasError: boolean };

export default class CheckoutErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    log.error('checkout.boundary', {
      message: error.message,
      componentStack: info.componentStack?.slice(0, 500),
    });
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] flex items-center justify-center px-4">
          <div className="max-w-md text-center space-y-4">
            <h1 className="text-lg font-semibold text-gray-900">Algo salió mal en el checkout</h1>
            <p className="text-sm text-gray-600">
              Puedes reintentar, o ir a{' '}
              <a className="text-primary-600 underline" href="/orders">
                Mis pedidos
              </a>{' '}
              para comprobar tu pago.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <button
                type="button"
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-800"
                onClick={this.handleRetry}
              >
                Reintentar
              </button>
              <button
                type="button"
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm text-white"
                onClick={() => window.location.assign('/orders')}
              >
                Ir a pedidos
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
