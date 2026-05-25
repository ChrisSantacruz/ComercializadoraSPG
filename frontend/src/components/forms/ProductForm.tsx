import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Product } from '../../types';
import { useActiveCategoriesQuery } from '../../lib/query/hooks/useCategoriesQuery';
import { log } from '../../lib/observability/logger';
import { getProductImages, getProductVideos, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES } from '../../utils/mediaUtils';
import { Button, useNotifications } from '../ui';
import { ProductFormHeader } from './product-form/ProductFormHeader';
import { ProductFormMainSections } from './product-form/ProductFormMainSections';
import { ProductFormSidebar } from './product-form/ProductFormSidebar';
import { buildInitialDraft, buildInitialSpecs, buildInitialVariants, parseTags } from './product-form/productFormUtils';
import {
  ExistingMediaItem,
  MediaPreview,
  ProductDraft,
  ProductFormErrors,
  ProductSpecsDraft,
  ProductVariantDraft,
} from './product-form/types';

interface ProductFormProps {
  product?: Product;
  onSubmit: (formData: FormData, options?: { onUploadProgress?: (percent: number) => void }) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const ProductForm: React.FC<ProductFormProps> = ({
  product,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const { showError, showWarning } = useNotifications();
  const formRef = useRef<HTMLFormElement>(null);
  const submitLockedRef = useRef(false);
  const imagesRef = useRef<MediaPreview[]>([]);
  const videosRef = useRef<MediaPreview[]>([]);
  const categoryErrorNotifiedRef = useRef(false);
  const categoriesQuery = useActiveCategoriesQuery();
  const [formData, setFormData] = useState<ProductDraft>(() => buildInitialDraft(product));
  const [specsData] = useState<ProductSpecsDraft>(() => buildInitialSpecs(product));
  const [variants, setVariants] = useState<ProductVariantDraft[]>(() => buildInitialVariants(product));
  const [images, setImages] = useState<MediaPreview[]>([]);
  const [videos, setVideos] = useState<MediaPreview[]>([]);
  const [existingMedia, setExistingMedia] = useState<ExistingMediaItem[]>(() => {
    const imgs = getProductImages(product).map((m, i) => ({
      id: m._id || `legacy-img-${i}`,
      type: 'image' as const,
      url: m.url,
      alt: m.alt,
      order: m.order ?? i,
    }));
    const vids = getProductVideos(product).map((m, i) => ({
      id: m._id || `legacy-vid-${i}`,
      type: 'video' as const,
      url: m.url,
      order: m.order ?? i,
    }));
    return [...imgs, ...vids];
  });
  const [removedMediaIds, setRemovedMediaIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<ProductFormErrors>({});
  const [isDirty, setIsDirty] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const hasVariants = variants.length > 0;
  const variantStockTotal = useMemo(
    () => variants.filter((v) => v.activo).reduce((sum, v) => sum + (Number(v.stock) || 0), 0),
    [variants],
  );

  const categories = categoriesQuery.data ?? [];
  const categoriesLoading = categoriesQuery.isPending || categoriesQuery.isFetching;
  const categoryError = categoriesQuery.isError
    ? categoriesQuery.error.message || 'No fue posible cargar las categorías.'
    : null;

  useEffect(() => {
    if (!categoriesQuery.isError) {
      categoryErrorNotifiedRef.current = false;
      return;
    }
    if (!categoryErrorNotifiedRef.current) {
      categoryErrorNotifiedRef.current = true;
      showError('Categorías no disponibles', categoryError || 'Reintenta la carga antes de guardar el producto.');
    }
    if (process.env.NODE_ENV === 'development') {
      log.warn('category_query_failed', {
        message: categoryError,
        status: (categoriesQuery.error as { status?: number })?.status,
      });
    }
  }, [categoriesQuery.error, categoriesQuery.isError, categoryError, showError]);

  useEffect(() => {
    submitLockedRef.current = isLoading;
    if (!isLoading) setUploadProgress(null);
  }, [isLoading]);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    videosRef.current = videos;
  }, [videos]);

  useEffect(
    () => () => {
      imagesRef.current.forEach((image) => URL.revokeObjectURL(image.url));
      videosRef.current.forEach((video) => URL.revokeObjectURL(video.url));
    },
    [],
  );

  const handleDraftChange = useCallback(
    (name: keyof ProductDraft, value: string) => {
      setFormData((prev) => ({ ...prev, [name]: value }));
      setIsDirty(true);
      if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
    },
    [errors],
  );

  const handleVariantsChange = useCallback(
    (nextVariants: ProductVariantDraft[]) => {
      setVariants(nextVariants);
      setIsDirty(true);
      if (errors.variants) setErrors((prev) => ({ ...prev, variants: '' }));
    },
    [errors.variants],
  );

  const validateMediaFiles = (files: File[], kind: 'image' | 'video'): string | null => {
    const max = kind === 'image' ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
    const tooBig = files.find((f) => f.size > max);
    if (tooBig) {
      return kind === 'image'
        ? `"${tooBig.name}" supera 5 MB. Comprime la imagen o usa otro archivo.`
        : `"${tooBig.name}" supera 50 MB.`;
    }
    return null;
  };

  const handleAddImages = useCallback((files: File[]) => {
    if (files.length === 0) return;
    const err = validateMediaFiles(files, 'image');
    if (err) {
      setMediaError(err);
      showWarning('Archivo no válido', err);
      return;
    }
    setMediaError(null);
    const next = files.map((file) => ({
      id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
      file,
      url: URL.createObjectURL(file),
    }));
    setImages((prev) => [...prev, ...next]);
    setIsDirty(true);
  }, [showWarning]);

  const handleAddVideos = useCallback((files: File[]) => {
    if (files.length === 0) return;
    const err = validateMediaFiles(files, 'video');
    if (err) {
      setMediaError(err);
      showWarning('Archivo no válido', err);
      return;
    }
    setMediaError(null);
    const next = files.map((file) => ({
      id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
      file,
      url: URL.createObjectURL(file),
    }));
    setVideos((prev) => [...prev, ...next]);
    setIsDirty(true);
  }, [showWarning]);

  const handleRemoveImage = useCallback((id: string) => {
    setImages((prev) => {
      const target = prev.find((image) => image.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((image) => image.id !== id);
    });
    setIsDirty(true);
  }, []);

  const handleRemoveVideo = useCallback((id: string) => {
    setVideos((prev) => {
      const target = prev.find((video) => video.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((video) => video.id !== id);
    });
    setIsDirty(true);
  }, []);

  const handleMoveImage = useCallback((id: string, direction: -1 | 1) => {
    setImages((prev) => {
      const currentIndex = prev.findIndex((image) => image.id === id);
      const nextIndex = currentIndex + direction;
      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(currentIndex, 1);
      next.splice(nextIndex, 0, item);
      return next;
    });
    setIsDirty(true);
  }, []);

  const handleRemoveExisting = useCallback((mediaId: string) => {
    setExistingMedia((prev) => prev.filter((m) => m.id !== mediaId));
    setRemovedMediaIds((prev) => (prev.includes(mediaId) ? prev : [...prev, mediaId]));
    setIsDirty(true);
  }, []);

  const handleMoveExisting = useCallback((mediaId: string, direction: -1 | 1) => {
    setExistingMedia((prev) => {
      const imagesOnly = prev.filter((m) => m.type === 'image');
      const others = prev.filter((m) => m.type !== 'image');
      const idx = imagesOnly.findIndex((m) => m.id === mediaId);
      const nextIdx = idx + direction;
      if (idx < 0 || nextIdx < 0 || nextIdx >= imagesOnly.length) return prev;
      const reordered = [...imagesOnly];
      const [item] = reordered.splice(idx, 1);
      reordered.splice(nextIdx, 0, item);
      return [...reordered, ...others];
    });
    setIsDirty(true);
  }, []);

  const focusFirstError = () => {
    window.requestAnimationFrame(() => {
      const firstInvalid = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
      firstInvalid?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      firstInvalid?.focus();
    });
  };

  const validateForm = (): boolean => {
    const newErrors: ProductFormErrors = {};

    if (!formData.nombre.trim()) newErrors.nombre = 'El nombre es requerido';
    if (!formData.descripcion.trim()) newErrors.descripcion = 'La descripción es requerida';

    const precio = Number(formData.precio);
    if (!formData.precio || precio <= 0) newErrors.precio = 'El precio debe ser mayor a 0';

    if (!hasVariants) {
      const stock = Number(formData.stock);
      if (formData.stock !== '' && stock < 0) newErrors.stock = 'El stock no puede ser negativo';
    }

    if (!formData.categoria) newErrors.categoria = 'Selecciona una categoría';
    if (categoriesLoading) newErrors.categoria = 'Espera a que terminen de cargar las categorías.';
    if (categoryError) newErrors.categoria = 'Corrige la carga de categorías antes de guardar.';
    if (!categoriesLoading && !categoryError && categories.length === 0) {
      newErrors.categoria = 'No hay categorías activas disponibles para publicar productos.';
    }

    if (hasVariants) {
      const invalidVariant = variants.some((variant) => {
        const price = Number(variant.precio);
        const variantStock = Number(variant.stock);
        return !Number.isFinite(price) || price <= 0 || !Number.isFinite(variantStock) || variantStock < 0;
      });
      if (invalidVariant) {
        newErrors.variants = 'Todas las variantes deben tener precio mayor a 0 y stock válido.';
      } else if (variantStockTotal <= 0) {
        newErrors.variants = 'Al menos una variante activa debe tener stock mayor a 0.';
      }
    }

    setErrors(newErrors);
    const isValid = Object.keys(newErrors).length === 0;
    if (!isValid) {
      showWarning('Revisa el formulario', 'Hay campos obligatorios o valores inválidos antes de guardar.');
      focusFirstError();
    }
    return isValid;
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (submitLockedRef.current || isLoading) return;
    if (!validateForm()) return;

    submitLockedRef.current = true;
    setUploadProgress(0);

    const submitData = new FormData();
    submitData.append('nombre', formData.nombre);
    submitData.append('descripcion', formData.descripcion);
    submitData.append('precio', formData.precio.toString());

    if (hasVariants) {
      submitData.append('stock', String(variantStockTotal));
    } else {
      submitData.append('stock', (formData.stock || '0').toString());
    }

    submitData.append('categoria', formData.categoria);

    if (formData.tags.trim()) {
      submitData.append('tags', JSON.stringify(parseTags(formData.tags)));
    }

    const especificacionesFinales = Object.fromEntries(
      Object.entries(specsData).filter(([, value]) => value.trim() !== ''),
    );
    if (Object.keys(especificacionesFinales).length > 0) {
      submitData.append('especificaciones', JSON.stringify(especificacionesFinales));
    }

    if (hasVariants) {
      submitData.append('variants', JSON.stringify(variants));
    }

    images.forEach((image) => submitData.append('imagenes', image.file));
    videos.forEach((video) => submitData.append('videos', video.file));

    if (product && removedMediaIds.length > 0) {
      submitData.append('removedMediaIds', JSON.stringify(removedMediaIds));
    }

    const keptExisting = existingMedia.filter((m) => !removedMediaIds.includes(m.id));
    if (product && keptExisting.length > 0) {
      submitData.append('mediaOrder', JSON.stringify(keptExisting.map((m) => m.id)));
    }

    onSubmit(submitData, {
      onUploadProgress: (percent) => setUploadProgress(percent),
    });
  };

  return (
    <div className="min-h-[100svh] bg-gray-50">
      <ProductFormHeader
        isEditing={!!product}
        isLoading={isLoading}
        isDirty={isDirty}
        productName={formData.nombre}
        onCancel={onCancel}
        onSubmit={() => handleSubmit()}
      />

      <form ref={formRef} onSubmit={handleSubmit} className="mx-auto max-w-7xl px-4 py-6 pb-28 sm:px-6 lg:px-8 lg:pb-10">
        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <ProductFormMainSections
            draft={formData}
            variants={variants}
            hasVariants={hasVariants}
            variantStockTotal={variantStockTotal}
            errors={errors}
            categories={categories}
            categoriesLoading={categoriesLoading}
            categoryError={categoryError}
            images={images}
            videos={videos}
            existingMedia={existingMedia}
            mediaError={mediaError}
            uploadProgress={uploadProgress}
            disabled={isLoading}
            onDraftChange={handleDraftChange}
            onCategoryRetry={() => void categoriesQuery.refetch()}
            onVariantsChange={handleVariantsChange}
            onAddImages={handleAddImages}
            onAddVideos={handleAddVideos}
            onRemoveImage={handleRemoveImage}
            onRemoveVideo={handleRemoveVideo}
            onMoveImage={handleMoveImage}
            onRemoveExisting={product ? handleRemoveExisting : undefined}
            onMoveExisting={product ? handleMoveExisting : undefined}
          />

          <div className="hidden lg:block">
            <div className="sticky top-6">
              <ProductFormSidebar
                draft={formData}
                images={images}
                existingCover={existingMedia.find((m) => m.type === 'image')?.url}
                isEditing={!!product}
                isLoading={isLoading}
                isDirty={isDirty}
                onSubmit={() => handleSubmit()}
                onCancel={onCancel}
              />
            </div>
          </div>
        </div>

        <div
          className="fixed inset-x-0 bottom-0 z-dropdown border-t border-gray-200 bg-white/95 px-4 py-3 shadow-strong backdrop-blur lg:hidden"
          role="region"
          aria-label="Acciones de guardado"
        >
          <div className="mx-auto flex max-w-7xl gap-3">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" loading={isLoading} disabled={isLoading} className="flex-1">
              {product ? 'Guardar' : 'Crear'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ProductForm;
