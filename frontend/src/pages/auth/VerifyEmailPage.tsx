import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { EnvelopeIcon } from '@heroicons/react/24/outline';
import { authService } from '../../services/authService';
import { useAuthStore } from '../../stores/authStore';
import { AuthLayoutShell } from '../../components/auth/AuthLayoutShell';
import { FormField } from '../../components/ui/FormField';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useNotifications } from '../../components/ui/NotificationContainer';

const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const { showSuccess, showError } = useNotifications();

  const emailFromParams = searchParams.get('email') || '';

  const [email, setEmail] = useState(emailFromParams);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendingCode, setResendingCode] = useState(false);

  useEffect(() => {
    setEmail(emailFromParams);
  }, [emailFromParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await authService.verifyEmailWithCode(email, code);

      if (response.token) {
        setSession({
          user: response.usuario,
          token: response.token,
          refreshToken: response.refreshToken ?? null,
        });
      }

      showSuccess('Cuenta verificada', 'Tu correo quedó confirmado. Redirigiendo al inicio.');
      navigate('/', { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Código incorrecto o expirado.';
      showError('No pudimos verificar', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!email.trim()) {
      showError('Falta el correo', 'Indica el correo asociado a tu registro.');
      return;
    }

    setResendingCode(true);

    try {
      await authService.resendVerificationCode(email.trim().toLowerCase());
      showSuccess('Código solicitado', 'Si el correo existe, enviamos un nuevo código. Revisa spam.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'No pudimos reenviar el código.';
      if (msg.toLowerCase().includes('timeout')) {
        showError('Envío lento', 'Espera unos minutos y revisa tu bandeja; el código puede haberse generado.');
      } else {
        showError('Reenvío fallido', msg);
      }
    } finally {
      setResendingCode(false);
    }
  };

  return (
    <AuthLayoutShell
      title="Verificar correo"
      subtitle={
        emailFromParams
          ? 'Introduce el código de 6 dígitos que enviamos a tu bandeja.'
          : 'Introduce tu correo y el código de 6 dígitos.'
      }
      footerLink={{
        hint: '¿Ya verificaste?',
        to: '/login',
        label: 'Ir al inicio de sesión',
      }}
    >
      <div className="mb-8 flex justify-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-primary-200 bg-primary-50 text-primary-700">
          <EnvelopeIcon className="h-8 w-8" aria-hidden />
        </div>
      </div>

      {email ? (
        <p className="mb-6 text-center text-sm text-gray-600">
          Código enviado a <span className="font-medium text-gray-900">{email}</span>
        </p>
      ) : null}

      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        {!emailFromParams ? (
          <FormField id="email" label="Correo electrónico" required>
            <Input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              placeholder="nombre@empresa.com"
              disabled={loading}
            />
          </FormField>
        ) : null}

        <FormField id="codigo" label="Código de verificación" required hint="6 dígitos numéricos.">
          <Input
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(ev) => {
              const value = ev.target.value.replace(/\D/g, '').slice(0, 6);
              setCode(value);
            }}
            placeholder="000000"
            maxLength={6}
            disabled={loading}
            className="text-center font-mono text-2xl font-semibold tracking-[0.35em]"
          />
        </FormField>

        <Button type="submit" variant="secondary" size="lg" className="w-full" loading={loading} disabled={code.length !== 6}>
          Verificar y continuar
        </Button>
      </form>

      <div className="mt-8 rounded-xl border border-gray-200 bg-gray-50 p-4 text-center">
        <p className="text-sm text-gray-600">¿No recibiste el código?</p>
        <Button
          type="button"
          variant="outline"
          size="md"
          className="mt-3 w-full"
          loading={resendingCode}
          disabled={resendingCode || !email.trim()}
          onClick={handleResendCode}
        >
          Reenviar código
        </Button>
        <p className="mt-2 text-xs text-gray-500">El código caduca en 15 minutos.</p>
      </div>

      <p className="mt-6 text-center">
        <Link
          to="/login"
          className="text-sm font-medium text-primary-600 underline-offset-4 hover:text-primary-700 hover:underline"
        >
          Volver al inicio de sesión
        </Link>
      </p>
    </AuthLayoutShell>
  );
};

export default VerifyEmailPage;
