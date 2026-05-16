import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '../../stores/authStore';
import { AuthLayoutShell } from '../../components/auth/AuthLayoutShell';
import SocialLoginButtons from '../../components/auth/SocialLoginButtons';
import { FormField } from '../../components/ui/FormField';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

const LoginPage: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [searchParams] = useSearchParams();

  const { login } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
      const redirect = searchParams.get('redirect');
      const nextSearch = redirect ? `?redirect=${encodeURIComponent(redirect)}` : '';
      navigate({ pathname: '/login', search: nextSearch }, { replace: true });
      return;
    }
    if (searchParams.get('notice') === 'reset') {
      setInfo('Contraseña actualizada correctamente. Inicia sesión con tu nueva clave.');
      const redirect = searchParams.get('redirect');
      const nextSearch = redirect ? `?redirect=${encodeURIComponent(redirect)}` : '';
      navigate({ pathname: '/login', search: nextSearch || undefined }, { replace: true });
    }
  }, [searchParams, navigate]);

  const safeRedirectPath = (): string => {
    const raw = searchParams.get('redirect');
    if (raw && raw.startsWith('/') && !raw.startsWith('//')) {
      return raw;
    }
    return '/';
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      setInfo('');
      await login(formData.email, formData.password);
      navigate(safeRedirectPath());
    } catch (err) {
      let mensajeError = 'Error al iniciar sesión';

      if (err instanceof Error) {
        const mensaje = err.message.toLowerCase();

        if (
          mensaje.includes('credenciales') ||
          mensaje.includes('incorrecta') ||
          mensaje.includes('invalid')
        ) {
          mensajeError = 'Email o contraseña incorrectos. Verifica tus credenciales.';
        } else if (mensaje.includes('cuenta no verificada') || mensaje.includes('verificar email')) {
          mensajeError = 'Tu cuenta aún no ha sido verificada. Revisa tu correo electrónico.';
        } else if (mensaje.includes('cuenta bloqueada') || mensaje.includes('suspended')) {
          mensajeError = 'Tu cuenta ha sido bloqueada. Contacta a soporte para más información.';
        } else if (mensaje.includes('red') || mensaje.includes('network') || mensaje.includes('conexión')) {
          mensajeError = 'Error de conexión. Verifica tu internet y vuelve a intentar.';
        } else {
          mensajeError = err.message;
        }
      }

      setError(mensajeError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayoutShell
      title="Iniciar sesión"
      subtitle="Accede con tu cuenta corporativa o personal."
      footerLink={{
        hint: '¿No tienes cuenta?',
        to: '/register',
        label: 'Crear cuenta',
      }}
    >
      {info ? (
        <div
          className="mb-6 rounded-lg border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-900"
          role="status"
        >
          {info}
        </div>
      ) : null}

      {error ? (
        <div
          className="mb-6 rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-800"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        <FormField id="email" label="Correo electrónico" required>
          <Input
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="nombre@empresa.com"
            value={formData.email}
            onChange={handleChange}
            disabled={loading}
          />
        </FormField>

        <FormField id="password" label="Contraseña" required>
          <div className="relative">
            <Input
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              disabled={loading}
              className="pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              className="absolute inset-y-0 right-0 flex items-center rounded-r-lg px-3 text-gray-500 transition-colors hover:text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
            </button>
          </div>
        </FormField>

        <Button type="submit" variant="secondary" size="lg" className="w-full" loading={loading}>
          Entrar
        </Button>
      </form>

      <div className="mt-8 space-y-6">
        <SocialLoginButtons isLoading={loading} />
        <div className="text-center">
          <Link
            to="/forgot-password"
            className="text-sm font-medium text-primary-600 underline-offset-4 hover:text-primary-700 hover:underline"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
      </div>
    </AuthLayoutShell>
  );
};

export default LoginPage;
