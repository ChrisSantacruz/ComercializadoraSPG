import type { Cart } from '../types';
import { safeMoney } from './safeNumeric';

/** Best-effort línea + totales hasta que el servidor confirme (onSettled invalida). */
export function patchCartLineQuantity(cart: Cart, productId: string, cantidad: number, variantId?: string): Cart {
  const productos = cart.productos
    .map((item) => {
      if (item.producto._id !== productId || (item.variantId || '') !== (variantId || '')) return item;
      const q = Math.max(0, Math.floor(cantidad));
      const unit = safeMoney(item.precio);
      return { ...item, cantidad: q, subtotal: unit * Math.max(q, 0) };
    })
    .filter((item) => item.cantidad > 0);

  const subtotal = productos.reduce((acc, item) => acc + safeMoney(item.subtotal), 0);
  const descuentos = safeMoney(cart.descuentos);
  const impuestos = safeMoney(cart.impuestos);
  const costoEnvio = safeMoney(cart.costoEnvio);
  const total = Math.max(0, subtotal - descuentos + impuestos + costoEnvio);

  return {
    ...cart,
    productos,
    subtotal,
    total,
  };
}

export function removeCartLine(cart: Cart, productId: string, variantId?: string): Cart {
  const productos = cart.productos.filter(
    (item) => !(item.producto._id === productId && (item.variantId || '') === (variantId || '')),
  );
  const subtotal = productos.reduce((acc, item) => acc + safeMoney(item.subtotal), 0);
  const descuentos = safeMoney(cart.descuentos);
  const impuestos = safeMoney(cart.impuestos);
  const costoEnvio = safeMoney(cart.costoEnvio);
  const total = Math.max(0, subtotal - descuentos + impuestos + costoEnvio);
  return { ...cart, productos, subtotal, total };
}
