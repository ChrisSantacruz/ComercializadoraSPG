# Auditoría técnica — Módulo `Products`

> **Documento oficial de refactor.** Toda implementación sobre el módulo Products debe alinearse con este documento. Si una decisión se desvía del plan aquí descrito, debe justificarse explícitamente.

- **Módulo auditado:** catálogo público, detalle de producto, panel de comerciante, servicios, contratos y modelo.
- **Fecha:** 2026-05-11
- **Estado:** Auditoría completada · Implementación pendiente de confirmación.
- **Alcance:** Frontend (React + TypeScript + Tailwind) y Backend (Node + Express + MongoDB + Mongoose).
- **Documentos relacionados:** `docs/audits/home-audit.md` (Home depende del mismo `ProductCard` que se define aquí).

---

## 1. Resumen ejecutivo

El módulo Products está roto en cinco frentes simultáneamente:

1. **Contrato API ↔ frontend roto en al menos 6 puntos**: el `productService` expone 8 endpoints que **el backend no implementa**, el sort `ordenar` se envía con guiones (`precio-asc`) y el backend espera underscores (`precio_asc`), `paginacion.elementosPorPagina` nunca llega porque el backend devuelve `limitePorPagina`, el `Product.imagenes` se tipa como `string[]` cuando el backend devuelve `[{url, publicId, alt, orden}]`, `especificaciones` se tipa como `Record` cuando el backend devuelve `[{nombre, valor}]`, y `Product.estadisticas.vendidos` no existe en el modelo (es `cantidadVendida`).
2. **Duplicación masiva de tarjeta de producto**: existen **5 implementaciones inline** de `ProductCard` (`ProductsPage`, `NewHomePage`, `MerchantProducts`, `ProductDetailPage > productosRelacionados`, `TopProductsWidget`). 0 componentes reutilizables.
3. **Backend sin capa de servicios**: la lógica de filtros, sort, paginación, agregaciones y transformación de imágenes vive en los controllers. Viola `backend-rules.mdc`. Además `incrementarVistas()` está definido pero **nunca se invoca**, por lo que los sorts "popular" / "más vistos" son estadísticas siempre en cero.
4. **UX/UI fuera de las reglas**: el catálogo violenta `ui-rules.mdc` con 9 gradientes distintos, emojis como única señal visual, hero gigante saturado, `hover:-translate-y-2` en cada card del grid, sin skeletons, sin debounce en búsqueda, sin URL-state (los filtros no se reflejan en la URL).
5. **SEO inexistente**: 0 `<title>` dinámicos, 0 meta tags por producto, 0 schema.org, URLs por `_id` ignorando el `slug` que el modelo ya guarda, búsqueda no reflejada en URL. El catálogo es invisible para crawlers y Google Shopping.

El refactor se ejecutará en **8 fases (0 a 7)** priorizadas por riesgo y dependencias. Algunas dependen del refactor pendiente de Home (Fase 2 y 3 del home-audit).

---

## 2. Estado actual (hechos verificados)

| Archivo | LOC | Estado |
|---|---|---|
| `frontend/src/pages/products/ProductsPage.tsx` | 486 | Activo. Catálogo público. Excede el límite de 250 LOC de `frontend-rules.mdc` casi 2x. |
| `frontend/src/pages/products/ProductDetailPage.tsx` | 585 | Activo. Detalle. 2.3x el límite. |
| `frontend/src/pages/merchant/MerchantProducts.tsx` | 348 | Activo. Panel comerciante. |
| `frontend/src/components/forms/ProductForm.tsx` | 393 | Activo. Form de creación/edición. Contiene **15 ObjectIds inventados** como fallback. |
| `frontend/src/components/ui/ProductImage.tsx` | 88 | **Componente con skeleton/fallback existe pero NO se usa en ningún sitio.** |
| `frontend/src/services/productService.ts` | 161 | Expone **8 endpoints que el backend no implementa**. |
| `frontend/src/services/merchantService.ts` | 132 | Duplica `getProducts` apuntando a `/commerce/products`. Adapta `data.productos || []` (contrato distinto al público). |
| `backend/controllers/productController.js` | 500 | Lógica de filtros, sort, paginación, agregación de reviews + estadísticas + relacionados, todo en un solo handler. Funciones gigantes. |
| `backend/controllers/commerceController.js > gestionarProductos` | ~85 | Duplica la responsabilidad de `productController.obtenerMisProductos`. Dos endpoints distintos para "productos del comerciante" devolviendo formatos distintos. |
| `backend/models/Product.js` | 367 | Buen modelo. `slug`, `precioOferta`, `promocion`, virtuals `precioFinal`/`porcentajeDescuento`/`disponible`/`estadoStock` — **nada de esto se usa en el frontend.** |
| `backend/utils/helpers.js` | 422 | **Dos bloques `module.exports`** consecutivos: el primero (líneas 280-310) lo sobreescribe el segundo (387-422). Bug latente. |

**Veredicto general:** sistema parchado capa por capa, sin contratos firmes, sin componentes base, con código muerto en ambos lados.

---

## 3. Checklist de problemas detectados

### 3.1 Severidad CRÍTICA (riesgo funcional o de datos)

- [ ] **C1** — **Endpoints fantasma**: `productService` expone 8 endpoints que el backend no monta. Tabla:

  | Frontend (`productService`) | Backend route registrado | Estado |
  |---|---|---|
  | `GET /products/search` | — | 404 |
  | `GET /products/featured` | — | 404 |
  | `GET /products/best-sellers` | — | 404 |
  | `GET /products/recent` | — | 404 |
  | `GET /products/:id/related` | — | 404 (relacionados van inline en `GET /:id`) |
  | `GET /products/price-ranges` | — | 404 |
  | `GET /products/suggestions` | — | 404 |
  | `GET /products/:id/stats` | — | 404 |

  Hoy no se notan porque `NewHomePage` abusa de `getProducts({ limit, ordenar })`, pero cualquiera que toque autocomplete, filtros de rango, productos destacados reales o productos relacionados se va a romper en producción.

- [ ] **C2** — **Sort `ordenar` BROKEN**: frontend envía `precio-asc`, `precio-desc`, `fecha-desc`, `fecha-asc`, `popular`, `calificacion`. Backend (productController) maneja `precio_asc`, `precio_desc`, `nombre`, `calificacion` y todo lo demás cae al default `{ fechaCreacion: -1 }`. El usuario ve un select con 6 opciones; **en realidad 5 hacen lo mismo y 1 funciona por accidente** (`calificacion`).

