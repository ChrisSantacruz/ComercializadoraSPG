# Arquitectura de almacenamiento de medios (productos)

**Estado:** local/staging (QA)  
**Driver por defecto:** `STORAGE_DRIVER=local`

---

## Objetivo

Contrato estable entre frontend y backend para imágenes y videos de producto, **independiente del proveedor** (disco local hoy, S3/Cloudinary mañana).

---

## Esquema `media` (MongoDB)

```json
{
  "type": "image | video",
  "url": "/uploads/products/img-....webp",
  "filename": "img-....webp",
  "mimeType": "image/webp",
  "size": 245000,
  "width": null,
  "height": null,
  "duration": null,
  "thumbnail": null,
  "order": 0,
  "publicId": null,
  "alt": "Producto - Imagen 1"
}
```

### Compatibilidad legacy

- `imagenes[]` e `imagenPrincipal` se **sincronizan** desde `media` (solo imágenes) en `Product` `pre('save')`.
- Lectura: si `media` vacío, `ensureMediaFromLegacy()` hidrata desde `imagenes`.

---

## Capas backend

```mermaid
flowchart LR
  A[ProductForm multipart] --> B[productMediaUpload]
  B --> C[localMediaStorage]
  C --> D[uploads/products | uploads/videos]
  B --> E[productController]
  E --> F[productMediaService]
  F --> G[Product.media]
  G --> H[sync imagenes legacy]
```

| Módulo | Responsabilidad |
|--------|-----------------|
| `config/storage.js` | Driver, límites, rutas |
| `middlewares/productMediaUpload.js` | Multer, MIME, errores `codigo` |
| `services/localMediaStorage.js` | Disco, URLs, cleanup |
| `services/productMediaService.js` | Mapeo, reorder, delete |
| `services/productStockService.js` | Variantes + stock |

---

## Rutas estáticas

- `GET /uploads/*` y `GET /api/uploads/*` → `backend/uploads/`
- Frontend: `REACT_APP_API_URL` + ruta relativa (`mediaUtils.getMediaUrl`)

---

## Variables de entorno

```env
STORAGE_DRIVER=local
UPLOADS_ROOT=uploads
MEDIA_IMAGE_MAX_MB=5
MEDIA_VIDEO_MAX_MB=50
MEDIA_MAX_IMAGES=10
MEDIA_MAX_VIDEOS=3
```

Cloudinary solo si `STORAGE_DRIVER=cloudinary` y credenciales completas (avatares/categorías legacy en `upload.js`).

---

## Migración futura a CDN

1. Implementar adapter `MediaStorageProvider` con métodos `upload`, `delete`, `getPublicUrl`.
2. En `productMediaService.buildMediaFromUploads`, delegar al provider según `STORAGE_DRIVER`.
3. Mantener forma de `media[]` en respuestas API.
4. Frontend **sin cambios** si URLs absolutas o relativas `/uploads/` siguen resolviéndose.

---

## Límites recomendados (producción)

| Tipo | Tamaño | Cantidad |
|------|--------|----------|
| Imagen | 5 MB | 10 |
| Video | 50 MB | 3 |
| Request multipart | — | timeout cliente 120s |

---

## Edge cases

- **Edición sin archivos nuevos:** solo `mediaOrder` / `removedMediaIds`.
- **Variantes sin imagen archivo:** URLs en `variants[].imagenes`.
- **IDs legacy:** `legacy-img-0` en UI hasta persistir `_id` real.
- **Fallo post-upload:** `cleanupUploadedFiles` elimina temporales.
