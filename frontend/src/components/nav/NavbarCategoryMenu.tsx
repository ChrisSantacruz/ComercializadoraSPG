import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

export interface NavCategoryLink {
  href: string;
  label: string;
}

interface NavbarCategoryMenuProps {
  open: boolean;
  onToggle: () => void;
  items: NavCategoryLink[];
}

const NavbarCategoryMenu: React.FC<NavbarCategoryMenuProps> = ({ open, onToggle, items }) => (
  <div className="relative">
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-white/92 transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary-400/80 xl:text-[15px]"
      aria-expanded={open}
      aria-haspopup="true"
    >
      <span>Categorías</span>
      <ChevronDownIcon className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
    </button>
    {open ? (
      <div
        className="absolute left-0 top-full z-dropdown mt-2 max-h-[min(70vh,24rem)] w-64 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-medium"
        role="menu"
      >
        {items.map((c) => (
          <Link
            key={c.href}
            to={c.href}
            role="menuitem"
            className="block px-4 py-2 text-sm text-gray-800 transition-colors hover:bg-primary-50 hover:text-primary-800"
            onClick={onToggle}
          >
            {c.label}
          </Link>
        ))}
      </div>
    ) : null}
  </div>
);

export default NavbarCategoryMenu;
