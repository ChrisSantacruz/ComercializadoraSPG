import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { cn } from '../../lib/cn';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { AuthLayoutShell } from '../../components/auth/AuthLayoutShell';
import { FormField } from '../../components/ui/FormField';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { authService } from '../../services/authService';

const schema = yup.object({
  newPassword: yup
    .string()
    .required('La nueva contraseña es obligatoria')
    .min(6, 'Mínimo 6 caracteres (requisito del servidor)')
    .max(128, 'Máximo 128 caracteres'),
  confirmPassword: yup
    .string()
    .required('Confirma la contraseña')
    .oneOf([yup.ref('newPassword')], 'Las contraseñas no coinciden'),
});

type FormValues = yup.InferType<typeof schema>;

const ResetPasswordPage: React.FC = () => {
  const { token: tokenFromPath } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = useMemo(() => {
    const q = searchParams.get('token');
    const raw = tokenFromPath || q;
    if (!raw) return '';
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }, [tokenFromPath, searchParams]);

  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [formError, setFormError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: yupResolver(schema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  const onSubmit = async (values: FormValues) => {
    setFormError('');
    try {
      await authService.resetPassword(token, values.newPassword);
      navigate('/login?notice=reset', { replace: true });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'No pudimos restablecer la contraseña.';
      setFormError(msg);
    }
  };

  if (!token) {
    return (
      <AuthLayoutShell
        title="Enlace no válido"
        subtitle="Falta el token de recuperación o el enlace está incompleto."
        footerLink={{ hint: '¿Necesitas un enlace nuevo?', to: '/forgot-password', label: 'Solicitar recuperación' }}
      >
        <div className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-800" role="alert">
          Abre el enlace desde el correo que te enviamos, o solicita uno nuevo.
        </div>
        <Link
          to="/forgot-password"
          className={cn(
            'mt-6 inline-flex h-11 w-full items-center justify-center rounded-xl border border-gray-300',
            'bg-white text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2',
          )}
        >
          Solicitar nuevo enlace
        </Link>
      </AuthLayoutShell>
    );
  }

  return (
    <AuthLayoutShell
      title="Nueva contraseña"
      subtitle="Elige una contraseña que no uses en otros sitios."
      footerLink={{ hint: '¿Ya actualizaste?', to: '/login', label: 'Ir al inicio de sesión' }}
    >
      {formError ? (
        <div className="mb-6 rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-800" role="alert">
          {formError}
        </div>
      ) : null}

      <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormField id="newPassword" label="Nueva contraseña" required error={errors.newPassword?.message}>
          <div className="relative">
            <Input
              type={showPw ? 'text' : 'password'}
              autoComplete="new-password"
              disabled={isSubmitting}
              className="pr-11"
              {...register('newPassword')}
            />
            <button
              type="button"
              onClick={() => setShowPw((p) => !p)}
              className="absolute inset-y-0 right-0 flex items-center rounded-r-lg px-3 text-gray-500 transition-colors hover:text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
              aria-label={showPw ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showPw ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
            </button>
          </div>
        </FormField>

        <FormField
          id="confirmPassword"
          label="Confirmar contraseña"
          required
          error={errors.confirmPassword?.message}
        >
          <div className="relative">
            <Input
              type={showPw2 ? 'text' : 'password'}
              autoComplete="new-password"
              disabled={isSubmitting}
              className="pr-11"
              {...register('confirmPassword')}
            />
            <button
              type="button"
              onClick={() => setShowPw2((p) => !p)}
              className="absolute inset-y-0 right-0 flex items-center rounded-r-lg px-3 text-gray-500 transition-colors hover:text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
              aria-label={showPw2 ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showPw2 ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
            </button>
          </div>
        </FormField>

        <Button type="submit" variant="secondary" size="lg" className="w-full" loading={isSubmitting}>
          Guardar contraseña
        </Button>
      </form>
    </AuthLayoutShell>
  );
};

export default ResetPasswordPage;
