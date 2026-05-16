import React from 'react';
import { Link } from 'react-router-dom';
import { Container } from '../ui/Container';

export const HomeCtaSection: React.FC = () => (
  <section className="bg-primary-700 py-14 text-white sm:py-16">
    <Container className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
      <div className="max-w-xl">
        <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          ¿Listo para abastecer tu operación?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-primary-100 sm:text-base">
          Agenda una conversación con nuestro equipo o revisa inventario disponible en tiempo real en el catálogo.
        </p>
      </div>
      <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        <Link
          to="/productos"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-white px-6 text-sm font-semibold text-primary-800 shadow-soft transition-colors hover:bg-gray-50"
        >
          Explorar catálogo
        </Link>
        <Link
          to="/sobre-nosotros#contacto-institucional"
          className="inline-flex h-11 items-center justify-center rounded-xl border border-white/40 px-6 text-sm font-semibold text-white transition-colors hover:bg-white/10"
        >
          Contacto comercial
        </Link>
      </div>
    </Container>
  </section>
);
