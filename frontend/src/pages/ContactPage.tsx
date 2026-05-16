import React from 'react';
import { useForm } from 'react-hook-form';
import { EnvelopeIcon, MapPinIcon, PhoneIcon } from '@heroicons/react/24/outline';
import { Container } from '../components/ui/Container';
import { PageHeader } from '../components/ui/PageHeader';
import { Section } from '../components/ui/Section';
import { FormField } from '../components/ui/FormField';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Button } from '../components/ui/Button';
import { useNotifications } from '../components/ui/NotificationContainer';
import {
  CONTACT_ADDRESS_PUBLIC,
  CONTACT_EMAIL_PUBLIC,
  CONTACT_PHONE_DISPLAY,
  CONTACT_PHONE_E164,
} from '../components/nav/navData';

type FormValues = {
  nombre: string;
  email: string;
  empresa: string;
  mensaje: string;
};

const ContactPage: React.FC = () => {
  const { showSuccess } = useNotifications();
  const { register, handleSubmit, reset, formState } = useForm<FormValues>({
    defaultValues: { nombre: '', email: '', empresa: '', mensaje: '' },
  });

  const onSubmit = (data: FormValues) => {
    const body = encodeURIComponent(
      `Nombre: ${data.nombre}\nEmail: ${data.email}\nEmpresa: ${data.empresa}\n\n${data.mensaje}`,
    );
    window.location.href = `mailto:${CONTACT_EMAIL_PUBLIC}?subject=${encodeURIComponent(
      'Contacto web — Comercializadora SPG',
    )}&body=${body}`;
    showSuccess('Listo', 'Se abrió tu cliente de correo con el mensaje preparado.');
    reset();
  };

  return (
    <div className="min-w-0 bg-gray-50 pb-16 pt-8">
      <Container>
        <PageHeader
          title="Contacto comercial"
          description="Canal directo para distribución, abastecimiento y alianzas operativas."
          className="mb-10"
        />

        <div className="grid gap-10 lg:grid-cols-3">
          <Section padded={false} className="rounded-xl border border-gray-200 bg-white p-6 shadow-soft lg:col-span-1">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Oficina</h2>
            <ul className="mt-6 space-y-5 text-sm text-gray-700">
              <li className="flex gap-3">
                <MapPinIcon className="mt-0.5 h-5 w-5 shrink-0 text-primary-600" aria-hidden />
                <span>{CONTACT_ADDRESS_PUBLIC}</span>
              </li>
              <li className="flex gap-3">
                <PhoneIcon className="mt-0.5 h-5 w-5 shrink-0 text-primary-600" aria-hidden />
                <a href={`tel:${CONTACT_PHONE_E164}`} className="font-medium text-primary-800 hover:underline">
                  +57 {CONTACT_PHONE_DISPLAY}
                </a>
              </li>
              <li className="flex gap-3">
                <EnvelopeIcon className="mt-0.5 h-5 w-5 shrink-0 text-primary-600" aria-hidden />
                <a href={`mailto:${CONTACT_EMAIL_PUBLIC}`} className="font-medium text-primary-800 hover:underline">
                  {CONTACT_EMAIL_PUBLIC}
                </a>
              </li>
            </ul>
          </Section>

          <Section padded={false} className="rounded-xl border border-gray-200 bg-white p-6 shadow-soft lg:col-span-2">
            <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField id="contact-nombre" label="Nombre" error={formState.errors.nombre?.message} required>
                  <Input {...register('nombre', { required: 'Requerido' })} autoComplete="name" />
                </FormField>
                <FormField id="contact-email" label="Correo" error={formState.errors.email?.message} required>
                  <Input
                    type="email"
                    {...register('email', { required: 'Requerido' })}
                    autoComplete="email"
                  />
                </FormField>
              </div>
              <FormField id="contact-empresa" label="Empresa / proyecto">
                <Input {...register('empresa')} />
              </FormField>
              <FormField id="contact-mensaje" label="Mensaje" error={formState.errors.mensaje?.message} required>
                <Textarea
                  rows={5}
                  {...register('mensaje', { required: 'Cuéntanos el contexto' })}
                  placeholder="Volumen estimado, categorías de interés, ciudad de entrega…"
                />
              </FormField>
              <Button type="submit" variant="primary" loading={formState.isSubmitting}>
                Enviar solicitud
              </Button>
            </form>
          </Section>
        </div>
      </Container>
    </div>
  );
};

export default ContactPage;
