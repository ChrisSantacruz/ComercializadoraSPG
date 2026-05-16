import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { AuthLayoutShell } from '../../components/auth/AuthLayoutShell';
import { FormField } from '../../components/ui/FormField';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { authService } from '../../services/authService';

const schema = yup.object({
  email: yup.string().trim().email('Introduce un correo válido').required('El correo es obligatorio'),
});

type FormValues = yup.InferType<typeof schema>;

const ForgotPasswordPage: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: yupResolver(schema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (values: FormValues) => {
    await authService.forgotPassword(values.email.trim().toLowerCase());
    setSubmitted(true);
  };

  return (
    <AuthLayoutShell
      title="Recuperar acceso"
      subtitle="Te enviaremos un enlace seguro si el correo está registrado."
      footerLink={{
        hint: '¿Recordaste tu contraseña?',
        to: '/login',
        label: 'Volver al inicio de sesión',
      }}
    >
      {submitted ? (
        <div
          className="mb-6 rounded-lg border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-900"
          role="status"
        >
          Si el correo existe en nuestro sistema, recibirás instrucciones en unos minutos. Revisa también la
          carpeta de spam.
        </div>
      ) : null}

      <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormField id="email" label="Correo electrónico" required error={errors.email?.message}>
          <Input
            type="email"
            autoComplete="email"
            placeholder="nombre@empresa.com"
            disabled={isSubmitting}
            {...register('email')}
          />
        </FormField>

        <Button type="submit" variant="secondary" size="lg" className="w-full" loading={isSubmitting}>
          Enviar enlace
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600">
        <Link to="/register" className="font-medium text-primary-600 underline-offset-4 hover:underline">
          Crear una cuenta nueva
        </Link>
      </p>
    </AuthLayoutShell>
  );
};

export default ForgotPasswordPage;
