import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * CSR scroll restoration: scroll to top on path changes; honor hash anchors.
 * Complements React Router's framework `ScrollRestoration` (not available in pure BrowserRouter SPA).
 */
export function useRouteScrollRestoration(): void {
  const location = useLocation();

  useLayoutEffect(() => {
    const hash = location.hash?.replace(/^#/, '');
    if (hash) {
      const el = document.getElementById(decodeURIComponent(hash));
      if (el) {
        el.scrollIntoView({ behavior: 'auto', block: 'start' });
        return;
      }
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname, location.search, location.hash]);
}
