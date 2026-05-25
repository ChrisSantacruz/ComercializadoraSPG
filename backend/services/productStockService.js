/**
 * Validación de stock y variantes para creación/actualización de productos.
 */

function coerceNumber(value, fallback = 0) {
  if (value === '' || value == null || value === undefined) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeVariantsInput(rawVariants, productName, basePrice) {
  let parsed = rawVariants;
  if (typeof rawVariants === 'string') {
    try {
      parsed = JSON.parse(rawVariants);
    } catch {
      return { variants: [], error: { code: 'INVALID_VARIANTS_JSON', message: 'El campo variants no es JSON válido' } };
    }
  }
  if (!Array.isArray(parsed)) return { variants: [], error: null };

  const normalized = [];
  for (let index = 0; index < parsed.length; index++) {
    const variant = parsed[index];
    const attributes =
      variant?.attributes && typeof variant.attributes === 'object'
        ? Object.fromEntries(
            Object.entries(variant.attributes)
              .map(([key, value]) => [String(key).trim(), String(value || '').trim()])
              .filter(([key, value]) => key && value),
          )
        : {};

    if (Object.keys(attributes).length === 0) {
      return {
        variants: [],
        error: { code: 'VARIANT_MISSING_ATTRIBUTES', message: `La variante ${index + 1} debe tener al menos un atributo` },
      };
    }

    const rawPrecio = variant.precio === '' || variant.precio == null ? basePrice : variant.precio;
    const precio = coerceNumber(rawPrecio, coerceNumber(basePrice, 0));
    if (precio <= 0) {
      return {
        variants: [],
        error: { code: 'VARIANT_INVALID_PRICE', message: `La variante ${index + 1} debe tener precio mayor a 0` },
      };
    }

    const rawOferta = variant.precioOferta;
    const precioOferta =
      rawOferta === '' || rawOferta == null ? undefined : coerceNumber(rawOferta, undefined);
    if (precioOferta != null && (precioOferta <= 0 || precioOferta >= precio)) {
      return {
        variants: [],
        error: {
          code: 'VARIANT_INVALID_SALE_PRICE',
          message: `La variante ${index + 1} tiene precio de oferta inválido`,
        },
      };
    }

    const stock = coerceNumber(variant.stock, 0);
    if (stock < 0) {
      return {
        variants: [],
        error: { code: 'VARIANT_NEGATIVE_STOCK', message: `La variante ${index + 1} no puede tener stock negativo` },
      };
    }

    const imagenes = normalizeVariantImages(variant.imagenes, productName, index);

    normalized.push({
      _id: variant._id,
      sku: typeof variant.sku === 'string' ? variant.sku.trim() : '',
      attributes,
      precio,
      ...(precioOferta != null && precioOferta > 0 ? { precioOferta } : {}),
      stock,
      imagenes,
      activo: variant.activo !== false,
      isDefault: variant.isDefault === true,
    });
  }

  return { variants: normalized, error: null };
}

function normalizeVariantImages(value, productName, index) {
  const list = Array.isArray(value) ? value : [];
  return list
    .map((image, imageIndex) => {
      const url = typeof image === 'string' ? image : image?.url;
      if (!url || typeof url !== 'string') return null;
      return {
        url: url.trim(),
        publicId: typeof image === 'object' ? image.publicId || image.public_id || null : null,
        alt: (typeof image === 'object' && image.alt) || `${productName || 'Producto'} - Variante ${index + 1}`,
        orden: Number.isFinite(Number(image?.orden)) ? Number(image.orden) : imageIndex,
      };
    })
    .filter(Boolean);
}

/**
 * Valida coherencia stock producto vs variantes.
 */
function validateStockPolicy({ stock, variants }) {
  const hasVariants = Array.isArray(variants) && variants.length > 0;

  if (!hasVariants) {
    const productStock = coerceNumber(stock, 0);
    if (productStock < 0) {
      return { code: 'NEGATIVE_STOCK', message: 'El stock del producto no puede ser negativo' };
    }
    return null;
  }

  const active = variants.filter((v) => v.activo !== false);
  if (active.length === 0) {
    return { code: 'NO_ACTIVE_VARIANTS', message: 'Debe haber al menos una variante activa' };
  }

  const totalVariantStock = active.reduce((sum, v) => sum + Math.max(0, coerceNumber(v.stock, 0)), 0);
  if (totalVariantStock <= 0) {
    return { code: 'VARIANT_STOCK_REQUIRED', message: 'Al menos una variante activa debe tener stock mayor a 0' };
  }

  return null;
}

/**
 * Calcula stock y precio de producto cuando hay variantes (antes de pre-save).
 */
function applyVariantAggregates(product) {
  const active = (product.variants || []).filter((v) => v.activo !== false);
  if (!active.length) return;

  product.stock = active.reduce((total, v) => total + Math.max(0, coerceNumber(v.stock, 0)), 0);

  const prices = active
    .map((v) => coerceNumber(v.precioOferta, null) ?? coerceNumber(v.precio, 0))
    .filter((p) => Number.isFinite(p) && p >= 0);
  if (prices.length) {
    product.precio = Math.min(...prices);
  }
}

module.exports = {
  coerceNumber,
  normalizeVariantsInput,
  validateStockPolicy,
  applyVariantAggregates,
};
