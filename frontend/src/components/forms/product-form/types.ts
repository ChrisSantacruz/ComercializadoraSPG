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

export interface ImagePreview {
  id: string;
  file: File;
  url: string;
}

export type ProductFormErrors = Partial<Record<keyof ProductDraft, string>>;
