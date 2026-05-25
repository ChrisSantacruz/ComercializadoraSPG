import React, { ChangeEvent } from 'react';
import {
  ChartBarIcon,
  CubeIcon,
  DocumentTextIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  PhotoIcon,
  Squares2X2Icon,
  TagIcon,
} from '@heroicons/react/24/outline';
import { Badge, FormField, Input, Select, Textarea } from '../../ui';
import { Category } from '../../../types';
import { ImageDropzone } from './ImageDropzone';
import { ProductFormSection } from './ProductFormSection';
import { TagEditor } from './TagEditor';
import { ImagePreview, ProductDraft, ProductFormErrors, ProductSpecsDraft } from './types';
import { formatCurrency, getStockStatus, parseTags } from './productFormUtils';

interface ProductFormMainSectionsProps {
  draft: ProductDraft;
  specs: ProductSpecsDraft;
  errors: ProductFormErrors;
  categories: Category[];
  categoriesLoading: boolean;
  categoryError: string | null;
  images: ImagePreview[];
  existingImages?: string[];
  disabled?: boolean;
  onDraftChange: (name: keyof ProductDraft, value: string) => void;
  onSpecsChange: (name: keyof ProductSpecsDraft, value: string) => void;
  onAddImages: (files: File[]) => void;
  onRemoveImage: (id: string) => void;
  onMoveImage: (id: string, direction: -1 | 1) => void;
}

const specificationFields: Array<{
  key: keyof ProductSpecsDraft;
  label: string;
  placeholder: string;
}> = [
  { key: 'color', label: 'Color', placeholder: 'Azul, negro, natural' },
  { key: 'tamaño', label: 'Tamaño', placeholder: 'Pequeño, mediano, grande' },
  { key: 'material', label: 'Material', placeholder: 'Algodón, acero, madera' },
  { key: 'marca', label: 'Marca', placeholder: 'Marca visible al cliente' },
];

