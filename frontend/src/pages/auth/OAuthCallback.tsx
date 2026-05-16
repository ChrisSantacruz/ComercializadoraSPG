import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../../services/authService';
import { useAuthStore } from '../../stores/authStore';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const OAuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [message, setMessage] = useState('Completando autenticación...');

  useEffect(() => {
    const run = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');

      if (error) {
        const errorMessage =
          error === 'oauth_cancelled'
            ? 'Autenticación cancelada'
            : 'Error en la autenticación con la red social';
        navigate(`/login?error=${encodeURIComponent(errorMessage)}`, { replace: true });
        return;
      }

      if (!code) {
        navigate(`/login?error=${encodeURIComponent('Enlace de autenticación incompleto')}`, {
          replace: true
        });
        return;
      }

      try {
        setMessage('Intercambiando código de sesión...');
        const session = await authService.exchangeOAuthCode(code);
        setSession({
          user: session.usuario,
          token: session.token,
          refreshToken: session.refreshToken ?? null
        });
        navigate('/', { replace: true });
      } catch (e) {
        navigate(`/login?error=${encodeURIComponent('No se pudo completar el inicio de sesión')}`, {
          replace: true
        });
      }
    };

    void run();
  }, [navigate, searchParams, setSession]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 text-center px-4">
        <LoadingSpinner size="lg" />
        <h2 className="text-2xl font-extrabold text-gray-900">{message}</h2>
        <p className="text-sm text-gray-600">Por favor espera un momento.</p>
      </div>
    </div>
  );
};

export default OAuthCallback;
