/**
 * Utilidades de debug para la aplicación
 */

import { getImageUrl } from './imageUtils';
import { log } from '../lib/observability/logger';

/**
 * Verifica si el backend está respondiendo
 */
export const checkBackendConnection = async (): Promise<boolean> => {
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

  try {
    const response = await fetch(`${API_BASE_URL}/`);
    if (response.ok) {
      const data = await response.json();
      if (process.env.NODE_ENV === 'development') {
        log.debug('backend.ping.ok', { message: data.message || 'OK' });
      }
      return true;
    }
    return false;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      log.debug('backend.ping.fail', { error });
    }
    return false;
  }
};

/**
 * Función de debug para verificar las URLs de las imágenes en los pedidos
 */
export const debugOrderImages = (order: any): void => {
  log.debug('order.images.debug', { orden: order?.numeroOrden });

  if (order.productos && Array.isArray(order.productos)) {
    order.productos.forEach((item: any, index: number) => {
      log.debug(`order.images.item.${index}`, {
        nombre: item.producto?.nombre || 'Sin nombre',
        imagenPedido: item.imagen,
        imagenesProducto: item.producto?.imagenes,
      });

      const imagenPedido = item.imagen;
      const imagenProducto = item.producto?.imagenes?.[0];
      const imagenProductoUrl = item.producto?.imagenes?.[0]?.url;

      try {
        const urlFinalPedido = getImageUrl(imagenPedido);
        log.debug('order.images.resolve.pedido', { url: urlFinalPedido });
      } catch (error) {
        log.warn('order.images.error.pedido', { error });
      }

      try {
        const urlFinalProducto = getImageUrl(imagenProducto);
        log.debug('order.images.resolve.producto', { url: urlFinalProducto });
      } catch (error) {
        log.warn('order.images.error.producto', { error });
      }

      try {
        const urlFinalProductoUrl = getImageUrl(imagenProductoUrl);
        log.debug('order.images.resolve.productoUrl', { url: urlFinalProductoUrl });
      } catch (error) {
        log.warn('order.images.error.productoUrl', { error });
      }
    });
  }
};

/**
 * Función para verificar si una URL de imagen es válida
 */
export const testImageUrl = async (url: string): Promise<boolean> => {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    log.warn('image.url.head.fail', { url, error });
    return false;
  }
};
