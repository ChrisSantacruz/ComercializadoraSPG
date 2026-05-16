import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller, type Resolver } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '../../stores/authStore';
import { AuthLayoutShell } from '../../components/auth/AuthLayoutShell';
import SocialLoginButtons from '../../components/auth/SocialLoginButtons';
import { FormField } from '../../components/ui/FormField';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';

type Rol = 'cliente' | 'comerciante';

const registerSchema = yup.object({
  nombre: yup
    .string()
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'Máximo 100 caracteres')
    .required('El nombre es requerido'),
  email: yup.string().trim().email('El email no es válido').required('El email es requerido'),
  rol: yup.mixed<Rol>().oneOf(['cliente', 'comerciante']).required(),
  nombreEmpresa: yup.string().when('rol', {
    is: 'comerciante',
    then: (schema) =>
      schema
        .trim()
        .min(2, 'El nombre de la empresa debe tener al menos 2 caracteres')
        .max(100, 'Máximo 100 caracteres')
        .required('El nombre de la empresa es requerido'),
    otherwise: (schema) => schema.optional().strip(),
  }),
  password: yup
    .string()
    .required('La contraseña es requerida')
    .min(6, 'La contraseña debe tener al menos 6 caracteres'),
  confirmPassword: yup
    .string()
    .required('Confirma tu contraseña')
    .oneOf([yup.ref('password')], 'Las contraseñas no coinciden'),
});

type RegisterFormValues = {
  nombre: string;
  email: string;
  rol: Rol;
  nombreEmpresa?: string;
  password: string;
  confirmPassword: string;
};

function passwordStrengthLabel(password: string): {
  level: 'weak' | 'moderate' | 'strong';
  text: string;
  boxClass: string;
} {
  if (!password) {
    return { level: 'weak', text: '', boxClass: '' };
  }
  let strength = 0;
  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;

  if (strength <= 2) {
    return {
      level: 'weak',
      text: 'Débil',
      boxClass: 'border-error-200 bg-error-50 text-error-800',
    };
  }
  if (strength <= 4) {
    return {
      level: 'moderate',
      text: 'Moderada',
      boxClass: 'border-warning-200 bg-warning-50 text-warning-900',
    };
  }
  return {
    level: 'strong',
    text: 'Fuerte',
    boxClass: 'border-success-200 bg-success-50 text-success-900',
  };
}

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register: registerAccount, isLoading, error: storeError, clearError } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: yupResolver(registerSchema) as Resolver<RegisterFormValues>,
    defaultValues: {
      nombre: '',
      email: '',
      rol: 'cliente',
      nombreEmpresa: '',
      password: '',
      confirmPassword: '',
    },
  });

  const passwordValue = watch('password');
  const rolValue = watch('rol');
  const strength = useMemo(() => passwordStrengthLabel(passwordValue || ''), [passwordValue]);

  useEffect(() => {
    clearError();
  }, [clearError]);

  const onSubmit = async (values: RegisterFormValues) => {
    try {
      await registerAccount({
        nombre: values.nombre.trim(),
        email: values.email.trim().toLowerCase(),
        password: values.password,
        rol: values.rol,
        nombreEmpresa: values.rol === 'comerciante' ? values.nombreEmpresa?.trim() : undefined,
      });
      navigate(`/verificar-email?email=${encodeURIComponent(values.email.trim().toLowerCase())}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'No pudimos crear la cuenta.';
      setError('root', { type: 'server', message: msg });
    }
  };

  const rootError = errors.root?.message || storeError;

  return (
    <AuthLayoutShell
      title="Crear cuenta"
      subtitle="Registro para clientes y comerciantes. Los datos se validan en servidor."
      footerLink={{
        hint: '¿Ya tienes cuenta?',
        to: '/login',
        label: 'Iniciar sesión',
      }}
    >
      {rootError ? (
        <div className="mb-6 rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-800" role="alert">
          {rootError}
        </div>
      ) : null}

      <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormField id="nombre" label="Nombre completo" required error={errors.nombre?.message}>
          <Input autoComplete="name" disabled={isSubmitting || isLoading} {...register('nombre')} />
        </FormField>

        <FormField id="email" label="Correo electrónico" required error={errors.email?.message}>
          <Input type="email" autoComplete="email" disabled={isSubmitting || isLoading} {...register('email')} />
        </FormField>

        <FormField id="rol" label="Tipo de cuenta" required error={errors.rol?.message}>
          <Controller
            name="rol"
            control={control}
            render={({ field }) => (
              <Select {...field} disabled={isSubmitting || isLoading}>
                <option value="cliente">Cliente</option>
                <option value="comerciante">Comerciante</option>
              </Select>
            )}
          />
        </FormField>

        {rolValue === 'comerciante' ? (
          <FormField
            id="nombreEmpresa"
            label="Nombre de la empresa"
            required
            error={errors.nombreEmpresa?.message}
          >
            <Input disabled={isSubmitting || isLoading} {...register('nombreEmpresa')} />
          </FormField>
        ) : null}

        <FormField id="password" label="Contraseña" required error={errors.password?.message}>
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              disabled={isSubmitting || isLoading}
              className="pr-11"
              {...register('password')}
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
          {passwordValue ? (
            <div className={`mt-2 rounded-lg border px-3 py-2 text-xs ${strength.boxClass}`}>
              <span className="font-medium">Fortaleza: </span>
              {strength.text}
              {strength.level === 'weak' ? (
                <span className="block pt-1 text-gray-700">
                  Añade mayúsculas, números y símbolos para reforzar la clave.
                </span>
              ) : null}
            </div>
          ) : null}
        </FormField>

        <FormField
          id="confirmPassword"
          label="Confirmar contraseña"
          required
          error={errors.confirmPassword?.message}
        >
          <div className="relative">
            <Input
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              disabled={isSubmitting || isLoading}
              className="pr-11"
              {...register('confirmPassword')}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((p) => !p)}
              className="absolute inset-y-0 right-0 flex items-center rounded-r-lg px-3 text-gray-500 transition-colors hover:text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
              aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showConfirmPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
            </button>
          </div>
        </FormField>

        <Button
          type="submit"
          variant="secondary"
          size="lg"
          className="w-full"
          loading={isSubmitting || isLoading}
        >
          Crear cuenta
        </Button>
      </form>

      <div className="mt-8">
        <SocialLoginButtons isLoading={isSubmitting || isLoading} />
      </div>
    </AuthLayoutShell>
  );
};

export default RegisterPage;
