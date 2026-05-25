import React from 'react';
import {
  CheckCircleIcon,
  ClockIcon,
  CubeIcon,
  EyeIcon,
  PhotoIcon,
  TagIcon,
} from '@heroicons/react/24/outline';
import { Badge, Button, Card, CardBody, CardHeader } from '../../ui';
import ProductImage from '../../ui/ProductImage';
import { ProductDraft, ImagePreview } from './types';
import { formatCurrency, getStockStatus, parseTags } from './productFormUtils';

interface ProductFormSidebarProps {
  draft: ProductDraft;
  images: ImagePreview[];
  existingCover?: string;
  isEditing: boolean;
  isLoading: boolean;
  isDirty: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}

export const ProductFormSidebar: React.FC<ProductFormSidebarProps> = ({
  draft,
  images,
  existingCover,
  isEditing,
  isLoading,
  isDirty,
  onSubmit,
  onCancel,
}) => {
  const stockStatus = getStockStatus(draft.stock);
  const tags = parseTags(draft.tags);
  const previewImage = images[0]?.url || existingCover;

  return (
    <aside className="space-y-4" aria-label="Resumen del producto">
      <Card className="overflow-hidden">
        <CardHeader className="px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-950">Resumen</h2>
              <p className="text-xs text-gray-500">{isDirty ? 'Cambios pendientes' : 'Sin cambios pendientes'}</p>
            </div>
            <Badge variant={isEditing ? 'primary' : 'neutral'}>{isEditing ? 'Edición' : 'Nuevo'}</Badge>
          </div>
        </CardHeader>
        <CardBody className="space-y-4 px-4 py-4">
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
            {previewImage ? (
              <ProductImage src={previewImage} alt="Vista previa del producto" className="aspect-[4/3] w-full object-cover" />
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center text-gray-400">
                <PhotoIcon className="h-8 w-8" aria-hidden="true" />
              </div>
            )}
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-950">{draft.nombre || 'Producto sin nombre'}</p>
            <p className="mt-1 text-lg font-semibold text-gray-950">{formatCurrency(draft.precio)}</p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <CubeIcon className="mb-1 h-4 w-4 text-gray-500" aria-hidden="true" />
              <p className="font-medium text-gray-950">{draft.stock || '0'} unidades</p>
              <p className="text-gray-500">Inventario</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <TagIcon className="mb-1 h-4 w-4 text-gray-500" aria-hidden="true" />
              <p className="font-medium text-gray-950">{tags.length}</p>
              <p className="text-gray-500">Etiquetas</p>
            </div>
          </div>

          <div className="space-y-2 rounded-xl border border-gray-200 bg-white p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-gray-500">Estado visual</span>
              <Badge variant={stockStatus.tone}>{stockStatus.label}</Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <EyeIcon className="h-4 w-4" aria-hidden="true" />
              Visible solo tras aprobación admin
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              {isLoading ? <ClockIcon className="h-4 w-4" aria-hidden="true" /> : <CheckCircleIcon className="h-4 w-4" aria-hidden="true" />}
              {isLoading ? 'Guardando cambios' : 'Listo para guardar'}
            </div>
          </div>

          <div className="hidden space-y-2 lg:block">
            <Button type="button" onClick={onSubmit} loading={isLoading} disabled={isLoading} className="w-full">
              {isEditing ? 'Guardar cambios' : 'Crear producto'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading} className="w-full">
              Cancelar
            </Button>
          </div>
        </CardBody>
      </Card>
    </aside>
  );
};