- [ ] **C3** — **Contrato `Product.imagenes` divergente**:
  - Modelo backend: `[{ url, publicId, alt, orden }]`.
  - Tipo frontend: `imagenes: string[]`.
  - Resultado: en TODA la app se ve `getFirstImageUrl(product.imagenes)` con un `getFirstImageUrl` que tiene que detectar `typeof === 'string' || (typeof === 'object' && .url)`. Defensa cara, contrato sucio.

- [ ] **C4** — **Contrato `Product.especificaciones` divergente**:
  - Modelo backend: `[{ nombre, valor }]`.
  - Tipo frontend: `especificaciones: Record<string, any>`.
  - Consecuencia en `ProductForm.tsx:30-42`: lee `product?.especificaciones?.color` para precargar el form al editar. Como el backend devuelve un array, **al editar producto los campos color/tamaño/material/marca SIEMPRE arrancan vacíos.** Bug silencioso, pérdida de datos al guardar (el submit reescribe especificaciones desde el form vacío).

- [ ] **C5** — **`paginacion.elementosPorPagina` nunca llega**: backend devuelve `limitePorPagina` (`helpers.crearPaginacion`), frontend espera `elementosPorPagina` (`types/index.ts > PaginatedResponse`). Cualquier cálculo derivado en frontend (no implementado hoy, pero referenciado) usará `undefined`.

- [ ] **C6** — **`Product.estadisticas.vendidos` no existe**: el tipo frontend lo declara, el modelo backend tiene `ventasTotal` y `cantidadVendida`. Ningún componente lo usa hoy, pero el contrato miente.

- [ ] **C7** — **Doble `module.exports` en `backend/utils/helpers.js`**: líneas 280-310 declaran un export, líneas 387-422 lo sobreescriben. El primero es código muerto. Riesgo: cualquier dev que agregue export al primer bloque verá su cambio desaparecido.

- [ ] **C8** — **`ProductForm` hardcodea 15 categorías con ObjectIds inventados**: `frontend/src/components/forms/ProductForm.tsx:65-81` define un fallback con ObjectIds **falsos** (`64f8c2e2a1b2c3d4e5f6a701` etc.). Si la API de categorías falla, el comerciante puede crear productos cuyo `categoria` apunta a un documento inexistente → producto huérfano que ninguna query de catálogo recupera (porque populate retorna null para ese ID).

- [ ] **C9** — **`incrementarVistas()` jamás se invoca**: definido en `models/Product.js:285` pero ningún controller lo llama. `GET /products/:id` debería incrementar `estadisticas.vistas`. Consecuencia: el sort `popular` (cuando exista) y cualquier KPI "más visto" reporta 0 para todos los productos. El índice `productSchema.index({ 'estadisticas.vistas': -1 })` es inútil.

- [ ] **C10** — **`gestionarProductos` (commerce) devuelve formato distinto al resto**: `{ productos, paginacion, estadisticas, filtros }` (clave `productos`) vs `{ datos, paginacion }` del catálogo público y `mis-productos`. Tres formatos para "una lista de productos". El frontend ya tiene parches: `merchantService.getProducts` mapea `data.productos || []` mientras `ProductsPage` mapea `data.datos`.

- [ ] **C11** — **`gestionarProductos` NO transforma las URLs de imagen**: la lista pública pasa por `transformarProductos(productos)` para convertir rutas locales en placeholder, pero `gestionarProductos` lo omite. El panel del comerciante puede mostrar URLs `/uploads/...` rotas cuando el deploy no sirve uploads localmente.

### 3.2 Severidad ALTA (arquitectura y mantenibilidad)

- [ ] **A1** — **5 implementaciones inline de "tarjeta de producto"**:

  | Archivo | Líneas | Variante |
  |---|---|---|
  | `ProductsPage.tsx` | 327-405 | 2 botones (Ver / Carrito), badge "OFERTA" por tag, rating, stock, h-64 |
  | `NewHomePage.tsx` | 79-132 | 1 botón Ver más, prop `showOffer`, h-48 |
  | `MerchantProducts.tsx` | 264-326 | Botones Editar/Eliminar, badge de estado, h-48 |
  | `ProductDetailPage.tsx` | 547-577 | "Productos relacionados", mini card sin botón carrito |
  | `TopProductsWidget.tsx` | 53-95 | Ranking 🥇🥈🥉, sin stock, sin precio listado |

  Cada una con su propio `getFirstImageUrl(...)`, su propio `onError={handleImageError}`, su propia paleta. Ninguna usa `<ProductImage>` (que ya existe).

- [ ] **A2** — **`<ProductImage>` huérfano**: componente con skeleton + fallback + manejo de error, **0 usos** en la app. Es el componente que el resto debería estar usando.

- [ ] **A3** — **`getCategoryName` duplicado en 4 archivos**: `ProductsPage.tsx:174`, `MerchantProducts.tsx:117`, `ProductDetailPage.tsx:123`, `ProductForm.tsx` (implícito en el select). Cada uno hace `O(n)` por render contra el array `categories` local. En grid de 15 productos = 15 lookups por render.

- [ ] **A4** — **Carga redundante de categorías**: cada página de productos hace su propio `categoryService.getActiveCategories()` (`ProductsPage`, `MerchantProducts`, `ProductForm`, `NewHomePage`). Sin cache global. Navegar Home → Catálogo → Detalle dispara 3 requests `/categories` idénticas.

- [ ] **A5** — **Doble endpoint "productos del comerciante"**: `GET /api/products/mis-productos` (productController) y `GET /api/commerce/products` (commerceController). Lógica casi idéntica, formato de respuesta distinto. `merchantService` usa el segundo; nadie usa el primero. Código muerto + posible drift.

- [ ] **A6** — **Lógica de filtros duplicada entre controllers**: `productController.obtenerProductos`, `productController.obtenerMisProductos` y `commerceController.gestionarProductos` repiten la construcción de `filtros = {...}`, `sortOptions`, paginación, sin un servicio compartido. Viola `backend-rules.mdc` ("controllers ligeros, lógica en services").

