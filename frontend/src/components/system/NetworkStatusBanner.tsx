import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { cn } from '../../lib/cn';
import { log } from '../../lib/observability/logger';

/**
 * Non-blocking offline indicator. Active queries refetch via Query defaults (refetchOnReconnect).
 */
export function NetworkStatusBanner(): React.ReactElement | null {
  const location = useLocation();
  const [online, setOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );

  useEffect(() => {
    const onUp = () => {
      setOnline(true);
      log.info('network.online', { path: location.pathname });
    };
    const onDown = () => {
      setOnline(false);
      log.warn('network.offline', { path: location.pathname });
    };
    window.addEventListener('online', onUp);
    window.addEventListener('offline', onDown);
    return () => {
      window.removeEventListener('online', onUp);
      window.removeEventListener('offline', onDown);
    };
  }, [location.pathname]);

  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
        className={cn(
        'fixed bottom-0 left-0 right-0 z-[55] border-t border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-900 sm:bottom-auto sm:left-auto sm:right-4 sm:top-20 sm:max-w-md sm:rounded-lg sm:border sm:text-left',
      )}
    >
      Sin conexión. Los datos pueden estar desactualizados; reintentaremos al volver la red.
    </div>
  );
}
