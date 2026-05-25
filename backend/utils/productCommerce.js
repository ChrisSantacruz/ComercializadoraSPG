/**
 * Shared commerce rules for cart + order (variants, stock, product state).
 */

const APPROVED_STATES = new Set(['aprobado', 'approved']);

const normalizeId = (value) => (value ? String(value) : '');

function isProductApproved(estado) {
  return APPROVED_STATES.has(estado);
}

function listActiveVariants(producto) {
  if (!producto?.variants) return [];
  const raw = producto.variants;
  const list = typeof raw.toObject === 'function' ? Array.from(raw) : Array.isArray(raw) ? raw : [];
  return list.filter((v) => v && v.activo !== false);
}

function findVariant(producto, variantId) {
  if (!variantId) return null;
  const id = normalizeId(variantId);
  if (producto.variants?.id) {
    return producto.variants.id(variantId) || null;
  }
  return listActiveVariants(producto).find((v) => normalizeId(v._id) === id) || null;
}

/**
 * Resolves variant for add/update/order. Throws { statusCode, message, codigo } when invalid.
 */
function resolvePurchasableVariant(producto, variantId) {
  const activeVariants = listActiveVariants(producto);

  if (!variantId) {
    if (activeVariants.length > 0) {
      const error = new Error('Selecciona una variante (talla, color o versión) antes de continuar');
      error.statusCode = 400;
      error.codigo = 'VARIANT_REQUIRED';
      error.accion = 'Elige talla, color o versión en la ficha del producto';
      throw error;
    }
    return null;
  }

  const variant = findVariant(producto, variantId);
  if (!variant || variant.activo === false) {
    const error = new Error('La variante seleccionada no está disponible');
    error.statusCode = 400;
    error.codigo = 'VARIANT_UNAVAILABLE';
    error.accion = 'Elige otra variante o actualiza el carrito';
    throw error;
  }
  return variant;
}

function getLineCommerce(producto, variant) {
  const availableStock = variant ? variant.stock : producto.stock;
  const unitPrice = variant
    ? (variant.precioOferta || variant.precio)
    : (producto.precioOferta || producto.precio);
  const image =
    variant?.imagenes?.[0]?.url ||
    producto.imagenPrincipal ||
    (producto.imagenes?.length > 0 ? producto.imagenes[0].url : '') ||
    '';

  return { availableStock, unitPrice, image };
}

function variantLabel(variant) {
  if (!variant?.attributes) return '';
  const attrs = variant.attributes;
  const entries =
    attrs instanceof Map
      ? Array.from(attrs.entries())
      : Object.entries(attrs);
  return entries.map(([k, v]) => `${k}: ${v}`).join(' · ');
}

function sanitizeCartLogPayload(body) {
  if (!body || typeof body !== 'object') return {};
  return {
    productoId: body.productoId ? String(body.productoId).slice(0, 24) : undefined,
    cantidad: body.cantidad,
    variantId: body.variantId ? String(body.variantId).slice(0, 24) : undefined,
  };
}

module.exports = {
  APPROVED_STATES,
  normalizeId,
  isProductApproved,
  listActiveVariants,
  findVariant,
  resolvePurchasableVariant,
  getLineCommerce,
  variantLabel,
  sanitizeCartLogPayload,
};
