import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowPathIcon,
  BuildingStorefrontIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  EnvelopeIcon,
  GlobeAmericasIcon,
  MapPinIcon,
  PhoneIcon,
  ShieldCheckIcon,
  TruckIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { Container } from '../components/ui/Container';
import { Card, CardBody } from '../components/ui/Card';
import { BRAND_NAME, CONTACT_ADDRESS_PUBLIC, CONTACT_EMAIL_PUBLIC, CONTACT_PHONE_DISPLAY, CONTACT_PHONE_E164 } from '../components/nav/navData';

const pillars = [
  {
    title: 'Operación confiable',
    body: 'Procesos claros de pedido, pago y entrega. Menos fricción para compradores y comerciantes.',
    icon: ShieldCheckIcon,
  },
  {
    title: 'Comercio con logística',
    body: 'Coordinamos expectativas de envío y seguimiento para que cada entrega sea trazable.',
    icon: TruckIcon,
  },
  {
    title: 'Relación transparente',
    body: 'La relación comercial se apoya en reglas públicas de la plataforma, no en promesas genéricas.',
    icon: BuildingStorefrontIcon,
  },
  {
    title: 'Soporte dedicado',
    body: 'Canales de atención para resolver incidencias de compra, facturación y postventa.',
    icon: ChatBubbleLeftRightIcon,
  },
];

const values = [
  {
    title: 'Calidad',
    body: 'Curamos la experiencia de catálogo y la coherencia entre lo publicado y lo que recibe el cliente.',
  },
  {
    title: 'Honestidad',
    body: 'Comunicación directa sobre tiempos, costos y limitaciones operativas.',
  },
  {
    title: 'Compromiso regional',
    body: 'Priorizamos el comercio digital responsable y el vínculo con proveedores locales.',
  },
];

/** Perfiles de área (sin nombres personales): refuerza confianza institucional. */
const teamAreas = [
  {
    title: 'Dirección comercial',
    body: 'Definimos alianzas con comerciantes, condiciones de publicación y lineamientos de experiencia de compra.',
    icon: BuildingStorefrontIcon,
  },
  {
    title: 'Operaciones y logística',
    body: 'Acompañamos la coordinación de entregas, estados de pedido y comunicación entre partes.',
    icon: TruckIcon,
  },
  {
    title: 'Experiencia y producto',
    body: 'Mejoramos continuamente el recorrido del comprador y las herramientas del comerciante.',
    icon: UserGroupIcon,
  },
  {
    title: 'Soporte y cumplimiento',
    body: 'Atendemos consultas, incidencias y el marco de términos y privacidad de la plataforma.',
    icon: ChatBubbleLeftRightIcon,
  },
];

const commercialHighlights = [
  {
    k: 'Cobertura',
    headline: 'Comercio nacional',
    d: 'Pensamos el catálogo y el checkout para mover inventario dentro de Colombia, con soporte para envíos coordinados desde el momento del pedido.',
  },
  {
    k: 'Modelo',
    headline: 'Comerciantes y compradores en un mismo sitio',
    d: `${BRAND_NAME} agrupa inventario validado con herramientas simples de venta: publicar, cobrar y gestionar pedidos desde un mismo entorno.`,
  },
  {
    k: 'Compromiso',
    headline: 'Crecimiento sostenido',
    d: 'Apostamos por relaciones de largo plazo: reputación del vendedor, claridad en precios y seguimiento serio después de la compra.',
  },
];

