import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LightBulbIcon } from '@heroicons/react/24/outline';
import { getFriendlyErrorMessage, getSuggestedAction } from '../../utils/errorUtils';

interface ErrorDisplayProps {
  error: Error | string | unknown;
  title?: string;
  onRetry?: () => void;
  redirectPath?: string;
  redirectLabel?: string;
  autoRedirect?: boolean;
  autoRedirectDelay?: number;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  title = '¡Ups! Algo salió mal',
  onRetry,
  redirectPath,
  redirectLabel = 'Volver',
  autoRedirect = false,
  autoRedirectDelay = 3000
}) => {
  const navigate = useNavigate();
  const errorMessage = getFriendlyErrorMessage(error);
  const suggestedAction = getSuggestedAction(error);
  const [countdown, setCountdown] = React.useState(Math.floor(autoRedirectDelay / 1000));

  React.useEffect(() => {
    if (autoRedirect && redirectPath) {
      const timer = setTimeout(() => {
        navigate(redirectPath);
      }, autoRedirectDelay);

      // Countdown
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        clearTimeout(timer);
        clearInterval(interval);
      };
    }
  }, [autoRedirect, redirectPath, autoRedirectDelay, navigate]);

  const handleRedirect = () => {
    if (redirectPath) {
      navigate(redirectPath);
    }
  };

  return (
    <div className="min-h-[50vh] flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full">
        <div className="bg-white border border-red-200 rounded-lg shadow-sm p-6 text-center">
          {/* Icono de error */}
          <div className="mb-4">
            <svg 
              className="w-16 h-16 mx-auto text-red-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
              />
            </svg>
          </div>

          {/* Título */}
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {title}
          </h3>

          {/* Mensaje de error */}
          <p className="text-gray-600 mb-6">
            {errorMessage}
          </p>

          {/* Acción sugerida */}
          {suggestedAction && (
            <p className="mb-4 inline-flex items-start justify-center gap-2 text-sm text-gray-500">
              <LightBulbIcon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden />
              <span>{suggestedAction}</span>
            </p>
          )}

          {/* Botones de acción */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {onRetry && (
              <button
                onClick={onRetry}
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <svg 
                  className="w-4 h-4 mr-2" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                  />
                </svg>
                Reintentar
              </button>
            )}

            {redirectPath && (
              <button
                onClick={handleRedirect}
                className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <svg 
                  className="w-4 h-4 mr-2" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M10 19l-7-7m0 0l7-7m-7 7h18" 
                  />
                </svg>
                {redirectLabel}
              </button>
            )}
          </div>

          {/* Contador de redirección automática */}
          {autoRedirect && redirectPath && countdown > 0 && (
            <p className="mt-4 text-xs text-gray-500">
              Redirigiendo en {countdown} segundo{countdown !== 1 ? 's' : ''}...
            </p>
          )}
        </div>

        {/* Información adicional (solo en desarrollo) */}
        {process.env.NODE_ENV === 'development' && error instanceof Error && (
          <details className="mt-4 p-4 bg-gray-50 rounded-lg text-xs">
            <summary className="cursor-pointer font-medium text-gray-700 hover:text-gray-900">
              Detalles técnicos (desarrollo)
            </summary>
            <pre className="mt-2 text-gray-600 overflow-auto">
              {error.stack || error.message}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
};

export default ErrorDisplay;
