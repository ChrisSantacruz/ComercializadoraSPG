/**
 * Utilities para manejar imágenes en la aplicación
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

/**
 * Construye la URL completa para una imagen
 * @param imageUrl - URL de la imagen (puede ser relativa o completa, string u objeto)
 * @returns URL completa para mostrar la imagen
 */
export const getImageUrl = (imageUrl: string | null | undefined | any): string => {
  // Si no hay URL, retornar imagen por defecto
  if (!imageUrl) {
    return '/images/default-product.svg';
  }

  // Si imageUrl es un objeto, intentar extraer la URL
  if (typeof imageUrl === 'object') {
    // Buscar propiedades comunes que pueden contener la URL
    const url = imageUrl.url || imageUrl.src || imageUrl.path || imageUrl.imagen;
    if (url && typeof url === 'string') {
      return getImageUrl(url); // Llamada recursiva con la URL extraída
    }
    return '/images/default-product.svg';
  }

  // Asegurar que imageUrl es string y normalizar barras
  const urlString = String(imageUrl).replace(/\\/g, '/'); // Convertir backslashes a forward slashes

  // Si es una URL de Cloudinary (completa), retornarla tal como está
  if (urlString.startsWith('https://res.cloudinary.com/')) {
    return urlString;
  }

  // Si es una URL absoluta (http/https), retornarla tal como está
  if (
    urlString.startsWith('http://') ||
    urlString.startsWith('https://') ||
    urlString.startsWith('blob:') ||
    urlString.startsWith('data:')
  ) {
    return urlString;
  }

  // Si es una URL relativa que empieza con /uploads/, construir la URL completa
  if (urlString.startsWith('/uploads/')) {
    return `${API_BASE_URL}${urlString}`;
  }

  // Si es solo el nombre del archivo, agregar la ruta completa
  if (!urlString.startsWith('/') && !urlString.includes('/')) {
    return `${API_BASE_URL}/uploads/productos/${urlString}`;
  }

  return `${API_BASE_URL}${urlString}`;
};

/**
 * Obtiene la primera imagen válida de un array de imágenes
 * @param images - Array de imágenes (puede ser strings o objetos con url)
 * @returns URL de la primera imagen válida
 */
export const getFirstImageUrl = (images: any[] | undefined | null): string => {
  if (!images || !Array.isArray(images) || images.length === 0) {
    return getImageUrl(null);
  }

  const firstImage = images[0];

  // Si es un string, usarlo directamente
  if (typeof firstImage === 'string') {
    return getImageUrl(firstImage);
  }

  // Si es un objeto con url, usar la propiedad url
  if (firstImage && typeof firstImage === 'object' && firstImage.url) {
    return getImageUrl(firstImage.url);
  }

  // Fallback
  return getImageUrl(null);
};

/**
 * Obtiene todas las URLs de imágenes de un array
 * @param images - Array de imágenes (puede ser strings o objetos con url)
 * @returns Array de URLs de imágenes
 */
export const getAllImageUrls = (images: any[] | undefined | null): string[] => {
  if (!images || !Array.isArray(images) || images.length === 0) {
    return [getImageUrl(null)];
  }

  return images.map(image => {
    if (typeof image === 'string') {
      return getImageUrl(image);
    }
    if (image && typeof image === 'object' && image.url) {
      return getImageUrl(image.url);
    }
    return getImageUrl(null);
  }).filter(url => url !== getImageUrl(null));
};

/**
 * Valida si una URL de imagen es válida
 * @param imageUrl - URL a validar
 * @returns true si es válida, false si no
 */
export const isValidImageUrl = (imageUrl: string): boolean => {
  if (!imageUrl) return false;
  
  // Verificar extensiones de imagen comunes
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
  const lowerUrl = imageUrl.toLowerCase();
  
  return imageExtensions.some(ext => lowerUrl.includes(ext)) || 
         lowerUrl.includes('cloudinary') || 
         lowerUrl.includes('uploads');
};

/**
 * Maneja errores de carga de imágenes
 * @param event - Evento de error
 * @param fallbackUrl - URL de respaldo (opcional)
 */
export const handleImageError = (
  event: React.SyntheticEvent<HTMLImageElement>, 
  fallbackUrl: string = '/images/default-product.svg'
) => {
  const img = event.currentTarget;
  if (img.src !== fallbackUrl) {
    img.src = fallbackUrl;
  }
};

/**
 * Construye srcSet para imágenes responsivas (si están disponibles)
 * @param baseUrl - URL base de la imagen
 * @returns string para srcSet o undefined
 */
export const buildResponsiveSrcSet = (baseUrl: string): string | undefined => {
  // Solo para imágenes de Cloudinary podemos generar diferentes tamaños
  if (baseUrl.includes('cloudinary')) {
    const base = baseUrl.split('/upload/')[0] + '/upload/';
    const path = baseUrl.split('/upload/')[1];
    
    return [
      `${base}w_300,q_auto/${path} 300w`,
      `${base}w_600,q_auto/${path} 600w`,
      `${base}w_800,q_auto/${path} 800w`,
      `${base}w_1200,q_auto/${path} 1200w`
    ].join(', ');
  }
  
  return undefined;
};

/**
 * Verifica si una imagen existe en el servidor
 * @param imageUrl - URL de la imagen a verificar
 * @returns Promise<boolean>
 */
export const checkImageExists = async (imageUrl: string): Promise<boolean> => {
  try {
    const response = await fetch(imageUrl, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
};

/**
 * Preload de imágenes para mejorar la experiencia del usuario
 * @param imageUrls - Array de URLs de imágenes
 */
export const preloadImages = (imageUrls: string[]): void => {
  imageUrls.forEach(url => {
    const img = new Image();
    img.src = url;
  });
}; 