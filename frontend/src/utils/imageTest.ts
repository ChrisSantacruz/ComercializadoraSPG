import { getImageUrl, checkImageExists } from './imageUtils';
import { log } from '../lib/observability/logger';

/**
 * Prueba la configuración de imágenes (dev / diagnósticos manuales).
 */
export const testImageConfiguration = async () => {
  log.debug('image.config.test.start', {});

  log.debug('image.config.env', {
    REACT_APP_API_URL: process.env.REACT_APP_API_URL || 'not-set',
    NODE_ENV: process.env.NODE_ENV,
  });

  const testUrls = [
    null,
    undefined,
    'product-123.jpg',
    '/uploads/productos/product-123.jpg',
    'https://res.cloudinary.com/example/image.jpg',
    'http://localhost:5001/uploads/productos/product-123.jpg',
  ];

  testUrls.forEach((url, index) => {
    const processedUrl = getImageUrl(url);
    log.debug(`image.config.case.${index}`, { entrada: url, salida: processedUrl });
  });

  try {
    const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';
    const response = await fetch(`${backendUrl}/api/products`);
    log.debug('image.config.backend', { status: response.status });
  } catch (error) {
    log.warn('image.config.backend.fail', { error });
  }

  log.debug('image.config.test.done', {});
};

/**
 * Prueba una imagen específica
 */
export const testSpecificImage = async (imageUrl: string) => {
  log.debug('image.specific.start', { imageUrl });

  const processedUrl = getImageUrl(imageUrl);

  const exists = await checkImageExists(processedUrl);
  log.debug('image.specific.result', { processedUrl, exists });

  return { processedUrl, exists };
};

/**
 * Prueba múltiples imágenes
 */
export const testMultipleImages = async (imageUrls: string[]) => {
  log.debug('image.multi.start', { count: imageUrls.length });

  const results = await Promise.all(
    imageUrls.map(async (url) => {
      const result = await testSpecificImage(url);
      return { originalUrl: url, ...result };
    }),
  );

  const successful = results.filter((r) => r.exists).length;
  const failed = results.filter((r) => !r.exists).length;

  log.debug('image.multi.summary', {
    exitosas: successful,
    fallidas: failed,
    tasa:
      results.length > 0 ? ((successful / results.length) * 100).toFixed(1) + '%' : 'n/a',
  });

  return results;
};
