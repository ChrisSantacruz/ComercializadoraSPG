import React from 'react';
import { ShieldCheckIcon, TruckIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { Container } from '../ui/Container';

const items = [
  {
    title: 'Operación confiable',
    body: 'Procesos y controles orientados a volumen, con trazabilidad en cada etapa.',
    icon: ShieldCheckIcon,
  },
  {
    title: 'Logística integrada',
    body: 'Coordinación clara entre almacén, despacho y seguimiento al cliente final.',
    icon: TruckIcon,
  },
  {
    title: 'Visibilidad comercial',
    body: 'Listados, filtros y métricas pensados para equipos que venden todos los días.',
    icon: ChartBarIcon,
  },
];

export const HomeTrustStrip: React.FC = () => (
  <section className="border-b border-gray-200 bg-white py-14 sm:py-16">
    <Container>
      <div className="grid gap-8 sm:grid-cols-3">
        {items.map(({ title, body, icon: Icon }) => (
          <div key={title} className="flex gap-4 rounded-xl border border-gray-100 bg-gray-50/60 p-5 shadow-soft">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
              <Icon className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-gray-600">{body}</p>
            </div>
          </div>
        ))}
      </div>
    </Container>
  </section>
);
