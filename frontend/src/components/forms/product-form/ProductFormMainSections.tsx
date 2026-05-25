import React, { ChangeEvent } from 'react';
import {
  ChartBarIcon,
  DocumentTextIcon,
  PhotoIcon,
  Squares2X2Icon,
  TagIcon,
} from '@heroicons/react/24/outline';
import { Badge, FormField, Input, Textarea } from '../../ui';
import { Category } from '../../../types';
import { MediaDropzone } from './MediaDropzone';
import { CategoryCombobox } from './CategoryCombobox';
import { ProductFormSection } from './ProductFormSection';
import { TagEditor } from './TagEditor';
import { ExistingMediaItem, MediaPreview, ProductDraft, ProductFormErrors, ProductVariantDraft } from './types';
import { formatCurrency, getStockStatus, parseTags } from './productFormUtils';
import { ProductVariantBuilder } from './ProductVariantBuilder';

interface ProductFormMainSectionsProps {
  draft: ProductDraft;
  variants: ProductVariantDraft[];
  hasVariants: boolean;
  variantStockTotal: number;
  errors: ProductFormErrors;
  categories: Category[];
  categoriesLoading: boolean;
  categoryError: string | null;
  images: MediaPreview[];
  videos: MediaPreview[];
  existingMedia?: ExistingMediaItem[];
  mediaError?: string | null;
  uploadProgress?: number | null;
  disabled?: boolean;
  onDraftChange: (name: keyof ProductDraft, value: string) => void;
  onCategoryRetry: () => void;
  onVariantsChange: (variants: ProductVariantDraft[]) => void;
  onAddImages: (files: File[]) => void;
  onAddVideos: (files: File[]) => void;
  onRemoveImage: (id: string) => void;
  onRemoveVideo: (id: string) => void;
  onMoveImage: (id: string, direction: -1 | 1) => void;
  onRemoveExisting?: (mediaId: string) => void;
  onMoveExisting?: (mediaId: string, direction: -1 | 1) => void;
}

