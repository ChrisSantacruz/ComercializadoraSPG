import React from 'react';
import { Link } from 'react-router-dom';
import { HomeIcon, ShoppingBagIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import NavbarCategoryMenu from './NavbarCategoryMenu';
import type { NavCategoryLink } from './NavbarCategoryMenu';

interface NavbarDesktopNavProps {
  categoriesOpen: boolean;
  onToggleCategories: () => void;
  categoryLinks: NavCategoryLink[];
}

const linkClass =
  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-1.5 text-[13px] font-medium text-white/92 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary-400/80 lg:gap-2 xl:text-sm';

const NavbarDesktopNav: React.FC<NavbarDesktopNavProps> = ({
  categoriesOpen,
  onToggleCategories,
  categoryLinks,
}) => (
  <nav className="hidden items-center gap-1 lg:flex xl:gap-3" aria-label="Principal">
    <Link to="/" className={linkClass}>
      <HomeIcon className="h-5 w-5 shrink-0" aria-hidden />
      <span>Inicio</span>
    </Link>
    <Link to="/productos" className={linkClass}>
      <ShoppingBagIcon className="h-5 w-5 shrink-0" aria-hidden />
      <span>Productos</span>
    </Link>
    <NavbarCategoryMenu open={categoriesOpen} onToggle={onToggleCategories} items={categoryLinks} />
    <Link to="/sobre-nosotros" className={linkClass}>
      <InformationCircleIcon className="h-5 w-5 shrink-0" aria-hidden />
      <span>Sobre nosotros</span>
    </Link>
  </nav>
);

export default NavbarDesktopNav;
