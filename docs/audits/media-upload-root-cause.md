# Auditoría: causa raíz — creación de productos y subida de medios

**Fecha:** 2026-05-25  
**Alcance:** flujo completo `ProductForm` → `POST/PUT /api/products` → Multer → persistencia MongoDB

---

## Resumen ejecutivo

Se identificaron **dos fallas críticas** independientes pero que se manifestaban juntas en QA:

1. **Variantes + stock:** el backend aceptaba `precio` vacío en JSON como `0` (válido según `Number.isFinite`), y el stock a nivel producto competía con la suma de variantes sin validación previa al `save`. Los errores de duplicado de atributos en `pre('save')` devolvían **500** sin código estructurado.
2. **Medios / Cloudinary:** con credenciales vacías o inválidas, `multer-storage-cloudinary` podía activarse de forma inconsistente; rutas mezcladas (`/uploads/productos` vs disco) y ausencia de soporte de **videos** en productos.

**Solución aplicada:** `STORAGE_DRIVER=local` por defecto, middleware dedicado `productMediaUpload.js`, esquema `media[]` canónico, validación explícita en `productStockService.js`, errores con `codigo`/`code`.

---

## Bug 1 — Producto con variantes no se crea correctamente

### Síntomas

- Producto guardado con precio `0` en variantes.
- Stock del producto distinto a la suma de variantes.
- Error genérico 500 al duplicar combinación de atributos.

### Causa raíz

| Capa | Problema |
|------|----------|
| Frontend | Enviaba `stock` manual y `variants` con `precio`/`stock` como strings; sin bloquear stock de producto cuando hay variantes. |
| Controller | `Number(variant.precio ?? basePrice)` — si `precio === ""`, resultaba `0` finito, no el precio base. |
| Controller | Sin validación de política de stock antes de `save`. |
| Model `pre('save')` | Recalcula stock/precio (correcto) pero lanzaba `Error` plano → 500. |

### Corrección

- `normalizeVariantsInput` trata `""` como “usar precio base”.
- `validateStockPolicy` exige stock > 0 en variantes activas o stock producto ≥ 0 sin variantes.
- Frontend: stock de producto **solo lectura** cuando hay variantes; envía suma calculada.
- Errores estructurados: `VARIANT_INVALID_PRICE`, `VARIANT_STOCK_REQUIRED`, `VARIANT_CONFLICT`.

---

## Bug 2 — Subida de imágenes falla (Cloudinary)

### Síntomas

- `req.files` vacío o URLs rotas.
- Timeout en multipart grande.
- Imágenes no accesibles en catálogo.

### Causa raíz

| Factor | Detalle |
|--------|---------|
| Cloudinary opcional mal detectado | Variables vacías en `.env` pero lógica antigua podía intentar SDK. |
| Un solo campo `imagenes` | Sin `videos`; filtros MIME solo imagen. |
| Rutas legacy | `uploads/productos` vs nuevo `uploads/products`. |
| Sin cleanup | Archivos huérfanos en disco si fallaba `save()`. |
| Errores Multer | Respuesta sin `codigo` canónico. |

### Corrección

- `STORAGE_DRIVER=local` (default) en `config/storage.js`.
- `middlewares/productMediaUpload.js`: disco local, campos `imagenes` + `videos`, límites configurables.
- `services/localMediaStorage.js` + `productMediaService.js`.
- Cleanup en fallo de negocio.
- URLs públicas: `/uploads/products/`, `/uploads/videos/` servidas por `express.static`.

---

## Contrato FormData (canónico)

| Campo | Tipo | Notas |
|-------|------|-------|
| `nombre`, `descripcion`, `precio`, `stock`, `categoria` | string | `stock` = suma variantes si hay variantes |
| `tags`, `especificaciones`, `variants` | JSON string | |
| `imagenes` | File[] | máx. 10, 5 MB c/u |
| `videos` | File[] | máx. 3, 50 MB c/u |
| `removedMediaIds` | JSON string[] | solo en edición |
| `mediaOrder` | JSON string[] | IDs de media existente |

---

## Riesgos y deuda

| Riesgo | Mitigación futura |
|--------|-------------------|
| Disco efímero en PaaS | Migrar a S3/Cloudinary con `STORAGE_DRIVER=cloudinary` sin cambiar contrato `media[]` |
| Sin thumbnails de video | Generar poster con ffmpeg o servicio worker |
| GridFS no usado | Evaluar si videos > 50 MB requieren GridFS |

---

## Verificación recomendada

Ver `docs/testing/media-upload-e2e.md`.
