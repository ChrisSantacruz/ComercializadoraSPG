const { mapMulterFileToMedia, deleteLocalFile } = require('./localMediaStorage');

/**
 * Mapea archivos multer a documentos media canónicos.
 */
function buildMediaFromUploads(imageFiles = [], videoFiles = [], productName, orderOffset = 0) {
  const base = productName || 'Producto';
  const images = (imageFiles || []).map((file, i) =>
    mapMulterFileToMedia(file, orderOffset + i, 'image', base),
  );
  const videos = (videoFiles || []).map((file, i) =>
    mapMulterFileToMedia(file, orderOffset + images.length + i, 'video', base),
  );
  return [...images, ...videos];
}

/**
 * Sincroniza `imagenes` / `imagenPrincipal` legacy desde `media` (solo imágenes).
 */
function syncLegacyImagesFromMedia(product) {
  const imageMedia = (product.media || [])
    .filter((m) => m.type === 'image')
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  product.imagenes = imageMedia.map((m, i) => ({
    url: m.url,
    publicId: m.publicId || null,
    alt: m.alt || `${product.nombre || 'Producto'} - Imagen ${i + 1}`,
    orden: m.order ?? i,
  }));

  if (imageMedia.length > 0) {
    product.imagenPrincipal = imageMedia[0].url;
  }
}

/**
 * Migra productos antiguos: si tienen imagenes pero no media, poblar media.
 */
function ensureMediaFromLegacy(product) {
  if (Array.isArray(product.media) && product.media.length > 0) return;
  if (!Array.isArray(product.imagenes) || product.imagenes.length === 0) return;

  product.media = product.imagenes.map((img, i) => {
    const url = typeof img === 'string' ? img : img?.url;
    if (!url) return null;
    return {
      type: 'image',
      url,
      filename: null,
      mimeType: null,
      order: typeof img === 'object' && Number.isFinite(img.orden) ? img.orden : i,
      publicId: typeof img === 'object' ? img.publicId : null,
      alt: typeof img === 'object' ? img.alt : undefined,
    };
  }).filter(Boolean);
}

function parseMediaOrderField(value) {
  if (value == null || value === '') return null;
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed.map(String) : null;
  } catch {
    return null;
  }
}

function parseRemovedMediaIds(value) {
  if (value == null || value === '') return [];
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

/**
 * Reordena media existente según lista de IDs.
 */
function reorderMedia(product, orderedIds) {
  if (!orderedIds?.length || !Array.isArray(product.media)) return;
  const byId = new Map(product.media.map((m) => [String(m._id), m]));
  const reordered = [];
  orderedIds.forEach((id, index) => {
    const item = byId.get(String(id));
    if (item) {
      item.order = index;
      reordered.push(item);
    }
  });
  product.media.forEach((m) => {
    if (!orderedIds.includes(String(m._id))) {
      m.order = reordered.length;
      reordered.push(m);
    }
  });
  product.media = reordered.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/**
 * Elimina media por ID y archivos locales.
 */
function removeMediaByIds(product, idsToRemove = []) {
  if (!idsToRemove.length || !Array.isArray(product.media)) return;
  const removeSet = new Set(idsToRemove.map(String));
  const removed = [];
  product.media = product.media.filter((item) => {
    if (removeSet.has(String(item._id))) {
      removed.push(item);
      return false;
    }
    return true;
  });
  removed.forEach((item) => {
    deleteLocalFile(item.url);
    if (item.thumbnail) deleteLocalFile(item.thumbnail);
  });
  product.media.forEach((m, i) => {
    m.order = i;
  });
}

function getPrimaryImageUrl(product) {
  const images = (product.media || []).filter((m) => m.type === 'image').sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  if (images.length) return images[0].url;
  return product.imagenPrincipal || product.imagenes?.[0]?.url || null;
}

module.exports = {
  buildMediaFromUploads,
  syncLegacyImagesFromMedia,
  ensureMediaFromLegacy,
  parseMediaOrderField,
  parseRemovedMediaIds,
  reorderMedia,
  removeMediaByIds,
  getPrimaryImageUrl,
};
