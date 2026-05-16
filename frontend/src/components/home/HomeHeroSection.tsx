import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import { Container } from '../ui/Container';
import { BRAND_NAME } from '../nav/navData';

export const HomeHeroSection: React.FC = () => (
  <section className="border-b border-gray-200/80 bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white">
    <Container className="flex min-h-[min(72svh,640px)] flex-col justify-center py-16 sm:py-20 lg:py-24">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary-300">
          Comercialización B2B · Marketplace
        </p>
        <h1 className="mt-4 font-display text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
          {BRAND_NAME}
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-gray-300 sm:text-lg">
          Catálogo unificado, operación estable y experiencia tipo SaaS para equipos que exigen claridad,
          cumplimiento y escala.
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            to="/productos"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-secondary-500 px-6 text-sm font-semibold text-white shadow-soft transition-colors hover:bg-secondary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary-300 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
          >
            Ver catálogo
            <ArrowRightIcon className="h-4 w-4" aria-hidden />
          </Link>
          <Link
            to="/sobre-nosotros#contacto-institucional"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-white/25 px-6 text-sm font-semibold text-white transition-colors hover:border-white/40 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
          >
            Hablar con ventas
          </Link>
        </div>
      </div>
    </Container>
  </section>
);
