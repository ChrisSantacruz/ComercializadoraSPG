/**
 * Utilidades de medios (imágenes + videos) — contrato estable con backend `media[]`.
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

export type MediaType = 'image' | 'video';

export interface ProductMedia {
  _id?: string;
  type: MediaType;
  url: string;
  filename?: string;
  mimeType?: string;
  size?: number;
  width?: number;
  height?: number;
  duration?: number;
  thumbnail?: string;
  order?: number;
  alt?: string;
}

export const getMediaUrl = (url: string | null | undefined): string => {
  if (!url) return '/images/default-product.svg';
  const norm = String(url).replace(/\\/g, '/');

  if (
    norm.startsWith('https://') ||
    norm.startsWith('http://') ||
    norm.startsWith('blob:') ||
    norm.startsWith('data:')
  ) {
    return norm;
  }

  if (norm.startsWith('/uploads/')) {
    return `${API_BASE_URL}${norm}`;
  }

  if (!norm.startsWith('/') && !norm.includes('/')) {
    return `${API_BASE_URL}/uploads/products/${norm}`;
  }

  return `${API_BASE_URL}${norm}`;
};

export const getProductImages = (product?: {
  media?: ProductMedia[];
  imagenes?: Array<string | { url?: string }>;
}): ProductMedia[] => {
  if (product?.media?.length) {
    return product.media
      .filter((m) => m.type === 'image')
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  const legacy = product?.imagenes || [];
  return legacy
    .map((img, i) => {
      const url = typeof img === 'string' ? img : img?.url;
      if (!url) return null;
      return { type: 'image' as const, url, order: i };
    })
    .filter(Boolean) as ProductMedia[];
};

export const getProductVideos = (product?: { media?: ProductMedia[] }): ProductMedia[] =>
  (product?.media || [])
    .filter((m) => m.type === 'video')
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

export const getFirstProductImageUrl = (product?: {
  media?: ProductMedia[];
  imagenes?: Array<string | { url?: string }>;
  imagenPrincipal?: string;
}): string => {
  const images = getProductImages(product);
  if (images.length) return getMediaUrl(images[0].url);
  if (product?.imagenPrincipal) return getMediaUrl(product.imagenPrincipal);
  return getMediaUrl(null);
};

export const formatFileSize = (bytes?: number): string => {
  if (!bytes || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/gif,image/webp';
export const VIDEO_ACCEPT = 'video/mp4,video/quicktime,video/x-msvideo,video/webm';
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
