/**
 * Utilidades para manejar direcciones de entrega en pedidos
 */

import { Address } from '../types';

// Tipo union para direcciones de entrega (puede venir del backend o frontend)
export interface OrderDeliveryAddress {
  nombre: string;
  telefono?: string;
  calle: string;
  ciudad: string;
  departamento: string;
  codigoPostal?: string;
  pais?: string;
  instrucciones?: string;
}

export type DeliveryAddressType = Address | OrderDeliveryAddress;

/**
 * Obtiene el nombre del destinatario de cualquier tipo de dirección
 */
export const getRecipientName = (address: DeliveryAddressType): string => {
  const addr = address as any;
  return addr.nombre || addr.nombreDestinatario || 'No especificado';
};

/**
 * Obtiene el teléfono de cualquier tipo de dirección
 */
export const getRecipientPhone = (address: DeliveryAddressType): string => {
  const addr = address as any;
  return addr.telefono || 'No especificado';
};

/**
 * Construye la dirección completa a partir de cualquier tipo de dirección
 */
export const getCompleteAddress = (address: DeliveryAddressType): string => {
  const addr = address as any;

  if (addr.calle === 'Recoger en establecimiento') {
    return 'Recoger en establecimiento';
  }
  
  // Si ya tiene direccionCompleta construida, usarla
  if (addr.direccionCompleta) {
    return addr.direccionCompleta;
  }
  
  // Si tiene la estructura del backend, construir la dirección
  if (addr.calle && addr.ciudad && addr.departamento) {
    return `${addr.calle}, ${addr.ciudad}, ${addr.departamento}${addr.codigoPostal ? `, ${addr.codigoPostal}` : ''}`;
  }
  
  // Si tiene la estructura de Address (frontend)
  if (addr.direccion && addr.direccion.calle && addr.direccion.ciudad && addr.direccion.departamento) {
    const dir = addr.direccion;
    return `${dir.calle}${dir.numero ? ` #${dir.numero}` : ''}${dir.apartamento ? ` Apt ${dir.apartamento}` : ''}, ${dir.barrio ? `${dir.barrio}, ` : ''}${dir.ciudad}, ${dir.departamento}${dir.codigoPostal ? `, ${dir.codigoPostal}` : ''}`;
  }
  
  // Fallback
  return 'Dirección no disponible';
};

/**
 * Obtiene las instrucciones de entrega de cualquier tipo de dirección
 */
export const getDeliveryInstructions = (address: DeliveryAddressType): string | null => {
  const addr = address as any;
  return addr.instrucciones || addr.instruccionesEntrega || null;
};

/**
 * Verifica si hay instrucciones de entrega
 */
export const hasDeliveryInstructions = (address: DeliveryAddressType): boolean => {
  return !!getDeliveryInstructions(address);
};

/**
 * Formatea toda la información de dirección para mostrar
 */
export const formatDeliveryInfo = (address: DeliveryAddressType) => {
  return {
    recipientName: getRecipientName(address),
    recipientPhone: getRecipientPhone(address),
    completeAddress: getCompleteAddress(address),
    instructions: getDeliveryInstructions(address),
    hasInstructions: hasDeliveryInstructions(address)
  };
};
