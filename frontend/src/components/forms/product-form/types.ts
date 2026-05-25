export interface ProductDraft {
  nombre: string;
  descripcion: string;
  precio: string;
  stock: string;
  categoria: string;
  tags: string;
}

export interface ProductSpecsDraft {
  color: string;
  tamaño: string;
  material: string;
  marca: string;
  sku: string;
  seoTitulo: string;
  seoDescripcion: string;
  opciones: string;
}

export interface ProductVariantDraft {
  _id?: string;
  sku: string;
  attributes: Record<string, string>;
  precio: string;
  precioOferta: string;
  stock: string;
  imagenes: Array<{ url: string; alt?: string }>;
  activo: boolean;
  isDefault: boolean;
}

/** @deprecated Use MediaPreview */
export interface ImagePreview {
  id: string;
  file: File;
  url: string;
}

export interface MediaPreview {
  id: string;
  file: File;
  url: string;
}

export interface ExistingMediaItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  alt?: string;
  order?: number;
}

export type ProductFormErrors = Partial<Record<keyof ProductDraft | 'variants' | 'media', string>>;