export const ProductFormMainSections: React.FC<ProductFormMainSectionsProps> = ({
  draft,
  specs,
  errors,
  categories,
  categoriesLoading,
  categoryError,
  images,
  existingImages,
  disabled,
  onDraftChange,
  onSpecsChange,
  onAddImages,
  onRemoveImage,
  onMoveImage,
}) => {
  const stockStatus = getStockStatus(draft.stock);
  const tags = parseTags(draft.tags);

  const handleDraftChange =
    (name: keyof ProductDraft) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      onDraftChange(name, event.target.value);
    };

  const handleSpecsChange =
    (name: keyof ProductSpecsDraft) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onSpecsChange(name, event.target.value);
    };

  return (
    <div className="space-y-5">
      <ProductFormSection
        id="general"
        title="Información general"
        description="Nombre, descripción y narrativa comercial principal del producto."
        aside={<SectionMetric icon={DocumentTextIcon} label="Contenido" value={`${draft.descripcion.length}/2000`} />}
      >
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
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
          <FormField id="sku" label="SKU interno" hint="Se guarda dentro de especificaciones.">
            <Input
              value={specs.sku}
              onChange={handleSpecsChange('sku')}
              disabled={disabled}
              placeholder="SPG-0001"
              className="font-mono"
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
        aside={<SectionMetric icon={PhotoIcon} label="Archivos nuevos" value={String(images.length)} />}
      >
        <ImageDropzone
          images={images}
          existingImages={existingImages}
          disabled={disabled}
          onAddImages={onAddImages}
          onRemoveImage={onRemoveImage}
          onMoveImage={onMoveImage}
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

          <FormField id="stock" label="Stock disponible" error={errors.stock} hint="Unidades vendibles.">
            <Input
              type="number"
              name="stock"
              value={draft.stock}
              onChange={handleDraftChange('stock')}
              min="0"
              disabled={disabled}
              placeholder="24"
              className={errors.stock ? 'border-error-300 focus:border-error-500 focus:ring-error-500/20' : ''}
            />
          </FormField>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-gray-950">Estado inventario</p>
                <p className="mt-1 text-xs text-gray-500">Calculado visualmente desde stock.</p>
              </div>
              <Badge variant={stockStatus.tone}>{stockStatus.label}</Badge>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-start gap-3">
            <CubeIcon className="mt-0.5 h-5 w-5 text-gray-400" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium text-gray-950">Precio de descuento</p>
              <p className="mt-1 text-sm leading-6 text-gray-500">
                El modelo backend contiene `precioOferta`, pero el controlador actual no persiste ese campo en crear/editar producto. Se deja fuera del submit para evitar un contrato engañoso.
              </p>
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
          hint={categoryError || 'Se cargan desde el API; no se usan categorías inventadas.'}
        >
          <Select
            name="categoria"
            value={draft.categoria}
            onChange={handleDraftChange('categoria')}
            disabled={disabled || categoriesLoading || !!categoryError}
            className={errors.categoria ? 'border-error-300 focus:border-error-500 focus:ring-error-500/20' : ''}
          >
            <option value="">{categoriesLoading ? 'Cargando categorías...' : 'Seleccionar categoría'}</option>
            {categories.map((category) => (
              <option key={category._id} value={category._id}>
                {category.nombre}
              </option>
            ))}
          </Select>
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
        title="Variantes/opciones"
        description="Organiza atributos visibles sin introducir un contrato de variantes no soportado por el API actual."
        aside={<SectionMetric icon={Squares2X2Icon} label="Atributos" value={String(specificationFields.filter((field) => specs[field.key]).length)} />}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {specificationFields.map((field) => (
            <FormField key={field.key} id={field.key} label={field.label}>
              <Input
                value={specs[field.key]}
                onChange={handleSpecsChange(field.key)}
                disabled={disabled}
                placeholder={field.placeholder}
              />
            </FormField>
          ))}
        </div>
        <FormField id="opciones" label="Opciones adicionales" hint="Ej. talla: S/M/L, color: negro/blanco.">
          <Textarea
            value={specs.opciones}
            onChange={handleSpecsChange('opciones')}
            disabled={disabled}
            rows={3}
            placeholder="Describe opciones si el producto tiene variaciones comerciales."
          />
        </FormField>
      </ProductFormSection>

      <ProductFormSection
        id="seo"
        title="SEO y metadata"
        description="Preview de búsqueda y metadatos guardados dentro de especificaciones."
        aside={<SectionMetric icon={MagnifyingGlassIcon} label="Preview" value="SERP" />}
      >
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="truncate text-sm font-medium text-primary-700">{specs.seoTitulo || draft.nombre || 'Título del producto'}</p>
          <p className="mt-1 truncate text-xs text-success-700">comercializadora-spg.com/productos/{(draft.nombre || 'producto').toLowerCase().replace(/[^a-z0-9]+/g, '-')}</p>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-600">
            {specs.seoDescripcion || draft.descripcion || 'Agrega una descripción para controlar cómo se entiende este producto en búsqueda.'}
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <FormField id="seoTitulo" label="Meta título" hint={`${specs.seoTitulo.length}/60`}>
            <Input value={specs.seoTitulo} onChange={handleSpecsChange('seoTitulo')} maxLength={60} disabled={disabled} placeholder="Título optimizado" />
          </FormField>
          <FormField id="seoDescripcion" label="Meta descripción" hint={`${specs.seoDescripcion.length}/160`}>
            <Input value={specs.seoDescripcion} onChange={handleSpecsChange('seoDescripcion')} maxLength={160} disabled={disabled} placeholder="Descripción breve para búsqueda" />
          </FormField>
        </div>
      </ProductFormSection>

      <ProductFormSection
        id="publication"
        title="Estado/publicación"
        description="Resumen del flujo de moderación antes de que el producto aparezca en catálogo."
        aside={<SectionMetric icon={EyeIcon} label="Visibilidad" value="Moderada" />}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <StatusPanel title="Estado inicial" value="Pendiente" description="El producto queda en cola de revisión del equipo admin." />
          <StatusPanel title="Visibilidad" value="No público" description="Solo aparece en catálogo después de aprobarse." />
          <StatusPanel title="Guardado" value="Submit único" description="Los botones se deshabilitan durante la mutación." />
        </div>
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

interface StatusPanelProps {
  title: string;
  value: string;
  description: string;
}

const StatusPanel: React.FC<StatusPanelProps> = ({ title, value, description }) => (
  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
    <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{title}</p>
    <p className="mt-2 text-sm font-semibold text-gray-950">{value}</p>
    <p className="mt-1 text-xs leading-5 text-gray-500">{description}</p>
  </div>
);
