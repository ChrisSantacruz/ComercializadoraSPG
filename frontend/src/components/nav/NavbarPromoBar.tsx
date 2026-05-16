import React from 'react';
import { TruckIcon, ArrowPathIcon, PhoneIcon } from '@heroicons/react/24/outline';
import { Container } from '../ui/Container';

const NavbarPromoBar: React.FC = () => (
  <div className="hidden border-b border-white/[0.06] bg-accent-900 text-primary-50 md:block">
    <Container className="py-2">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[11px] lg:text-xs">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-1.5 text-primary-100/95">
            <TruckIcon className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
            <span className="font-medium text-primary-50">Logística nacional</span>
          </span>
          <span className="inline-flex items-center gap-1.5 text-primary-100/95">
            <ArrowPathIcon className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
            <span className="font-medium text-primary-50">Políticas transparentes</span>
          </span>
        </div>
        <span className="inline-flex items-center gap-1.5 text-primary-200/95">
          <PhoneIcon className="h-3.5 w-3.5 shrink-0 opacity-95" aria-hidden />
          Soporte comercial en horario hábil
        </span>
      </div>
    </Container>
  </div>
);

export default NavbarPromoBar;