export const ProductFormMainSections: React.FC<ProductFormMainSectionsProps> = ({
  draft,
  variants,
  hasVariants,
  variantStockTotal,
  errors,
  categories,
  categoriesLoading,
  categoryError,
  images,
  videos,
  existingMedia,
  mediaError,
  uploadProgress,
  disabled,
  onDraftChange,
  onCategoryRetry,
  onVariantsChange,
  onAddImages,
  onAddVideos,
  onRemoveImage,
  onRemoveVideo,
  onMoveImage,
  onRemoveExisting,
  onMoveExisting,
}) => {
  const stockStatus = getStockStatus(hasVariants ? String(variantStockTotal) : draft.stock);
  const tags = parseTags(draft.tags);

  const handleDraftChange =
    (name: keyof ProductDraft) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      onDraftChange(name, event.target.value);
    };

  return (
    <div className="space-y-5">
      <ProductFormSection
        id="general"
        title="Información general"
        description="Nombre, descripción y narrativa comercial principal del producto."
        aside={<SectionMetric icon={DocumentTextIcon} label="Contenido" value={`${draft.descripcion.length}/2000`} />}
      >
        <div className="grid gap-5">
          <FormField id="nombre" label="Nombre del producto" required error={errors.nombre} hint="Usa un nombre claro y buscable.">
            <Input
              name="nombre"
              value={draft.nombre}
              onChange={handleDraftChange('nombre')}
              disabled={disabled}
              placeholder="Ej. Set de organización para cocina"
              className={errors.nombre ? 'border-error-300 focus:border-error-500 focus:ring-error-500/20' : ''}
            />
          </FormField>
        </div>

        <FormField id="descripcion" label="Descripción" required error={errors.descripcion} hint="Mínimo recomendado: 10 caracteres.">
          <Textarea
            name="descripcion"
            value={draft.descripcion}
            onChange={handleDraftChange('descripcion')}
            rows={6}
            disabled={disabled}
            placeholder="Describe beneficios, materiales, uso y detalles que ayuden a comprar con confianza."
            className={errors.descripcion ? 'border-error-300 focus:border-error-500 focus:ring-error-500/20' : ''}
          />
        </FormField>
      </ProductFormSection>

      <ProductFormSection
        id="media"
        title="Multimedia"
        description="Imágenes limpias, ordenadas y con una portada visual clara para catálogo."
        aside={
          <SectionMetric
            icon={PhotoIcon}
            label="Medios nuevos"
            value={`${images.length} img · ${videos.length} vid`}
          />
        }
      >
        <MediaDropzone
          images={images}
          videos={videos}
          existingMedia={existingMedia}
          disabled={disabled}
          uploadProgress={uploadProgress}
          error={mediaError}
          onAddImages={onAddImages}
          onAddVideos={onAddVideos}
          onRemoveImage={onRemoveImage}
          onRemoveVideo={onRemoveVideo}
          onMoveImage={onMoveImage}
          onRemoveExisting={onRemoveExisting}
          onMoveExisting={onMoveExisting}
        />
      </ProductFormSection>

      <ProductFormSection
        id="pricing"
        title="Precio e inventario"
        description="Datos comerciales compactos, alineados y fáciles de revisar antes de publicar."
        aside={<SectionMetric icon={ChartBarIcon} label="Precio actual" value={formatCurrency(draft.precio)} />}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FormField id="precio" label="Precio principal" required error={errors.precio} hint="COP">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-400">$</span>
              <Input
                type="number"
                name="precio"
                value={draft.precio}
                onChange={handleDraftChange('precio')}
                min="0"
                step="100"
                disabled={disabled}
                placeholder="129900"
                className={`pl-8 ${errors.precio ? 'border-error-300 focus:border-error-500 focus:ring-error-500/20' : ''}`}
              />
            </div>
          </FormField>

          <FormField
            id="stock"
            label={hasVariants ? 'Stock total (variantes)' : 'Stock disponible'}
            error={errors.stock}
            hint={hasVariants ? 'Calculado automáticamente como suma del stock de variantes activas.' : 'Unidades vendibles.'}
          >
            <Input
              type="number"
              name="stock"
              value={hasVariants ? String(variantStockTotal) : draft.stock}
              onChange={handleDraftChange('stock')}
              min="0"
              disabled={disabled || hasVariants}
              readOnly={hasVariants}
              placeholder="24"
              className={errors.stock ? 'border-error-300 focus:border-error-500 focus:ring-error-500/20' : hasVariants ? 'bg-gray-50' : ''}
            />
          </FormField>

          <div className="min-w-0 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex min-w-0 flex-col gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-950">Estado inventario</p>
                <p className="mt-1 text-xs text-gray-500">Calculado visualmente desde stock.</p>
              </div>
              <div className="flex min-w-0">
                <Badge variant={stockStatus.tone} className="max-w-full whitespace-normal text-left leading-5">
                  {stockStatus.label}
                </Badge>
              </div>
            </div>
          </div>
        </div>

      </ProductFormSection>

      <ProductFormSection
        id="categories"
        title="Categorías y etiquetas"
        description="Clasificación comercial para búsqueda, navegación y filtros del catálogo."
        aside={<SectionMetric icon={TagIcon} label="Etiquetas" value={String(tags.length)} />}
      >
        <FormField
          id="categoria"
          label="Categoría"
          required
          error={errors.categoria}
          hint={categoryError || undefined}
        >
          <CategoryCombobox
            name="categoria"
            value={draft.categoria}
            categories={categories}
            loading={categoriesLoading}
            error={categoryError}
            disabled={disabled}
            invalid={Boolean(errors.categoria)}
            onChange={(categoryId) => onDraftChange('categoria', categoryId)}
            onRetry={onCategoryRetry}
          />
        </FormField>

        <div>
          <label htmlFor="tags-input" className="mb-1.5 block text-sm font-medium text-gray-800">
            Etiquetas
          </label>
          <TagEditor value={draft.tags} onChange={(value) => onDraftChange('tags', value)} disabled={disabled} />
          <p id="tags-input-hint" className="mt-1.5 text-xs text-gray-500">
            Presiona Enter o coma para crear chips. Se envían como el campo `tags` existente.
          </p>
        </div>
      </ProductFormSection>

      <ProductFormSection
        id="variants"
        title="Variantes de venta"
        description="Configura combinaciones comprables con stock, precio, SKU e imagen independiente por variante."
        aside={<SectionMetric icon={Squares2X2Icon} label="Variantes" value={String(variants.length)} />}
      >
        {errors.variants ? (
          <div className="rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700">
            {errors.variants}
          </div>
        ) : null}
        <ProductVariantBuilder
          variants={variants}
          basePrice={draft.precio}
          disabled={disabled}
          onChange={onVariantsChange}
        />
      </ProductFormSection>
    </div>
  );
};

interface SectionMetricProps {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  value: string;
}

const SectionMetric: React.FC<SectionMetricProps> = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
    <Icon className="h-4 w-4 text-gray-400" aria-hidden="true" />
    <div className="min-w-0">
      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">{label}</p>
      <p className="truncate text-sm font-semibold text-gray-800">{value}</p>
    </div>
  </div>
);

