import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Product, Category } from '../../types';
import { loadActiveCategories } from '../../lib/data/activeCategoriesResource';
import { getAllImageUrls } from '../../utils/imageUtils';
import { Button, useNotifications } from '../ui';
import { ProductFormHeader } from './product-form/ProductFormHeader';
import { ProductFormMainSections } from './product-form/ProductFormMainSections';
import { ProductFormSidebar } from './product-form/ProductFormSidebar';
import { buildInitialDraft, buildInitialSpecs, parseTags } from './product-form/productFormUtils';
import {
  ImagePreview,
  ProductDraft,
  ProductFormErrors,
  ProductSpecsDraft,
} from './product-form/types';

interface ProductFormProps {
  product?: Product;
  onSubmit: (formData: FormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const ProductForm: React.FC<ProductFormProps> = ({
  product,
  onSubmit,
  onCancel,
  isLoading = false
}) => {
  const { showWarning } = useNotifications();
  const formRef = useRef<HTMLFormElement>(null);
  const submitLockedRef = useRef(false);
  const imagesRef = useRef<ImagePreview[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProductDraft>(() => buildInitialDraft(product));
  const [specsData, setSpecsData] = useState<ProductSpecsDraft>(() => buildInitialSpecs(product));
  const [images, setImages] = useState<ImagePreview[]>([]);
  const [errors, setErrors] = useState<ProductFormErrors>({});
  const [isDirty, setIsDirty] = useState(false);

  const existingImages = useMemo(
    () => (product?.imagenes?.length ? getAllImageUrls(product.imagenes) : []),
    [product?.imagenes],
  );

  useEffect(() => {
    let mounted = true;

    const loadCategories = async () => {
      try {
        setCategoriesLoading(true);
        setCategoryError(null);
        const categorias = await loadActiveCategories();

        if (!mounted) return;

        if (Array.isArray(categorias) && categorias.length > 0) {
          setCategories(categorias);
        } else {
          setCategories([]);
          setCategoryError('No hay categorías activas disponibles.');
        }
      } catch {
        if (!mounted) return;
        setCategories([]);
        setCategoryError('No fue posible cargar las categorías. Reintenta antes de guardar.');
      } finally {
        if (mounted) setCategoriesLoading(false);
      }
    };

    loadCategories();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    submitLockedRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(
    () => () => {
      imagesRef.current.forEach((image) => URL.revokeObjectURL(image.url));
    },
    [],
  );

  const handleDraftChange = useCallback((name: keyof ProductDraft, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setIsDirty(true);
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  }, [errors]);

  const handleSpecsChange = useCallback((name: keyof ProductSpecsDraft, value: string) => {
    setSpecsData(prev => ({ ...prev, [name]: value }));
    setIsDirty(true);
  }, []);

  const handleAddImages = useCallback((files: File[]) => {
    if (files.length === 0) return;
    const nextImages = files.map((file) => ({
      id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
      file,
      url: URL.createObjectURL(file),
    }));
    setImages(prev => [...prev, ...nextImages]);
    setIsDirty(true);
  }, []);

  const handleRemoveImage = useCallback((id: string) => {
    setImages(prev => {
      const target = prev.find(image => image.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter(image => image.id !== id);
    });
    setIsDirty(true);
  }, []);

  const handleMoveImage = useCallback((id: string, direction: -1 | 1) => {
    setImages(prev => {
      const currentIndex = prev.findIndex(image => image.id === id);
      const nextIndex = currentIndex + direction;
      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= prev.length) return prev;

      const next = [...prev];
      const [item] = next.splice(currentIndex, 1);
      next.splice(nextIndex, 0, item);
      return next;
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
    const stock = Number(formData.stock);
    
    if (!formData.precio || precio <= 0) newErrors.precio = 'El precio debe ser mayor a 0';
    if (formData.stock && stock < 0) newErrors.stock = 'El stock no puede ser negativo';
    if (!formData.categoria) newErrors.categoria = 'Selecciona una categoría';

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

    const submitData = new FormData();
    submitData.append('nombre', formData.nombre);
    submitData.append('descripcion', formData.descripcion);
    submitData.append('precio', formData.precio.toString());
    submitData.append('stock', formData.stock.toString());
    submitData.append('categoria', formData.categoria);
    
    if (formData.tags.trim()) {
      const tagsArray = parseTags(formData.tags);
      submitData.append('tags', JSON.stringify(tagsArray));
    }
    
    const especificacionesFinales = Object.fromEntries(
      Object.entries(specsData).filter(([, value]) => value.trim() !== '')
    );
    
    if (Object.keys(especificacionesFinales).length > 0) {
      submitData.append('especificaciones', JSON.stringify(especificacionesFinales));
    }

    if (images.length > 0) {
      images.forEach((image) => {
        submitData.append('imagenes', image.file);
      });
    }

    onSubmit(submitData);
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
            specs={specsData}
            errors={errors}
            categories={categories}
            categoriesLoading={categoriesLoading}
            categoryError={categoryError}
            images={images}
            existingImages={existingImages}
            disabled={isLoading}
            onDraftChange={handleDraftChange}
            onSpecsChange={handleSpecsChange}
            onAddImages={handleAddImages}
            onRemoveImage={handleRemoveImage}
            onMoveImage={handleMoveImage}
          />

          <div className="hidden lg:block">
            <div className="sticky top-6">
              <ProductFormSidebar
                draft={formData}
                images={images}
                existingCover={existingImages[0]}
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