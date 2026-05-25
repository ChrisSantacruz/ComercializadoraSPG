import React, { useMemo, useState } from 'react';
import { Combobox } from '@headlessui/react';
import {
  ArrowPathIcon,
  CheckIcon,
  ChevronUpDownIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  TagIcon,
} from '@heroicons/react/24/outline';
import { Category } from '../../../types';
import { cn } from '../../../lib/cn';
import { Button, Skeleton } from '../../ui';

interface CategoryComboboxProps {
  id?: string;
  name?: string;
  value: string;
  categories: Category[];
  loading: boolean;
  error: string | null;
  disabled?: boolean;
  invalid?: boolean;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  onChange: (categoryId: string) => void;
  onRetry: () => void;
}

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export const CategoryCombobox: React.FC<CategoryComboboxProps> = ({
  id,
  name,
  value,
  categories,
  loading,
  error,
  disabled,
  invalid,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
  onChange,
  onRetry,
}) => {
  const [query, setQuery] = useState('');
  const selectedCategory = categories.find((category) => category._id === value) ?? null;

  const filteredCategories = useMemo(() => {
    const trimmed = normalize(query.trim());
    if (!trimmed) return categories;

    return categories.filter((category) => normalize(category.nombre).includes(trimmed));
  }, [categories, query]);

  if (loading && categories.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-error-200 bg-error-50 p-4 shadow-sm" role="alert">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-error-600 shadow-sm">
            <ExclamationTriangleIcon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-error-800">No se pudieron cargar las categorías</p>
            <p className="mt-1 text-sm text-error-700">{error}</p>
            <Button type="button" variant="outline" size="sm" className="mt-3" onClick={onRetry}>
              <ArrowPathIcon className="h-4 w-4" aria-hidden="true" />
              Reintentar carga
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm" role="status">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-amber-600 shadow-sm">
            <TagIcon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-amber-900">No hay categorías activas</p>
            <p className="mt-1 text-sm text-amber-800">
              Un administrador debe activar al menos una categoría antes de crear productos.
            </p>
            <Button type="button" variant="outline" size="sm" className="mt-3" onClick={onRetry}>
              <ArrowPathIcon className="h-4 w-4" aria-hidden="true" />
              Revisar nuevamente
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Combobox
      value={selectedCategory}
      onChange={(category) => onChange(category?._id ?? '')}
      by="_id"
      disabled={disabled}
      immediate
    >
      <input type="hidden" name={name} value={value} />
      <div className="relative">
        <div
          className={cn(
            'relative overflow-hidden rounded-2xl border bg-white shadow-sm transition',
            'focus-within:border-primary-500 focus-within:ring-4 focus-within:ring-primary-500/10',
            invalid || ariaInvalid ? 'border-error-300 ring-4 ring-error-500/10' : 'border-gray-200',
            disabled ? 'opacity-60' : 'hover:border-gray-300',
          )}
        >
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400">
            <MagnifyingGlassIcon className="h-5 w-5" aria-hidden="true" />
          </div>
          <Combobox.Input
            id={id}
            className="h-12 w-full border-0 bg-transparent pl-11 pr-12 text-sm font-medium text-gray-950 placeholder:text-gray-400 focus:outline-none focus:ring-0"
            displayValue={(category: Category | null) => category?.nombre ?? ''}
            onChange={(event) => setQuery(event.target.value)}
            onBlur={() => setQuery('')}
            placeholder="Buscar y seleccionar categoría"
            aria-describedby={ariaDescribedBy}
            aria-invalid={ariaInvalid}
          />
          <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600">
            {loading ? (
              <ArrowPathIcon className="h-5 w-5 animate-spin" aria-hidden="true" />
            ) : (
              <ChevronUpDownIcon className="h-5 w-5" aria-hidden="true" />
            )}
          </Combobox.Button>
        </div>

        <Combobox.Options className="absolute z-dropdown mt-2 max-h-72 w-full overflow-auto rounded-2xl border border-gray-200 bg-white p-2 shadow-strong focus:outline-none">
          {filteredCategories.length === 0 ? (
            <div className="rounded-xl bg-gray-50 px-4 py-5 text-center">
              <p className="text-sm font-semibold text-gray-900">Sin resultados</p>
              <p className="mt-1 text-xs text-gray-500">Prueba con otro nombre o revisa las categorías activas.</p>
            </div>
          ) : (
            filteredCategories.map((category) => (
              <Combobox.Option
                key={category._id}
                value={category}
                className={({ active }) =>
                  cn(
                    'relative cursor-pointer select-none rounded-xl px-3 py-3 transition',
                    active ? 'bg-primary-50 text-primary-900' : 'text-gray-900',
                  )
                }
              >
                {({ active, selected }) => (
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border',
                        active ? 'border-primary-200 bg-white text-primary-700' : 'border-gray-200 bg-gray-50 text-gray-500',
                      )}
                    >
                      <TagIcon className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <p className="min-w-0 flex-1 truncate text-sm font-semibold">{category.nombre}</p>
                    {selected ? (
                      <CheckIcon className="h-5 w-5 shrink-0 text-primary-600" aria-hidden="true" />
                    ) : null}
                  </div>
                )}
              </Combobox.Option>
            ))
          )}
        </Combobox.Options>
      </div>
    </Combobox>
  );
};
