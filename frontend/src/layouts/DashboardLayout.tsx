import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  ChartBarIcon,
  ChartPieIcon,
  CubeIcon,
  HeartIcon,
  HomeIcon,
  MapPinIcon,
  ShieldCheckIcon,
  ShoppingBagIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { cn } from '../lib/cn';
import { useAuthStore } from '../stores/authStore';
import { authService } from '../services/authService';
import Footer from '../components/ui/Footer';
import ErrorBoundary from '../components/ui/ErrorBoundary';
import { Drawer } from '../components/ui/Drawer';
import { BRAND_NAME } from '../components/nav/navData';
import { isAdminRole, isMerchantRole } from '../auth/roles';

type NavItem = { name: string; href: string; icon: React.ComponentType<{ className?: string }> };

const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await authService.logout();
      logout();
      navigate('/');
    } catch {
      logout();
      navigate('/');
    }
  };

  const getNavigationItems = (): NavItem[] => {
    const baseItems: NavItem[] = [
      { name: 'Inicio', href: '/', icon: HomeIcon },
      { name: 'Mi perfil', href: '/profile', icon: UserIcon },
      { name: 'Mis pedidos', href: '/orders', icon: ShoppingBagIcon },
    ];

    if (isAdminRole(user?.rol ?? null)) {
      return [
        { name: 'Inicio', href: '/', icon: HomeIcon },
        { name: 'Admin', href: '/admin', icon: ShieldCheckIcon },
        { name: 'Mi perfil', href: '/profile', icon: UserIcon },
      ];
    }

    if (isMerchantRole(user?.rol ?? null)) {
      return [
        ...baseItems,
        { name: 'Dashboard', href: '/merchant', icon: ChartBarIcon },
        { name: 'Productos', href: '/merchant/products', icon: CubeIcon },
        { name: 'Análisis', href: '/merchant/analytics', icon: ChartPieIcon },
      ];
    }

    return [
      ...baseItems,
      { name: 'Favoritos', href: '/favorites', icon: HeartIcon },
      { name: 'Direcciones', href: '/addresses', icon: MapPinIcon },
    ];
  };

  const navigationItems = getNavigationItems();

  const navLinkClass = (href: string) =>
    cn(
      'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
      location.pathname === href || (href !== '/' && location.pathname.startsWith(href))
        ? 'bg-primary-50 text-primary-800'
        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900',
    );

  const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="space-y-1">
      {navigationItems.map((item) => {
        const Icon = item.icon;
        return (
          <Link key={item.href} to={item.href} className={navLinkClass(item.href)} onClick={onNavigate}>
            <Icon className="h-5 w-5 shrink-0 text-gray-500 group-hover:text-gray-700" aria-hidden />
            {item.name}
          </Link>
        );
      })}
      <button
        type="button"
        onClick={() => {
          void handleLogout();
          onNavigate?.();
        }}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-error-700 transition-colors hover:bg-error-50"
      >
        <ArrowRightOnRectangleIcon className="h-5 w-5 shrink-0" aria-hidden />
        Cerrar sesión
      </button>
    </nav>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-nav border-b border-gray-200 bg-white/95 shadow-sm backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <button
              type="button"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 lg:hidden"
              aria-label="Abrir menú"
              onClick={() => setMobileNavOpen(true)}
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
            <Link to="/" className="flex min-w-0 items-center gap-2 sm:gap-3">
              <img
                src="/images/Logo.png"
                alt={BRAND_NAME}
                className="h-8 w-8 shrink-0 rounded-lg object-contain sm:h-9 sm:w-9"
              />
              <div className="min-w-0">
                <p className="truncate font-display text-base font-semibold text-gray-900 sm:text-lg">{BRAND_NAME}</p>
                <p className="truncate text-xs text-gray-500 sm:text-sm">Panel de cuenta</p>
              </div>
            </Link>
          </div>
          <div className="hidden max-w-[12rem] items-center gap-2 sm:flex sm:max-w-none md:gap-3">
            <span className="hidden truncate text-sm text-gray-600 md:inline">Hola, {user?.nombre}</span>
            <span className="shrink-0 rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-medium capitalize text-primary-800">
              {user?.rol}
            </span>
          </div>
        </div>
      </header>

      <Drawer open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} title="Menú" side="left" className="lg:hidden">
        <div className="border-b border-gray-100 pb-4">
          <p className="text-sm font-medium text-gray-900">{user?.nombre}</p>
          <p className="text-xs text-gray-500 capitalize">{user?.rol}</p>
        </div>
        <div className="pt-4">
          <NavLinks onNavigate={() => setMobileNavOpen(false)} />
        </div>
      </Drawer>

      <div className="mx-auto flex w-full max-w-7xl min-w-0 gap-0 lg:gap-0">
        <aside className="hidden w-56 shrink-0 border-r border-gray-200 bg-white lg:block xl:w-60">
          <nav className="sticky top-20 space-y-1 px-3 py-6">
            <NavLinks />
          </nav>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
          <ErrorBoundary zone="dashboard">
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      <Footer />
    </div>
  );
};

export default DashboardLayout;
