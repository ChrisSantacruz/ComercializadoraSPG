import React from 'react';
import { FunnelIcon } from '@heroicons/react/24/outline';
import type { Category, ProductFilters } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';

export interface ProductFiltersPanelProps {
  filters: ProductFilters;
  qInput: string;
  onQChange: (value: string) => void;
  categories: Category[];
  categoriesError: string | null;
  onChange: (key: keyof ProductFilters, value: unknown) => void;
  onClear: () => void;
  onCloseMobile?: () => void;
}

export const ProductFiltersPanel: React.FC<ProductFiltersPanelProps> = ({
  filters,
  qInput,
  onQChange,
  categories,
  categoriesError,
  onChange,
  onClear,
  onCloseMobile,
}) => (
  <div className="space-y-6">
    <div className="flex items-center justify-between border-b border-gray-100 pb-4">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
          <FunnelIcon className="h-5 w-5" aria-hidden />
        </span>
        <h3 className="text-base font-semibold text-gray-900">Filtros</h3>
      </div>
      <Button type="button" variant="ghost" size="sm" onClick={onClear}>
        Limpiar
      </Button>
    </div>

    <div className="space-y-2">
      <label htmlFor="catalog-q" className="text-sm font-medium text-gray-700">
        Búsqueda
      </label>
      <Input
        id="catalog-q"
        value={qInput}
        onChange={(e) => onQChange(e.target.value)}
        placeholder="Nombre o palabra clave"
        autoComplete="off"
      />
    </div>

    <div className="space-y-2">
      <label htmlFor="catalog-cat" className="text-sm font-medium text-gray-700">
        Categoría
      </label>
      <Select
        id="catalog-cat"
        value={filters.categoria || ''}
        onChange={(e) => onChange('categoria', e.target.value)}
      >
        <option value="">Todas</option>
        {categories.map((c) => (
          <option key={c._id} value={c._id}>
            {c.nombre}
          </option>
        ))}
      </Select>
      {categoriesError ? <p className="text-xs text-error-600">{categoriesError}</p> : null}
    </div>

    <div className="space-y-2">
      <span className="text-sm font-medium text-gray-700">Precio</span>
      <div className="grid grid-cols-2 gap-3">
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          placeholder="Mín"
          value={filters.precioMin ?? ''}
          onChange={(e) =>
            onChange('precioMin', e.target.value === '' ? undefined : Number(e.target.value))
          }
        />
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          placeholder="Máx"
          value={filters.precioMax ?? ''}
          onChange={(e) =>
            onChange('precioMax', e.target.value === '' ? undefined : Number(e.target.value))
          }
        />
      </div>
    </div>

    <div className="space-y-2">
      <label htmlFor="catalog-sort" className="text-sm font-medium text-gray-700">
        Ordenar
      </label>
      <Select
        id="catalog-sort"
        value={filters.ordenar || 'fecha-desc'}
        onChange={(e) => onChange('ordenar', e.target.value)}
      >
        <option value="fecha-desc">Más recientes</option>
        <option value="fecha-asc">Más antiguos</option>
        <option value="precio-asc">Precio: menor a mayor</option>
        <option value="precio-desc">Precio: mayor a menor</option>
        <option value="popular">Más populares</option>
        <option value="calificacion">Mejor calificados</option>
      </Select>
    </div>

    {onCloseMobile ? (
      <Button type="button" variant="primary" className="w-full lg:hidden" onClick={onCloseMobile}>
        Ver resultados
      </Button>
    ) : null}
  </div>
);
