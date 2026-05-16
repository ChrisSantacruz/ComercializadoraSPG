import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { AUTH_SESSION_LOST } from '../auth/authEvents';

/**
 * Session bootstrap + auth-loss handling without full page reloads.
 */
const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const clearLocalSession = useAuthStore((s) => s.clearLocalSession);

  useEffect(() => {
    const runBootstrap = () => {
      void useAuthStore.getState().bootstrapSession();
    };

    if (useAuthStore.persist.hasHydrated()) {
      runBootstrap();
    } else {
      const unsub = useAuthStore.persist.onFinishHydration(() => {
        runBootstrap();
      });
      return unsub;
    }
  }, []);

  useEffect(() => {
    const onLost = () => {
      clearLocalSession();
      const isAuthRoute =
        location.pathname.startsWith('/login') ||
        location.pathname.startsWith('/register') ||
        location.pathname.startsWith('/verificar-email') ||
        location.pathname.startsWith('/verify-email') ||
        location.pathname.startsWith('/auth/callback');

      if (!isAuthRoute) {
        navigate('/login', { replace: true, state: { from: location.pathname } });
      }
    };

    window.addEventListener(AUTH_SESSION_LOST, onLost as EventListener);
    return () => window.removeEventListener(AUTH_SESSION_LOST, onLost as EventListener);
  }, [clearLocalSession, navigate, location.pathname]);

  return <>{children}</>;
};

export default AuthProvider;