const AboutUsPage: React.FC = () => (
  <div className="min-w-0 bg-white">
    <section className="border-b border-gray-200 bg-gray-50">
      <Container className="py-14 sm:py-20">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary-700">Sobre nosotros</p>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
            {BRAND_NAME}: comercialización digital con criterio de operador logístico
          </h1>
          <p className="mt-4 text-base leading-relaxed text-gray-600 sm:text-lg">
            Somos una comercializadora enfocada en acercar oferta confiable al comprador y en dar al comerciante un canal
            claro para vender. Diseño sobrio, flujos entendibles y atención a lo que ocurre después del clic en &quot;pagar&quot;.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/register"
              className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-secondary-500 px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-secondary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary-300 sm:w-auto"
            >
              Crear cuenta
            </Link>
            <Link
              to="/productos"
              className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-5 text-sm font-semibold text-gray-800 shadow-sm transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 sm:w-auto"
            >
              Ver catálogo
            </Link>
          </div>
        </div>
      </Container>
    </section>

    <section aria-label="Enfoque comercial" className="border-b border-gray-200 bg-white">
      <Container className="grid gap-px bg-gray-200 sm:grid-cols-3">
        {commercialHighlights.map((s) => (
          <article key={s.k} className="bg-white px-6 py-8">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-primary-700">{s.k}</p>
            <p className="mt-2 font-display text-lg font-semibold text-gray-900">{s.headline}</p>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">{s.d}</p>
          </article>
        ))}
      </Container>
    </section>

    <Container className="space-y-16 py-14 sm:py-16">
      <section aria-labelledby="equipo-heading">
        <div className="mb-8 max-w-2xl">
          <h2 id="equipo-heading" className="font-display text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
            Equipo y áreas
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-600 sm:text-base">
            Trabajamos en equipos funcionales coordinados como una operadora: comercial, operaciones, producto y soporte
            comparten los mismos indicadores de satisfacción y cumplimiento.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {teamAreas.map((m) => {
            const Icon = m.icon;
            return (
              <Card key={m.title} className="border-gray-200">
                <CardBody className="p-5">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-accent-900/5 text-accent-800 ring-1 ring-accent-900/10">
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">{m.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-gray-600 sm:text-sm">{m.body}</p>
                </CardBody>
              </Card>
            );
          })}
        </div>
      </section>

      <section
        id="contacto-institucional"
        aria-labelledby="contacto-institucional-heading"
        className="rounded-2xl border border-gray-200 bg-gray-50/80 px-6 py-10 sm:px-10"
      >
        <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
          <div className="lg:col-span-5">
            <h2
              id="contacto-institucional-heading"
              className="font-display text-xl font-semibold text-gray-900 sm:text-2xl"
            >
              Contacto institucional
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              Coordinación desde Pasto (Nariño). Para propuestas, pedidos o alianzas utiliza correo, teléfono o el
              formulario que abre tu gestor de correo con el mensaje listo.
            </p>
            <Link
              to="/contacto"
              className="mt-6 inline-flex h-10 items-center justify-center rounded-lg bg-accent-900 px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
            >
              Abrir formulario de mensaje
            </Link>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2 lg:col-span-7">
            <li className="flex gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-soft">
              <EnvelopeIcon className="mt-0.5 h-5 w-5 shrink-0 text-primary-600" aria-hidden />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Correo</p>
                <a
                  className="mt-1 break-all text-sm font-medium text-gray-900 hover:text-primary-700"
                  href={`mailto:${CONTACT_EMAIL_PUBLIC}`}
                >
                  {CONTACT_EMAIL_PUBLIC}
                </a>
                <p className="mt-1 text-xs text-gray-500">
                  También puedes escribirnos desde{' '}
                  <Link className="font-medium text-primary-700 hover:underline" to="/contacto">
                    el formulario web
                  </Link>{' '}
                  (abre tu correo con el mensaje preparado).
                </p>
              </div>
            </li>
            <li className="flex gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-soft">
              <PhoneIcon className="mt-0.5 h-5 w-5 shrink-0 text-primary-600" aria-hidden />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Teléfono</p>
                <a
                  className="mt-1 text-sm font-medium text-gray-900 hover:text-primary-700"
                  href={`tel:${CONTACT_PHONE_E164}`}
                >
                  +57 {CONTACT_PHONE_DISPLAY}
                </a>
                <p className="mt-1 text-xs text-gray-500">Línea de información comercial.</p>
              </div>
            </li>
            <li className="flex gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-soft">
              <MapPinIcon className="mt-0.5 h-5 w-5 shrink-0 text-primary-600" aria-hidden />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Ubicación</p>
                <p className="mt-1 text-sm font-medium text-gray-900">{CONTACT_ADDRESS_PUBLIC}</p>
              </div>
            </li>
            <li className="flex gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-soft">
              <ClockIcon className="mt-0.5 h-5 w-5 shrink-0 text-primary-600" aria-hidden />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Horario</p>
                <p className="mt-1 text-sm font-medium text-gray-900">Lun · Vie · 8:00 – 18:00</p>
              </div>
            </li>
          </ul>
        </div>
      </section>

      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {pillars.map((p) => {
          const Icon = p.icon;
          return (
            <Card key={p.title} className="border-gray-200">
              <CardBody className="p-5">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
                  <Icon className="h-6 w-6" aria-hidden />
                </div>
                <h2 className="font-display text-sm font-semibold text-gray-900">{p.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{p.body}</p>
              </CardBody>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-10 lg:grid-cols-2 lg:items-center">
        <div>
          <h2 className="font-display text-2xl font-semibold text-gray-900 sm:text-3xl">Cómo trabajamos</h2>
          <p className="mt-3 text-sm leading-relaxed text-gray-600 sm:text-base">
            Unimos catálogo, carrito y cobro para que cada parte sepa en qué punto está la operación. Los comerciantes
            publican con reglas claras; los compradores pueden seguir pedidos desde su cuenta.
          </p>
          <ul className="mt-6 space-y-3 text-sm text-gray-700">
            <li className="flex gap-2">
              <ArrowPathIcon className="mt-0.5 h-5 w-5 shrink-0 text-primary-600" aria-hidden />
              <span>Mejora continua en móvil, tablet y escritorio, con la misma información en todos los dispositivos.</span>
            </li>
            <li className="flex gap-2">
              <GlobeAmericasIcon className="mt-0.5 h-5 w-5 shrink-0 text-primary-600" aria-hidden />
              <span>Operación centrada en Colombia, precios en pesos colombianos y pagos locales.</span>
            </li>
          </ul>
        </div>
        <Card className="border-gray-200 bg-gray-50/80">
          <CardBody className="p-6 sm:p-8">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Valores</h3>
            <ul className="mt-4 space-y-4">
              {values.map((v) => (
                <li key={v.title} className="border-l-2 border-primary-500 pl-4">
                  <p className="font-medium text-gray-900">{v.title}</p>
                  <p className="mt-1 text-sm text-gray-600">{v.body}</p>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-accent-950 px-6 py-10 text-emerald-50 sm:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary-300">Próximo paso</p>
          <h2 className="mt-3 font-display text-2xl font-semibold sm:text-3xl text-white">
            ¿Listo para comprar o vender con nosotros?
          </h2>
          <p className="mt-3 text-sm text-emerald-200/90 sm:text-base">
            Crea tu cuenta en minutos o revisa el catálogo público antes de registrarte.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              to="/register"
              className="inline-flex h-10 items-center justify-center rounded-lg bg-secondary-500 px-5 text-sm font-semibold text-white transition-colors hover:bg-secondary-600"
            >
              Registrarse
            </Link>
            <Link
              to="/contacto"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-white/25 bg-transparent px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Solicitar información
            </Link>
          </div>
        </div>
      </section>
    </Container>
  </div>
);

export default AboutUsPage;
