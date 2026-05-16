import React from 'react';
import { Link } from 'react-router-dom';
import {
  HomeIcon,
  ShoppingBagIcon,
  InformationCircleIcon,
  UserIcon,
  ShoppingCartIcon,
  ArrowRightOnRectangleIcon,
  ArrowRightEndOnRectangleIcon,
} from '@heroicons/react/24/outline';
import { BRAND_NAME } from './navData';
import type { NavCategoryLink } from './NavbarCategoryMenu';

interface NavbarMobileMenuProps {
  open: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
  itemCount: number;
  onLogout: () => void;
  categoryLinks: NavCategoryLink[];
}

const linkClass =
  'flex items-center gap-3 rounded-xl py-2.5 pl-1 text-white/95 transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary-400/70';

const NavbarMobileMenu: React.FC<NavbarMobileMenuProps> = ({
  open,
  onClose,
  isAuthenticated,
  itemCount,
  onLogout,
  categoryLinks,
}) => {
  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-dropdown bg-black/40 backdrop-blur-[2px] lg:hidden"
        aria-label="Cerrar menú"
        onClick={onClose}
      />
      <div className="relative z-dropdown overflow-hidden rounded-b-2xl border-x border-b border-white/10 bg-accent-950 shadow-strong lg:hidden">
        <div className="mx-auto max-h-[min(70dvh,calc(100dvh-5rem))] max-w-7xl space-y-5 overflow-y-auto overscroll-contain px-4 py-5">
          <div className="space-y-1">
            <Link to="/" className={linkClass} onClick={onClose}>
              <HomeIcon className="h-5 w-5 shrink-0 text-primary-300/95" aria-hidden />
              <span className="font-medium">Inicio</span>
            </Link>
            <Link to="/productos" className={linkClass} onClick={onClose}>
              <ShoppingBagIcon className="h-5 w-5 shrink-0 text-primary-300/95" aria-hidden />
              <span className="font-medium">Productos</span>
            </Link>
            <Link to="/sobre-nosotros" className={linkClass} onClick={onClose}>
              <InformationCircleIcon className="h-5 w-5 shrink-0 text-primary-300/95" aria-hidden />
              <span className="font-medium">Sobre nosotros</span>
            </Link>
          </div>

          <div className="border-t border-white/10 pt-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-primary-300/95">Categorías</p>
            <div className="space-y-1">
              {categoryLinks.map((c) => (
                <Link
                  key={c.href}
                  to={c.href}
                  className="block rounded-lg py-1.5 text-sm text-emerald-50/95 hover:bg-white/10 hover:text-white"
                  onClick={onClose}
                >
                  {c.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="space-y-2 border-t border-white/10 pt-4">
            {isAuthenticated ? (
              <>
                <Link to="/profile" className={linkClass} onClick={onClose}>
                  <UserIcon className="h-5 w-5 shrink-0 text-primary-300/95" aria-hidden />
                  <span className="font-medium">Mi cuenta</span>
                </Link>
                <Link to="/carrito" className={linkClass} onClick={onClose}>
                  <ShoppingCartIcon className="h-5 w-5 shrink-0 text-primary-300/95" aria-hidden />
                  <span className="font-medium">
                    Carrito
                    {itemCount > 0 ? ` (${itemCount > 99 ? '99+' : itemCount})` : ''}
                  </span>
                </Link>
                <button
                  type="button"
                  className={`${linkClass} w-full text-left`}
                  onClick={() => {
                    onLogout();
                    onClose();
                  }}
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5 shrink-0 text-primary-300/95" aria-hidden />
                  <span className="font-medium">Cerrar sesión</span>
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className={linkClass} onClick={onClose}>
                  <ArrowRightEndOnRectangleIcon className="h-5 w-5 shrink-0 text-primary-300/95" aria-hidden />
                  <span className="font-medium">Iniciar sesión</span>
                </Link>
                <Link
                  to="/register"
                  className="mt-2 block w-full rounded-xl bg-secondary-500 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-secondary-600"
                  onClick={onClose}
                >
                  Registrarse
                </Link>
              </>
            )}
          </div>

          <p className="text-center text-xs text-white/40">{BRAND_NAME}</p>
        </div>
      </div>
    </>
  );
};

export default NavbarMobileMenu;
