import React, { useState } from 'react';
import { signInWithGoogle } from '../../config/firebase';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { authService } from '../../services/authService';
import { normalizeUser } from '../../auth/normalizeUser';

interface SocialLoginButtonsProps {
  isLoading?: boolean;
}

const SocialLoginButtons: React.FC<SocialLoginButtonsProps> = ({ isLoading = false }) => {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    if (isLoading || loading) return;

    setLoading(true);
    setError('');

    try {
      const result = await signInWithGoogle();
      const user = result.user;
      const idToken = await user.getIdToken();

      const data = await authService.firebaseLogin({
        idToken,
        provider: 'google',
        email: user.email,
        nombre: user.displayName,
        photoURL: user.photoURL,
      });

      if (data.requiereSeleccionRol && data.usuario && data.pendingToken) {
        navigate('/select-role', {
          state: { usuario: data.usuario, pendingToken: data.pendingToken },
        });
        return;
      }

      if (data.token && data.usuario) {
        setSession({
          user: normalizeUser(data.usuario),
          token: data.token,
          refreshToken: data.refreshToken ?? null,
        });
        const rol = normalizeUser(data.usuario).rol;
        if (rol === 'comerciante') navigate('/merchant', { replace: true });
        else navigate('/', { replace: true });
        return;
      }

      setError('Respuesta inesperada del servidor');
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };

      if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') {
        return;
      }

      if (e.code === 'auth/popup-blocked') {
        setError('Permite ventanas emergentes para iniciar sesión con Google.');
      } else if (e.code === 'auth/network-request-failed') {
        setError('Error de conexión. Verifica tu internet.');
      } else if (e.code === 'auth/too-many-requests') {
        setError('Demasiados intentos. Espera unos minutos.');
      } else if (e.code === 'auth/account-exists-with-different-credential') {
        setError('Ya existe una cuenta con este correo usando otro método de inicio de sesión.');
      } else {
        setError(e.message || 'No pudimos completar el inicio de sesión social.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white px-2 text-gray-500">O continúa con</span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={isLoading || loading}
        className="inline-flex w-full justify-center rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-800 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" aria-hidden>
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        Continuar con Google
      </button>
    </div>
  );
};

export default SocialLoginButtons;
