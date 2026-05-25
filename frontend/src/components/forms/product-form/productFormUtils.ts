import { Product } from '../../../types';
import { ProductDraft, ProductSpecsDraft } from './types';

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
