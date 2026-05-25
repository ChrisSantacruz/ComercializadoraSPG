import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  Bars3Icon,
  XMarkIcon,
  UserIcon,
  ShoppingCartIcon,
  ArrowRightOnRectangleIcon,
  ArrowRightEndOnRectangleIcon,
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../../stores/authStore';
import { useCartStore } from '../../stores/cartStore';
import { authService } from '../../services/authService';
import { useNotifications } from './NotificationContainer';
import { Container } from './Container';
import NavbarPromoBar from '../nav/NavbarPromoBar';
import NavbarDesktopNav from '../nav/NavbarDesktopNav';
import NavbarMobileMenu from '../nav/NavbarMobileMenu';
import NavbarSearchStrip from '../nav/NavbarSearchStrip';
import { BRAND_NAME, BRAND_TAGLINE } from '../nav/navData';
import { useNavCategories } from '../../hooks/useNavCategories';

const Navbar: React.FC = () => {
  const { isAuthenticated, logout, user } = useAuthStore();
  const { getItemCount } = useCartStore();
  const { showError } = useNotifications();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCategories, setShowCategories] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const navCategories = useNavCategories();
  const categoryLinks = useMemo(
    () => navCategories.map((c) => ({ href: `/productos?categoria=${c._id}`, label: c.nombre })),
    [navCategories],
  );
  const categoryMenuItems = useMemo(
    () =>
      categoryLinks.length > 0 ? categoryLinks : [{ href: '/productos', label: 'Ver catálogo completo' }],
    [categoryLinks],
  );

  const handleLogout = async () => {
    try {
      await authService.logout();
      logout();
      navigate('/');
    } catch {
      showError('Sesión', 'No se pudo cerrar sesión en el servidor; saliste localmente.');
      logout();
      navigate('/');
    }
  };

  const toggleSearch = () => {
    const next = !showSearch;
    setShowSearch(next);
    if (next) {
      window.setTimeout(() => {
        document.getElementById('navbar-search-input')?.focus();
      }, 50);
    }
  };

  const iconBtn =
    'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-white shadow-sm transition-colors hover:bg-white/16 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary-400/80 sm:h-10 sm:w-10';

  return (
    <>
      <NavbarPromoBar />
      <header className="sticky top-0 z-nav overflow-visible border-b border-white/[0.08] bg-accent-950 text-white shadow-sm">
        <Container className="relative">
          <div className="flex min-h-[3.75rem] items-center justify-between gap-2 py-1 sm:min-h-[4rem] sm:py-1.5">
            <div className="flex min-w-0 items-center gap-2 sm:gap-4 lg:gap-6">
              <Link to="/" className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-2.5">
                <img
                  src="/images/Logo.png"
                  alt={BRAND_NAME}
                  className="h-9 w-9 shrink-0 rounded-lg bg-white/5 object-contain ring-1 ring-white/20 sm:h-10 sm:w-10"
                />
                <div className="hidden min-w-0 sm:block">
                  <p className="truncate font-display text-sm font-semibold leading-tight text-white sm:text-base">
                    {BRAND_NAME}
                  </p>
                  <p className="hidden truncate text-[11px] leading-snug text-primary-50/92 lg:block">
                    {BRAND_TAGLINE}
                  </p>
                </div>
              </Link>

              <NavbarDesktopNav
                categoriesOpen={showCategories}
                onToggleCategories={() => setShowCategories((v) => !v)}
                categoryLinks={categoryMenuItems}
              />
            </div>

            <div className="hidden flex-1 justify-center sm:flex sm:max-w-xs">
              <button type="button" onClick={toggleSearch} className={iconBtn} aria-label="Abrir búsqueda">
                <MagnifyingGlassIcon className="h-5 w-5 sm:h-5 sm:w-5" />
              </button>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
              {isAuthenticated ? (
                <>
                  <Link
                    to="/profile"
                    className="hidden items-center gap-1.5 rounded-lg px-1.5 py-1 text-white/90 transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary-400/80 lg:inline-flex"
                  >
                    <UserIcon className="h-5 w-5 shrink-0" aria-hidden />
                    <span className="max-w-[8rem] truncate text-xs font-medium xl:text-sm">
                      {user?.nombre || 'Mi cuenta'}
                    </span>
                  </Link>
                  <Link
                    to="/carrito"
                    className="relative rounded-lg p-1.5 text-white/90 transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary-400/80"
                    aria-label={`Carrito, ${getItemCount()} artículos`}
                  >
                    <ShoppingCartIcon className="h-5 w-5" />
                    {getItemCount() > 0 ? (
                      <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] translate-x-[1px] items-center justify-center rounded-full border border-white/20 bg-secondary-500 px-1 text-[10px] font-bold text-white shadow-sm sm:text-[11px]">
                        {getItemCount() > 99 ? '99+' : getItemCount()}
                      </span>
                    ) : null}
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="hidden items-center gap-1.5 rounded-lg px-1.5 py-1 text-white/90 transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary-400/80 lg:inline-flex"
                  >
                    <ArrowRightOnRectangleIcon className="h-5 w-5 shrink-0" aria-hidden />
                    <span className="text-xs font-medium xl:text-sm">Salir</span>
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="hidden items-center gap-1.5 rounded-lg px-1.5 py-1 text-white/90 transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary-400/80 lg:inline-flex"
                  >
                    <ArrowRightEndOnRectangleIcon className="h-5 w-5 shrink-0" aria-hidden />
                    <span className="text-xs font-medium xl:text-sm">Iniciar sesión</span>
                  </Link>
                  <Link
                    to="/register"
                    className="hidden rounded-lg bg-secondary-500 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-secondary-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary-300 lg:inline-block lg:px-4 lg:py-2.5 lg:text-sm"
                  >
                    Registrarse
                  </Link>
                </>
              )}

              <button
                type="button"
                className={`${iconBtn} lg:hidden`}
                onClick={() => setShowMobileMenu((v) => !v)}
                aria-expanded={showMobileMenu}
                aria-label={showMobileMenu ? 'Cerrar menú' : 'Abrir menú'}
              >
                {showMobileMenu ? <XMarkIcon className="h-5 w-5" /> : <Bars3Icon className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </Container>

        <NavbarSearchStrip
          open={showSearch}
          query={searchQuery}
          onQueryChange={setSearchQuery}
          onClose={() => setShowSearch(false)}
        />

        <NavbarMobileMenu
          open={showMobileMenu}
          onClose={() => setShowMobileMenu(false)}
          isAuthenticated={isAuthenticated}
          itemCount={getItemCount()}
          onLogout={handleLogout}
          categoryLinks={categoryMenuItems}
        />
      </header>
    </>
  );
};

export default Navbar;