- [ ] **A7** — **Query params inconsistentes**:
  - `productController` acepta `q` **y** `busqueda`, `precioMin` **y** `minPrecio`, `precioMax` **y** `maxPrecio`. Aliases sin documentar.
  - `commerceController` acepta solo `busqueda` (no `q`).
  - `merchantService` envía `busqueda` (desde `filters.q`). Funciona, pero ningún test garantiza esto.
  - `productService.searchProducts` envía `q`. Ese endpoint ni siquiera existe en backend (ver C1).

- [ ] **A8** — **Modelo rico, frontend pobre**: backend tiene `precioOferta`, `promocion`, `precioFinal` (virtual), `porcentajeDescuento` (virtual), `disponible` (virtual), `estadoStock` (virtual), `dimensiones`, `envio`, `marca`, `modelo`, `subcategoria`, `slug`, `palabrasClave`, `stockMinimo`, `unidadMedida`. **Frontend usa solo precio, stock, nombre, descripcion, categoria, imagenes, tags y `estadisticasReseñas`.** Lo demás es payload muerto en cada respuesta.

- [ ] **A9** — **"OFERTA" decorativo, no real**: `ProductsPage` muestra badge `🔥 OFERTA` cuando `product.tags.includes('oferta')`. Sin embargo el modelo tiene `precioOferta`, `promocion.activa`, `promocion.descuento` para descuentos reales. **La oferta es un tag de texto, no un descuento aplicado al precio.**

- [ ] **A10** — **`successResponse` redefinido**: en `helpers.js` línea 34 (primer export) y línea 34 también del segundo bloque (mismo cuerpo). Idéntico, pero el patrón "dos exports" hace fácil divergir.

