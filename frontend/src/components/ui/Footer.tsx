import React from 'react';
import { Link } from 'react-router-dom';
import {
  CheckIcon,
  EnvelopeIcon,
  LockClosedIcon,
  ShieldCheckIcon,
  ShoppingBagIcon,
} from '@heroicons/react/24/outline';
import { Container } from './Container';
import { BRAND_NAME } from '../nav/navData';

const serviceItems = [
  'Seguimiento de pedidos y estados claros en tu cuenta.',
  'Pagos con pasarelas reconocidas en Colombia.',
  'Catálogo con ofertas y campañas de comerciantes verificados.',
  'Cupones y beneficios cuando el comerciante los active.',
];

const securityItems = [
  'Datos tratados conforme a la política de privacidad.',
  'Checkout con comunicación cifrada (HTTPS).',
  'Sesión protegida y buenas prácticas de seguridad en la aplicación.',
  'Atención y garantías alineadas a las políticas publicadas por la plataforma.',
];

const Footer: React.FC = () => {
  return (
    <footer className="border-t border-gray-800 bg-accent-950 text-gray-300">
      <Container className="py-14 sm:py-16">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-5">
            <div className="flex items-start gap-3">
              <img
                src="/images/Logo.png"
                alt={`${BRAND_NAME} logo`}
                className="h-11 w-11 shrink-0 rounded-lg bg-white/5 object-contain ring-1 ring-white/15"
              />
              <div>
                <p className="font-display text-lg font-semibold tracking-tight text-white">{BRAND_NAME}</p>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-gray-400">
                  Conectamos a comerciantes y compradores en un solo entorno: catálogo, carrito y postventa con el
                  rigor que esperas de una operación seria en Colombia.
                </p>
                <Link
                  to="/sobre-nosotros"
                  className="mt-5 inline-flex text-sm font-semibold text-primary-300 transition-colors hover:text-primary-200"
                >
                  Conoce al equipo y los canales institucionales
                </Link>
              </div>
              {/* eslint-enable jsx-a11y/anchor-is-valid */}
            </div>
          </div>

          <div className="grid gap-10 sm:grid-cols-2 lg:col-span-4 lg:grid-cols-2">
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary-400/95">Información</h3>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li>
                  <Link className="text-gray-400 transition-colors hover:text-white" to="/sobre-nosotros">
                    Sobre nosotros
                  </Link>
                </li>
                <li>
                  <Link className="text-gray-400 transition-colors hover:text-white" to="/sobre-nosotros#contacto-institucional">
                    Contacto comercial
                  </Link>
                </li>
                <li>
                  <Link className="text-gray-400 transition-colors hover:text-white" to="/register">
                    Ser comerciante
                  </Link>
                </li>
                <li>
                  <Link className="text-gray-400 transition-colors hover:text-white" to="/productos">
                    Catálogo de productos
                  </Link>
                </li>
                <li className="text-gray-500">Programa de afiliados · próximamente</li>
              </ul>
            </div>
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary-400/95">
                Atención al cliente
              </h3>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li className="text-gray-500">Centro de ayuda · en preparación</li>
                <li>
                  <Link className="text-gray-400 transition-colors hover:text-white" to="/terminos">
                    Términos y condiciones
                  </Link>
                </li>
                <li>
                  <Link className="text-gray-400 transition-colors hover:text-white" to="/privacidad">
                    Política de privacidad
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="grid gap-10 sm:grid-cols-2 lg:col-span-3 lg:grid-cols-1">
            <div>
              <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                <ShoppingBagIcon className="h-4 w-4 text-primary-400" aria-hidden />
                <h3 className="text-sm font-semibold text-white">Servicios</h3>
              </div>
              <ul className="mt-4 space-y-3 text-sm leading-snug">
                {serviceItems.map((label) => (
                  <li key={label} className="flex gap-2.5">
                    <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-primary-500/90" aria-hidden />
                    <span className="text-gray-400">{label}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                <ShieldCheckIcon className="h-4 w-4 text-primary-400" aria-hidden />
                <h3 className="text-sm font-semibold text-white">Confianza y seguridad</h3>
              </div>
              <ul className="mt-4 space-y-3 text-sm leading-snug">
                {securityItems.map((label) => (
                  <li key={label} className="flex gap-2.5">
                    <LockClosedIcon className="mt-0.5 h-4 w-4 shrink-0 text-primary-500/90" aria-hidden />
                    <span className="text-gray-400">{label}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5">
                <ShieldCheckIcon className="h-5 w-5 shrink-0 text-primary-400" aria-hidden />
                <span className="text-xs text-gray-500">Sitio servido mediante conexión cifrada (HTTPS).</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-6 border-t border-gray-800 pt-8 md:flex-row">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <EnvelopeIcon className="h-4 w-4 text-gray-600" aria-hidden />
            Consultas institucionales en{' '}
            <Link className="text-primary-400 hover:text-primary-300" to="/sobre-nosotros">
              Sobre nosotros
            </Link>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-gray-600">
            <span className="text-gray-500">Redes · próximamente</span>
          </div>
        </div>

        <div className="mt-8 border-t border-gray-900 pt-8 text-center">
          <p className="text-xs text-gray-500 sm:text-sm">
            &copy; {new Date().getFullYear()} {BRAND_NAME}. Todos los derechos reservados.
            <span className="mx-2 hidden sm:inline">·</span>
            <br className="sm:hidden" />
            <Link className="text-gray-400 transition-colors hover:text-white" to="/terminos">
              Términos
            </Link>
            <span className="mx-2 text-gray-700">|</span>
            <Link className="text-gray-400 transition-colors hover:text-white" to="/privacidad">
              Privacidad
            </Link>
          </p>
        </div>
      </Container>
    </footer>
  );
};

export default Footer;
