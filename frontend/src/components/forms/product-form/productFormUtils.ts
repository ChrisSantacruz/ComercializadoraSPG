import { Product } from '../../../types';
import { ProductDraft, ProductSpecsDraft, ProductVariantDraft } from './types';

export const buildInitialDraft = (product?: Product): ProductDraft => ({
  nombre: product?.nombre || '',
  descripcion: product?.descripcion || '',
  precio: product?.precio ? String(product.precio) : '',
  stock: product?.stock || product?.stock === 0 ? String(product.stock) : '',
  categoria:
    typeof product?.categoria === 'string'
      ? product.categoria
      : product?.categoria?._id || '',
  tags: product?.tags?.join(', ') || '',
});

export const buildInitialSpecs = (product?: Product): ProductSpecsDraft => {
  const rawSpecs = product?.especificaciones || {};
  const specs = Array.isArray(rawSpecs)
    ? Object.fromEntries(
        rawSpecs
          .filter((item) => item && typeof item === 'object' && 'nombre' in item)
          .map((item: any) => [item.nombre, item.valor || '']),
      )
    : rawSpecs;

  return {
    color: String(specs.color || ''),
    tamaño: String(specs.tamaño || ''),
    material: String(specs.material || ''),
    marca: String(specs.marca || ''),
    sku: String(specs.sku || ''),
    seoTitulo: String(specs.seoTitulo || ''),
    seoDescripcion: String(specs.seoDescripcion || ''),
    opciones: String(specs.opciones || ''),
  };
};

export const buildInitialVariants = (product?: Product): ProductVariantDraft[] =>
  (product?.variants || []).map((variant, index) => ({
    _id: variant._id,
    sku: variant.sku || '',
    attributes: variant.attributes || {},
    precio: variant.precio || variant.precio === 0 ? String(variant.precio) : String(product?.precio || ''),
    precioOferta: variant.precioOferta || variant.precioOferta === 0 ? String(variant.precioOferta) : '',
    stock: variant.stock || variant.stock === 0 ? String(variant.stock) : '',
    imagenes: (variant.imagenes || [])
      .map((image) => {
        const url = typeof image === 'string' ? image : image.url;
        return url ? { url, alt: typeof image === 'object' ? image.alt : undefined } : null;
      })
      .filter(Boolean) as Array<{ url: string; alt?: string }>,
    activo: variant.activo !== false,
    isDefault: variant.isDefault === true || index === 0,
  }));

export const formatCurrency = (value: string | number): string => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return '$0';
  }

  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(numericValue);
};

export const parseTags = (value: string): string[] =>
  value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

export const getStockStatus = (stockValue: string): { label: string; tone: 'success' | 'warning' | 'error' | 'neutral' } => {
  if (stockValue === '') {
    return { label: 'Sin stock definido', tone: 'neutral' };
  }

  const stock = Number(stockValue);

  if (!Number.isFinite(stock) || stock < 0) {
    return { label: 'Stock inválido', tone: 'error' };
  }

  if (stock === 0) {
    return { label: 'Agotado', tone: 'error' };
  }

  if (stock <= 5) {
    return { label: 'Stock bajo', tone: 'warning' };
  }

  return { label: 'Disponible', tone: 'success' };
};