- [ ] **A11** — **`URL-state ausente** en `ProductsPage`: filtros y página viven en state local de React. Cambiar de categoría no actualiza `?categoria=...` en la URL. Consecuencias:
  - No se puede compartir un filtro por link.
  - `NewHomePage` ya enlaza con `/productos?categoria=...` pero `ProductsPage` ignora `useSearchParams()` → al click la URL cambia pero el filtro queda vacío.
  - Tracking analytics imposible.
  - SEO: cero rastreo de páginas filtradas.

- [ ] **A12** — **Search box sin debounce**: cada keystroke en `<input value={filters.q}>` dispara `setFilters` → `useEffect([filters])` → fetch. En mobile con teclado lento = N fetches en flight.

- [ ] **A13** — **`useEffect`/`useCallback` con `products.length` en deps**: `loadData = useCallback(..., [filters, currentPage, products.length])`. Cada cambio del state `products` reconstruye `loadData`, lo cual no se nota porque `useEffect([filters])` no lo escucha — pero ESLint `react-hooks/exhaustive-deps` lo grita y mantiene un closure stale subtílmente. El cálculo `products.length + newProducts.length < totalElementos` puede ser stale en concurrencia.

- [ ] **A14** — **Sin servicios reutilizables en backend**: ni `ProductService`, ni `CategoryService`. La regla `backend-rules.mdc` exige "Lógica en services, controllers ligeros". Cero cumplimiento aquí.

- [ ] **A15** — **`<button onClick={navigate(...)}>` para navegación a producto**: rompe SEO (ningún `<a href>`), rompe accesibilidad (no anuncia "link"), rompe UX (Ctrl+click / middle-click no abren en pestaña nueva, no funciona "Copiar enlace"). Aparece en `ProductsPage`, `NewHomePage`, `ProductDetailPage > relacionados`, `MerchantProducts`.

- [ ] **A16** — **URLs por `_id`, no por `slug`**: el modelo `Product` ya guarda `slug` único, pero las rutas son `/productos/64f8c2e2...`. SEO desastroso, links no humanos.

- [ ] **A17** — **Get producto + reviews + relacionados + ventas en una sola query handler**: `getProductById` en backend hace 4 consultas secuenciales + 1 aggregate. Para un detalle de producto típico son ~250-400ms innecesarios si una de ellas falla parcialmente (hay try/catch granular pero la latencia es la suma). No usa `Promise.all`.

- [ ] **A18** — **`productosRelacionados` query sin índice compuesto**: `Product.find({ categoria, _id: { $ne }, estado: 'aprobado', stock: { $gt: 0 } })`. Hay índice en `categoria` y otro en `estado`, pero MongoDB elegirá uno solo. Para catálogos grandes va a escanear.

- [ ] **A19** — **`Product.slug` se genera con `Date.now()` siempre que `isNew`**: `models/Product.js:230-233`. Si dos productos se crean con el mismo `nombre` en el mismo ms, hay colisión teórica con `unique: true`. Más grave: el slug queda inestable y `nombre = "Silla X"` produce `silla-x-1762839028192`, feo para SEO.

- [ ] **A20** — **Helper de imagen triplicado**:
  1. `backend/models/Product.js:308-323` → `getImageUrl` (placeholder logic).
  2. `backend/utils/helpers.js:313-327` → `transformarUrlImagen` (mismo cuerpo).
  3. `frontend/src/utils/imageUtils.ts:12-67` → `getImageUrl` (más rico).
  - El modelo aplica transform en `toJSON` y `toObject` del schema; helpers también aplica en `transformarProducto`. Cada lean() pasa por el transform del modelo Y por `transformarProductos()` del controller = doble pasada por cada documento.

### 3.3 Severidad MEDIA (UX / responsive / performance / SEO)

- [ ] **M1** — **9 gradientes distintos en `ProductsPage`**: header del catálogo, badge OFERTA, botón "agregar al carrito", iconos de empty state, "limpiar filtros", "cargar más", banner "ya viste todo", icono filtros, icono "ups". Viola `ui-rules.mdc`.

- [ ] **M2** — **Hero del catálogo gigante saturado**: `bg-gradient-to-r from-[#0d8e76] to-[#1c3a35]` ocupa los primeros ~120px de altura para mostrar un h1 + contador "X productos mostrados". El catálogo arranca debajo del fold en móvil.

- [ ] **M3** — **`hover:-translate-y-2 transform`** en cada tarjeta + `group-hover:scale-110` en la imagen: en grid de 15 cards son 15 composiciones simultáneas. Jank perceptible en móviles medios.

- [ ] **M4** — **Sin skeletons**: mientras `loading === true && products.length === 0`, se renderiza un `<LoadingSpinner />` centrado, y luego el grid aparece de golpe. Cumulative Layout Shift (CLS) alto.

- [ ] **M5** — **`<img loading="lazy">`** aplicado a TODAS las imágenes, incluyendo el primer fold. El LCP de mobile sufre. Las primeras 3-6 deberían ser `loading="eager"` + `fetchpriority="high"`.

- [ ] **M6** — **`buildResponsiveSrcSet`** existe en `imageUtils.ts:160-175` para Cloudinary pero **ningún componente lo usa**. Se carga la versión full-res aunque el card sea 300x300.

- [ ] **M7** — **`object-cover` con `h-64`/`h-48`** crops agresivos. Productos con fotos verticales (ropa, cuadros) se ven cortados.

- [ ] **M8** — **Layout `lg:grid-cols-6` con `lg:col-span-2 / lg:col-span-4`**: en breakpoint `md` (768-1024px) el sidebar desaparece (`hidden lg:block`) pero el botón móvil `md:hidden` también desaparece → **tablets pierden filtros**. Hay que tocar la URL para filtrar.

- [ ] **M9** — **`max-h-[calc(100vh-120px)]`** en sidebar de filtros: el `PublicLayout` aplica `pt-32`. La sticky `top-24` colisiona con eso → en monitores cortos se pierde la parte de arriba del sidebar al hacer scroll.

- [ ] **M10** — **Filtros sin "aplicar"**: cualquier cambio dispara fetch inmediato. En desktop puede estar bien; en mobile 3G y combinado con la falta de debounce es un sistema lento por diseño.

- [ ] **M11** — **No hay vista compacta / lista vs grilla**: en catálogos largos los usuarios quieren densidad. No existe toggle.

- [ ] **M12** — **Empty state genérico**: el mismo mensaje "Ups no encontramos productos" sale sin distinguir entre "sin productos en BD", "filtros muy estrictos" y "error de red".

- [ ] **M13** — **`/productos` no usa `useSearchParams`**: aunque la home enlaza a `/productos?categoria=X`, `ProductsPage` no lee de query params. **El link de la home no filtra nada.**

- [ ] **M14** — **Búsqueda case-insensitive con `$regex`** sin escapar caracteres especiales: si el usuario escribe `(prueba)` o `.*`, llega al regex de Mongo como inyección de patrón → potencial ReDoS o resultados extraños.

- [ ] **M15** — **Sort por "popular" no implementado en backend**: el select ofrece la opción, el backend la ignora silenciosamente.

- [ ] **M16** — **Stock 0 no excluye del catálogo**: el filtro es solo `{ estado: 'aprobado' }`. Productos sin stock aparecen pero con CTA deshabilitado. Decisión de producto: ¿se muestran u ocultan?

- [ ] **M17** — **`tag === 'oferta'`** se usa visualmente como descuento, sin descuento real (A9). El usuario ve "OFERTA" sin tachado de precio anterior. Mentira al usuario.

- [ ] **M18** — **SEO total ausente**:
  - Sin `react-helmet-async` / `react-helmet` instalado.
  - Sin `<title>` dinámico por producto ni por catálogo filtrado.
  - Sin `<meta name="description">` por producto.
  - Sin Open Graph (`og:title`, `og:image`, `og:price:amount`).
  - Sin Twitter Cards.
  - Sin `JSON-LD` (`Product`, `Offer`, `AggregateRating`, `BreadcrumbList`).
  - Sin `canonical`.
  - Sin `robots`/`sitemap.xml`.
  - El `<title>` global es estático: `AndinoExpress - Comercio Electrónico`.

- [ ] **M19** — **Breadcrumb hardcodeado**: `ProductDetailPage:187-198` arma `Productos > Categoría > Producto` sin estructura semántica `<nav aria-label="breadcrumb">` ni `BreadcrumbList` schema.

- [ ] **M20** — **`alt` solo es `product.nombre`**: para SEO de imágenes faltan descriptores ("Silla de comedor en roble, frente"). El modelo ya guarda `alt` por imagen — el frontend lo ignora.

- [ ] **M21** — **`getCategoryIcon`** (en `NewHomePage`) decide icono por substring del nombre. El modelo `Category` ya tiene campo `icono` con default `'shopping-bag'` — backend manda la respuesta pero frontend la descarta. Inconsistencia con home-audit A5.

- [ ] **M22** — **ProductDetail toggle de tabs sin `aria-controls` / `role="tab"`**: violación WCAG.

### 3.4 Severidad BAJA (limpieza)

- [ ] **B1** — `console.log` decorativos en `productController.js` (`🔍 Parámetros de búsqueda`, `📦 Productos encontrados`) sin guard `NODE_ENV`. En producción spam permanente.

- [ ] **B2** — `console.log` en `productService` interceptors (`api.ts:14, 41, 96-98`). Lo mismo.

- [ ] **B3** — Comentarios narrativos redundantes: `// Función para asignar iconos a categorías`, `// Cargar productos paralelo`, `// Construir filtros`, `// Procesar tags si existen`. Ruido.

- [ ] **B4** — `searchProducts` y `getProductsByCategory` (`productService.ts:26-57`): definidos, nunca llamados. Código muerto.

- [ ] **B5** — `getRelatedProducts(productId, limit)` (`productService.ts:40`): definido, nunca llamado (relacionados van en `GET /:id`).

- [ ] **B6** — `getProductStats`, `getPriceRanges`, `getSearchSuggestions`: idem, sin uso (C1).

- [ ] **B7** — Comentario `// Temporal: hacer opcional` en `models/Product.js:51, 80` para `stock` e `imagenPrincipal`. Lleva semanas siendo "temporal".

- [ ] **B8** — Imports muertos: `cartService` se importa en `NewHomePage.tsx:6` y se usa, pero el catálogo `ProductsPage` importa de `useCartStore` directo. Inconsistencia.

- [ ] **B9** — `FavoritesPage.tsx` es **un único `<h1>`** sin contenido. Pero la ruta está montada y enlazada desde el dashboard. UX engaña al usuario.

- [ ] **B10** — Mezcla de español/inglés en nombres de funciones: `obtenerProductos`, `crearProducto`, `getProductById`, `subirImagenes`. El propio comentario del controller dice "Changed from obtenerProductoPorId" — refactor inconcluso.

- [ ] **B11** — `paginateData` exporta `paginaActual`, `limitePorPagina`, `totalPaginas`, `totalElementos`, `saltar`, `tienePaginaAnterior`, `tienePaginaSiguiente`. El frontend solo necesita 4. Payload inflado.

---

## 4. Mapa de duplicación

| Concepto | Apariciones actuales | Debería ser |
|---|---|---|
| Tarjeta de producto | 5 implementaciones inline (ver A1) | 1 `<ProductCard variant="grid|compact|relacionado|comerciante">` |
| `getFirstImageUrl(...)` + `onError={handleImageError}` | 5 sitios | `<ProductImage src={product.imagenes}>` (ya existe, sin uso) |
| `getCategoryName(...)` lookup local | 4 sitios | `useCategoriesMap()` hook + populate del backend |
| Carga de `getActiveCategories()` | 4 páginas independientes | 1 `categoriesStore` (Zustand) o cache (`react-query`/`SWR`) |
| Endpoint "listar productos del comerciante" | 2 endpoints | 1 endpoint (`/commerce/products` o `/products/mis-productos`, no ambos) |
| Lógica de filtros + sort + paginación en controllers | 3 controllers | 1 `productService` en backend |
| Transformación de URLs de imagen | 3 capas (model toJSON + helpers transformar + frontend imageUtils) | 1 capa (preferentemente backend en serialización) |
| Formato de respuesta para "lista de productos" | 2 formatos (`{datos}` vs `{productos}`) | 1 formato (`{datos, paginacion}`) |
| Sort keys | 2 dialectos (`precio-asc` frontend, `precio_asc` backend) | 1 enum compartido |
| Hard-coded ObjectIds de categorías | `ProductForm` fallback | Eliminar fallback. Si falla la API, mostrar error, no fakes. |
| `productService.searchProducts/getProductsByCategory/getFeatured/getBestSellers/getRecent/getRelated/getPriceRanges/getSuggestions/getStats` | 8 phantom endpoints | Eliminar del service o implementar en backend |

---

## 5. Roadmap por fases

> **Regla de oro:** cada fase debe poder mergearse y desplegarse sin romper el catálogo, el detalle ni el panel de comerciante. Las fases 0 y 1 son prerequisito de todo lo demás.

### Fase 0 — Reparar contratos (sangrado activo)
> **Riesgo:** alto · **Esfuerzo:** medio · **Bloquea:** TODO lo demás

Sin esto, cualquier refactor amplifica los bugs.

- [ ] **F0.1** — Normalizar `ordenar` (C2). Definir enum compartido:
  - `recientes`, `antiguos`, `precio-asc`, `precio-desc`, `popular`, `calificacion`, `nombre`.
  - Backend traduce a `sortOptions`. Decidir mapeo de `popular` (¿`estadisticas.cantidadVendida` o `estadisticas.vistas`?).
- [ ] **F0.2** — Decidir formato canónico de "lista de productos" (C10). Propuesta: `{ datos: Product[], paginacion: { paginaActual, totalPaginas, totalElementos, elementosPorPagina } }`. Renombrar `limitePorPagina` → `elementosPorPagina` en `helpers.crearPaginacion`. Actualizar `commerceController.gestionarProductos` y `productController.obtenerMisProductos` para usar `datos`.
- [ ] **F0.3** — Reparar `paginacion.elementosPorPagina` (C5). Cambiar `helpers.crearPaginacion` o el tipo `PaginatedResponse`. Lo correcto es renombrar en backend (afecta menos archivos).
- [ ] **F0.4** — Tipar `Product.imagenes` correctamente (C3). Cambiar en `types/index.ts`:
  ```ts
  imagenes: Array<{ url: string; alt?: string; orden?: number }>;
  ```
  Eliminar el dance defensivo de `getFirstImageUrl` (se simplifica).
- [ ] **F0.5** — Tipar `Product.especificaciones` correctamente (C4). Cambiar a `Array<{ nombre: string; valor: string }>`. Arreglar `ProductForm` para mapear array → record solo en presentación.
- [ ] **F0.6** — Tipar `estadisticas.cantidadVendida` (C6). Sincronizar con modelo.
- [ ] **F0.7** — Limpiar `helpers.js` (C7): unificar un solo `module.exports`.
- [ ] **F0.8** — Eliminar endpoints fantasma del `productService` (C1, B4-B6). Eliminar `searchProducts`, `getRelatedProducts`, `getFeaturedProducts`, `getBestSellers`, `getRecentProducts`, `getPriceRanges`, `getSearchSuggestions`, `getProductStats`, `getProductsByCategory`. (Decisión D2 abajo: ¿implementar luego o quitar?). De momento, **quitar para que nadie los llame**.
- [ ] **F0.9** — Eliminar el fallback con ObjectIds inventados del `ProductForm` (C8). Si la API falla, mostrar error, no fakes.
- [ ] **F0.10** — Aplicar `transformarProductos` en `commerceController.gestionarProductos` (C11).

**Entregable:** contratos firmes, sin parches defensivos en el frontend. El catálogo funciona idéntico a como funciona hoy, pero el sort, la paginación y el badge OFERTA empiezan a hacer lo que dicen.

---

### Fase 1 — Backend: servicios y query consolidada
> **Riesgo:** medio · **Esfuerzo:** medio · **Bloquea:** Fase 3

- [ ] **F1.1** — Crear `backend/services/productService.js` con:
  - `listarProductos({ filtros, sort, page, limit })` → reemplaza la lógica embebida en `obtenerProductos`, `obtenerMisProductos`, `gestionarProductos`.
  - `obtenerProductoConDetalles(id)` → reemplaza `getProductById` (productos + reviews + relacionados + ventas en `Promise.all`).
  - `incrementarVistas(id)` → invocable desde `getProductById`.
- [ ] **F1.2** — Decidir qué endpoint sobrevive para "productos del comerciante" (A5): `/api/products/mis-productos` o `/api/commerce/products`. Eliminar el otro. Propuesta: mantener `/api/commerce/products` (semánticamente claro: "dashboard de comerciante"), eliminar el otro y migrar `merchantService`.
- [ ] **F1.3** — Decidir e implementar endpoints semánticos (D2):
  - `GET /api/products/destacados` → ordenar por `estadisticas.cantidadVendida` + `calificacionPromedio`.
  - `GET /api/products/recientes` → ordenar por `fechaCreacion`.
  - `GET /api/products/ofertas` → filtrar `precioOferta != null` o `promocion.activa = true`.
  - `GET /api/products/:id/relacionados` → mover de inline a endpoint propio (cache-friendly).
  - Estos endpoints reemplazan el abuso de `getProducts({limit, ordenar})` en `NewHomePage` (atado al refactor de Home, fase 1).
- [ ] **F1.4** — Implementar `incrementarVistas` en `getProductById` (C9, A18). Usar `findOneAndUpdate` con `$inc` para evitar dos roundtrips.
- [ ] **F1.5** — Escapar caracteres especiales en regex de búsqueda (M14). Helper `escapeRegex` antes de pasar al `$regex`.
- [ ] **F1.6** — Decidir política de stock 0 (M16): excluir del catálogo público por default, exponer toggle si se quiere. Idem para `estado: 'pausado'` y `'agotado'`.
- [ ] **F1.7** — Reparar generación de `slug` (A19) — añadir `slug-counter` con `Category.countDocuments({ slug: regex })`, no `Date.now()`.

**Entregable:** controllers ligeros, lógica testeable en servicio, endpoints semánticos disponibles, vistas reales, búsqueda segura.

---

### Fase 2 — Sistema de componentes base (compartido con Home)
> **Riesgo:** bajo · **Esfuerzo:** alto (amortizable) · **Bloquea:** Fase 3 y 4

Esta fase coincide con la Fase 2 del **home-audit**. Coordinar para no duplicar trabajo.

- [ ] **F2.1** — `<ProductCard variant="grid" | "compact" | "merchant" | "related">` único, en `frontend/src/components/ui/`. Usa internamente `<ProductImage>`. Variants:
  - `grid` (catálogo, home destacados): foto h-64, badge oferta opcional, rating, stock, 2 botones (Ver + Carrito).
  - `compact` (home recientes, relacionados): foto h-48, sin rating, 1 botón (Ver).
  - `merchant` (dashboard comerciante): badge estado, botones editar/eliminar.
  - `related` (mini): foto h-48, sin botones.
  - Reemplaza las 5 implementaciones inline (A1).
- [ ] **F2.2** — Usar `<ProductImage>` (A2) ya existente, internamente en `<ProductCard>`. Aplicar `buildResponsiveSrcSet` para Cloudinary (M6).
- [ ] **F2.3** — `<Button variant size as>` (compartido con home-audit Fase 2). El catálogo tiene 8+ botones cada uno con su Tailwind; deben pasar al Button.
- [ ] **F2.4** — `<Container>` y `<Section>` (compartido con home-audit). Eliminar `.container { max-width: 1200px }` del `index.css` que pisa Tailwind.
- [ ] **F2.5** — `<Breadcrumb>` con `<nav aria-label="breadcrumb">` + JSON-LD opcional, para `ProductDetailPage` (M19).

**Entregable:** kit UI base, suficiente para Catálogo + Detalle + Home.

---

### Fase 3 — Refactor del catálogo (`ProductsPage`)
> **Riesgo:** medio · **Esfuerzo:** medio · **Bloquea:** nada (puede solapar con Fase 4)

- [ ] **F3.1** — Mover filtros y paginación a `useSearchParams` (A11, M13). La URL refleja `q`, `categoria`, `precioMin`, `precioMax`, `ordenar`, `page`. Compartible, indexable.
- [ ] **F3.2** — Crear hook `useProducts({ filters })` que encapsule el fetch (con `Promise.allSettled` para resiliencia, retry y cache de categorías).
- [ ] **F3.3** — Aplicar **debounce** (300ms) al input de búsqueda (M10, A12). Hook reutilizable.
- [ ] **F3.4** — Extraer en `pages/products/`:
  ```
  ProductsPage.tsx              # composición + URL state, ~80 LOC
  components/
    ProductFilters.tsx          # sidebar de filtros
    ProductsGrid.tsx            # grid de ProductCard + load more
    ProductsToolbar.tsx         # contador + ordenar (responsive)
    ProductsEmptyState.tsx
  hooks/
    useProducts.ts              # fetch + paginación + caching
    useCategoriesMap.ts         # cache global de categorías
  ```
- [ ] **F3.5** — `<ProductsGrid>` usa `<ProductCard variant="grid">`. Skeleton del grid (M4) reemplaza el spinner centrado.
- [ ] **F3.6** — Eliminar el banner-hero del catálogo (M2) o reducir a header sólido pequeño. La página debe arrancar mostrando productos.
- [ ] **F3.7** — Reparar `lg:grid-cols-6` con tablets sin filtros (M8). Solución: `md:` también muestra filtros (Drawer en mobile, sidebar en desktop, toolbar en tablet).
- [ ] **F3.8** — Sustituir `<button onClick={navigate}>` por `<Link>` real en todas las cards (A15).
- [ ] **F3.9** — Decidir si los productos sin stock se muestran o se ocultan en catálogo público (M16, decisión D3).
- [ ] **F3.10** — Reducir gradientes (M1) a ≤2 en toda la página. Reducir emojis decorativos (M22, mismo principio que home-audit Fase 5).

**Entregable:** catálogo con URL-state, filtros sincronizables, performance fluida, sin parches inline, ~250 LOC repartidos en 4 componentes < 100 LOC c/u.

---

### Fase 4 — Refactor del detalle (`ProductDetailPage`)
> **Riesgo:** medio · **Esfuerzo:** medio · **Bloquea:** nada

- [ ] **F4.1** — Extraer subcomponentes:
  ```
  pages/products/detail/
    ProductDetailPage.tsx       # composición, ~80 LOC
    components/
      ProductGallery.tsx
      ProductPurchasePanel.tsx  # cantidad + agregar + comprar ahora
      ProductTabs.tsx           # descripción / reseñas / vendedor
      ProductReviews.tsx
      ProductRelated.tsx        # usa <ProductCard variant="related">
      MerchantInfo.tsx
  ```
- [ ] **F4.2** — Reemplazar tabs por componente accesible (M22): `role="tab"`, `aria-controls`, navegación por teclado.
- [ ] **F4.3** — `<Breadcrumb>` accesible + `BreadcrumbList` JSON-LD.
- [ ] **F4.4** — Usar `alt` real de cada imagen (M20). El modelo ya lo guarda.
- [ ] **F4.5** — Mover `loadCategory` a una sola request: si `product.categoria` viene como string, el populate de backend lo arregla; idealmente el backend siempre populeará (ya lo hace en `getProductById`). Eliminar la segunda llamada `categoryService.getCategoryById`.
- [ ] **F4.6** — Llamar a `incrementarVistas` desde backend en `GET /:id` (Fase 1.4 hace el trabajo).
- [ ] **F4.7** — Implementar redirect 301 si la URL tiene `_id` pero la canonical es `slug` (A16, atado a Fase 6).

**Entregable:** detalle modular, accesible, con reseñas, relacionados y vendedor en componentes < 150 LOC.

---

### Fase 5 — Refactor del panel de comerciante (`MerchantProducts` + `ProductForm`)
> **Riesgo:** medio · **Esfuerzo:** medio · **Bloquea:** nada

- [ ] **F5.1** — Migrar `MerchantProducts` a `<ProductCard variant="merchant">` (Fase 2).
- [ ] **F5.2** — Eliminar fallback de 15 categorías hardcodeadas (C8, F0.9).
- [ ] **F5.3** — Arreglar precarga de `especificaciones` al editar (C4 + F0.5): mapear array → form fields conocidos.
- [ ] **F5.4** — `ProductForm` excede 250 LOC (393). Extraer:
  ```
  components/forms/product/
    ProductForm.tsx             # composición, ~80 LOC
    ProductFormBasic.tsx        # nombre/precio/stock/categoría
    ProductFormDetails.tsx      # descripción/tags/especificaciones
    ProductFormImages.tsx       # input + preview + remove
  ```
- [ ] **F5.5** — Soportar edición de imágenes (no solo append). Hoy el form solo permite agregar; eliminar/reordenar imágenes existentes es imposible desde la UI.
- [ ] **F5.6** — Implementar `FavoritesPage` real (B9) o eliminar la ruta del menú.

**Entregable:** comerciante con CRUD completo de productos e imágenes, sin fakes, sin form de 393 LOC.

---

### Fase 6 — SEO y URLs semánticas
> **Riesgo:** medio (afecta URLs públicas) · **Esfuerzo:** medio · **Bloquea:** nada

- [ ] **F6.1** — Instalar `react-helmet-async` (decisión D4).
- [ ] **F6.2** — `<title>` y `<meta description>` dinámicos en `ProductDetailPage` y `ProductsPage`.
- [ ] **F6.3** — JSON-LD `Product` + `Offer` + `AggregateRating` (cuando haya reseñas) en `ProductDetailPage` (M18).
- [ ] **F6.4** — JSON-LD `BreadcrumbList` (M19).
- [ ] **F6.5** — Open Graph y Twitter Cards por producto (M18).
- [ ] **F6.6** — Migrar URLs `/productos/:id` → `/productos/:slug-:id` o `/productos/:slug` con resolver backend (A16). Implementar 301 desde el formato viejo.
- [ ] **F6.7** — Asegurar `canonical` por página.
- [ ] **F6.8** — `sitemap.xml` dinámico con productos y categorías (backend genera al request o cron).
- [ ] **F6.9** — `robots.txt` con `Disallow: /merchant/` y `/admin/` (no auditado pero plausible).

**Entregable:** catálogo indexable. Mejora medible en Google Search Console en 4-8 semanas.

---

### Fase 7 — Performance y limpieza final
> **Riesgo:** nulo · **Esfuerzo:** bajo

- [ ] **F7.1** — Aplicar `buildResponsiveSrcSet` en `<ProductCard>` (M6, dentro de `<ProductImage>`).
- [ ] **F7.2** — `loading="eager"` + `fetchpriority="high"` en las 4-6 primeras imágenes del catálogo (M5).
- [ ] **F7.3** — Cache global de categorías (A4): hook + Zustand o `react-query`/`SWR` (D5 abajo).
- [ ] **F7.4** — `React.lazy` para `ProductDetailPage` y rutas del comerciante (overlap con home-audit Fase 4).
- [ ] **F7.5** — `useCallback` para handlers de `<ProductCard>` tras extracción.
- [ ] **F7.6** — Eliminar `console.log`s no guardados (B1, B2).
- [ ] **F7.7** — Eliminar `productService.searchProducts/getProductsByCategory` (B4) y métodos sin uso confirmado.
- [ ] **F7.8** — Eliminar `// Temporal` en `models/Product.js` decidiendo si `stock` y `imagenPrincipal` son obligatorios o no (B7).
- [ ] **F7.9** — Unificar nombre/idioma en controllers (B10): castellano o inglés, no mezcla.
- [ ] **F7.10** — Quitar `paginateData` campos no usados (`saltar`, `tienePaginaAnterior`, `tienePaginaSiguiente`) o documentarlos (B11).

**Entregable:** repo limpio, sin código muerto, performance pulida.

---

## 6. Métricas objetivo

| Métrica | Antes | Objetivo |
|---|---|---|
| LOC `ProductsPage` | 486 | ≤ 100 (orquestador) + 4 subcomponentes ≤ 100 c/u |
| LOC `ProductDetailPage` | 585 | ≤ 100 + 5 subcomponentes ≤ 150 c/u |
| LOC `ProductForm` | 393 | ≤ 100 + 3 subcomponentes ≤ 120 c/u |
| LOC `productController` | 500 | ≤ 200 (resto en `services/productService.js`) |
| Implementaciones inline de tarjeta de producto | 5 | 1 (`<ProductCard>` con variants) |
| Endpoints fantasma en `productService` | 8 | 0 (o 8 implementados de verdad) |
| Sort keys soportadas correctamente | 1 de 6 | 6 de 6 |
| Páginas con filtros en URL | 0 | 1 (`/productos`) |
| Skeleton states | 0 | ≥ 3 (grid, detalle, dashboard) |
| Gradientes en `ProductsPage` | 9 | ≤ 2 |
| `console.log` sin guard en código de productos | ≥ 12 | 0 |
| SEO: `<title>` dinámicos | 0 | 100% de rutas públicas |
| SEO: JSON-LD Product schema | 0 | 100% de páginas de detalle |
| Cobertura de uso de `<ProductImage>` | 0 | 100% (vía `<ProductCard>`) |
| LCP móvil 3G simulado en catálogo | sin medir | < 2.5 s |
| Lookups `getCategoryName` por render de grid 15 cards | 15 | 0 (populate desde backend) |
| Llamadas a `/api/categories` por navegación Home→Catálogo→Detalle | 3 | 1 (cache) |

---

## 7. Decisiones pendientes (bloquean implementación)

> Cada decisión debe resolverse **antes** de iniciar la fase que la requiere.

- [ ] **D1** — **¿Qué endpoint sobrevive para "productos del comerciante"?**
  - **Opción A:** `/api/commerce/products` (más semántico, ya lo usa `merchantService`).
  - **Opción B:** `/api/products/mis-productos`.
  - **Bloquea:** Fase 1.2.

- [ ] **D2** — **¿Implementar los endpoints semánticos eliminados o solo eliminarlos del service?**
  - **Opción A:** Implementar `destacados`, `recientes`, `ofertas`, `relacionados` (mejora performance y limpia uso de `getProducts({limit,ordenar})`).
  - **Opción B:** Eliminarlos del `productService` y dejar todo bajo `getProducts({...})` con un sort+filter rico.
  - **Bloquea:** Fase 1.3.

- [ ] **D3** — **¿Productos sin stock visibles en catálogo público?**
  - **Opción A:** Ocultar (filtro `stock: { $gt: 0 }` en backend).
  - **Opción B:** Mostrar con CTA deshabilitado (estado actual).
  - **Bloquea:** Fase 1.6 y Fase 3.9.

- [ ] **D4** — **¿`react-helmet-async` o solución manual de head?**
  - **Opción A:** `react-helmet-async` (estándar, mantenido).
  - **Opción B:** Hook propio con `document.title` y meta tags imperativos.
  - **Bloquea:** Fase 6.1.

- [ ] **D5** — **¿Introducir `react-query` / `SWR` para server state?** (decisión heredada de home-audit D3)
  - Decidir si el beneficio (cache de categorías, retry, invalidación) justifica la dependencia nueva.
  - **Bloquea:** Fase 7.3 (cache de categorías). El resto puede avanzar sin esto.

- [ ] **D6** — **¿Sistema real de ofertas?** (heredada de home-audit D5)
  - **Opción A:** Aprovechar `precioOferta` / `promocion` ya en modelo. Implementar UI (precio tachado, `%` de descuento, contador a `fechaFin`). Eliminar uso de `tag === 'oferta'`.
  - **Opción B:** Eliminar `precioOferta`/`promocion` del modelo y aceptar el tag visual como solución provisional.
  - **Bloquea:** A9, M17, Fase 1.3 (filtro `ofertas`).

- [ ] **D7** — **¿URLs por slug, por `_id`, o ambas?**
  - **Opción A:** Migrar a `/productos/:slug` con redirect 301 desde `/productos/:id`.
  - **Opción B:** Mantener `/productos/:id` y agregar slug solo en JSON-LD/canonical.
  - **Opción C:** `/productos/:slug-:id` (best of both: humano + estable).
  - **Bloquea:** Fase 6.6.

- [ ] **D8** — **¿`Category.icono` (backend) reemplaza el `getCategoryIcon` por substring del frontend?** (heredada de home-audit D2)
  - El modelo ya tiene `icono: { type: String, default: 'shopping-bag' }`. Solo falta poblarlo y consumirlo.
  - **Opción A:** Usar el campo del modelo + mapeo `icono → componente Lucide/Heroicons`.
  - **Opción B:** Diccionario `slug → icon` centralizado en frontend.
  - **Bloquea:** M21, NewHomePage refactor.

- [ ] **D9** — **¿Quién es responsable de transformar URLs de imagen?**
  - Hoy: model `toJSON` + helpers `transformarProducto` + frontend `getImageUrl`. Triple capa.
  - **Opción A:** Solo backend (en `toJSON` del modelo). Frontend recibe siempre URL final.
  - **Opción B:** Solo frontend (backend devuelve relativos). Saca lógica del modelo.
  - **Bloquea:** A20, Fase 7.

---

## 8. Referencias

- Reglas del proyecto: `.cursor/rules/ui-rules.mdc`, `.cursor/rules/api-rules.mdc`, `.cursor/rules/database-rules.mdc`, `.cursor/rules/backend-rules.mdc`, `.cursor/rules/frontend-rules.mdc`, `.cursor/rules/project-rules.mdc`.
- Auditoría hermana: `docs/audits/home-audit.md` (comparten las Fases 2 y 7 de componentes base y performance).
- Archivos auditados:
  - `frontend/src/pages/products/ProductsPage.tsx`
  - `frontend/src/pages/products/ProductDetailPage.tsx`
  - `frontend/src/pages/merchant/MerchantProducts.tsx`
  - `frontend/src/pages/NewHomePage.tsx` (parcial, solo para ProductCard duplicado)
  - `frontend/src/components/forms/ProductForm.tsx`
  - `frontend/src/components/ui/ProductImage.tsx`
  - `frontend/src/components/dashboard/TopProductsWidget.tsx`
  - `frontend/src/services/productService.ts`
  - `frontend/src/services/merchantService.ts`
  - `frontend/src/services/categoryService.ts`
  - `frontend/src/services/api.ts`
  - `frontend/src/stores/cartStore.ts`
  - `frontend/src/types/index.ts`
  - `frontend/src/utils/imageUtils.ts`
  - `frontend/src/routes/AppRoutes.tsx`
  - `frontend/public/index.html`
  - `backend/controllers/productController.js`
  - `backend/controllers/commerceController.js` (`gestionarProductos`)
  - `backend/controllers/categoryController.js`
  - `backend/routes/productRoutes.js`
  - `backend/routes/commerceRoutes.js`
  - `backend/routes/categoryRoutes.js`
  - `backend/models/Product.js`
  - `backend/models/Category.js`
  - `backend/utils/helpers.js`

---

## 9. Bitácora de cambios del documento

| Fecha | Cambio | Autor |
|---|---|---|
| 2026-05-11 | Auditoría inicial · 8 fases definidas · 9 decisiones pendientes · 11 críticos · 20 altos · 22 medios · 11 bajos. | — |
