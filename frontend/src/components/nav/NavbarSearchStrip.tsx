import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { Container } from '../ui/Container';

interface NavbarSearchStripProps {
  open: boolean;
  query: string;
  onQueryChange: (q: string) => void;
  onClose: () => void;
}

const SUGGESTIONS = ['Electrónica', 'Ropa', 'Hogar', 'Deportes', 'Belleza'] as const;

const NavbarSearchStrip: React.FC<NavbarSearchStripProps> = ({
  open,
  query,
  onQueryChange,
  onClose,
}) => {
  const navigate = useNavigate();

  if (!open) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    navigate(`/productos?q=${encodeURIComponent(q)}`);
    onClose();
  };

  return (
    <div className="border-t border-white/10 bg-accent-950 backdrop-blur-sm">
      <Container className="py-4 sm:py-5">
        <form onSubmit={submit} className="relative mx-auto max-w-4xl">
          <label htmlFor="navbar-search-input" className="sr-only">
            Buscar productos
          </label>
          <div className="relative flex items-center">
            <MagnifyingGlassIcon
              className="pointer-events-none absolute left-3 h-5 w-5 text-white/45 sm:left-4 sm:h-5 sm:w-5"
              aria-hidden
            />
            <input
              id="navbar-search-input"
              type="search"
              autoComplete="off"
              placeholder="Buscar productos…"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white py-3 pl-10 pr-24 text-sm text-gray-900 shadow-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-secondary-400 sm:rounded-2xl sm:py-3.5 sm:pl-14 sm:pr-28 sm:text-base"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg bg-accent-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-accent-600 sm:right-2 sm:px-4 sm:py-2 sm:text-sm"
            >
              Buscar
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-white/55 sm:text-sm">Populares:</span>
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => {
                  onQueryChange(suggestion);
                  navigate(`/productos?q=${encodeURIComponent(suggestion)}`);
                  onClose();
                }}
                className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-xs text-white/90 transition-colors hover:bg-white/18 sm:text-sm"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </form>
      </Container>
    </div>
  );
};

export default NavbarSearchStrip;
