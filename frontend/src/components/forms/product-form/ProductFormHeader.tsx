import React from 'react';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  EllipsisHorizontalIcon,
} from '@heroicons/react/24/outline';
import { Badge, Button } from '../../ui';

interface ProductFormHeaderProps {
  isEditing: boolean;
  isLoading: boolean;
  isDirty: boolean;
  productName?: string;
  onCancel: () => void;
  onSubmit: () => void;
}

export const ProductFormHeader: React.FC<ProductFormHeaderProps> = ({
  isEditing,
  isLoading,
  isDirty,
  productName,
  onCancel,
  onSubmit,
}) => (
  <header className="border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
    <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <nav className="mb-3 flex items-center gap-2 text-sm text-gray-500" aria-label="Breadcrumb">
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
              aria-label="Volver a productos"
            >
              <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
            </button>
            <span>Productos</span>
            <span aria-hidden="true">/</span>
            <span className="truncate font-medium text-gray-900" aria-current="page">
              {isEditing ? productName || 'Editar producto' : 'Nuevo producto'}
            </span>
          </nav>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-gray-950 sm:text-3xl">
              {isEditing ? 'Editar producto' : 'Crear producto'}
            </h1>
            <Badge variant={isEditing ? 'primary' : 'neutral'}>{isEditing ? 'Producto existente' : 'Borrador nuevo'}</Badge>
            {isDirty ? <Badge variant="warning">Cambios sin guardar</Badge> : null}
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
            Organiza contenido, multimedia, precio, inventario y metadata desde una pantalla compacta sin cambiar el contrato del producto.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row lg:pt-1">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="button" onClick={onSubmit} loading={isLoading} disabled={isLoading}>
            <CheckCircleIcon className="h-4 w-4" aria-hidden="true" />
            {isEditing ? 'Guardar cambios' : 'Crear producto'}
          </Button>
          <button
            type="button"
            className="hidden h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 sm:inline-flex"
            aria-label="Más acciones"
          >
            <EllipsisHorizontalIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  </header>
);
