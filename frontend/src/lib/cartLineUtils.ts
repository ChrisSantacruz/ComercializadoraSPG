import type { CartItem } from '../types';

/** Resolves Mongo product id whether cart line has populated product or stale persist. */
export function resolveCartProductId(item: CartItem): string {
  const p = item.producto as CartItem['producto'] | string;
  if (typeof p === 'string') return p;
  if (p && typeof p === 'object' && '_id' in p && p._id) return String(p._id);
  return '';
}

export function cartLineKey(item: CartItem): string {
  return `${resolveCartProductId(item)}::${item.variantId || ''}`;
}
