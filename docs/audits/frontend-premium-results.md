# Resultados — refactor frontend premium (2026-05-14)

## Alcance ejecutado

- **Home:** nueva composición modular (`components/home/*`, `pages/home/HomePage.tsx`), hero corporativo neutro/oscuro, sin stats inventadas; datos vía `useHomeData` con `Promise.allSettled` y estados por sección.
- **Catálogo:** `ProductsPage` reescrito con `useProductsCatalog` (URL ↔ filtros, debounce de búsqueda, skeleton inicial, `ProductCard` canónico, filtros accesibles en viewport `<lg>`).
- **Productos UI:** `ProductCard`, `ProductPrice`, `ProductCatalogSkeleton`, `ProductFiltersPanel` bajo `components/products/`.
- **Imágenes:** `ProductImage` con skeleton pulse (sin spinner azul), fallback accesible sin emoji; `imageUtils` sin `console.log` / `console.warn` en rutas de producción.
- **Navegación:** categorías del mega menú y móvil desde API (`useNavCategories`); enlace **Contacto**; eliminado `CATALOG_QUICK_LINKS` con query strings incorrectos.
- **Contacto:** nueva ruta `/contacto` (`ContactPage`) con formulario y `mailto:`.
- **Footer:** marca alineada a `BRAND_NAME`; enlaces a Sobre nosotros y Contacto; iconos sociales sin `href="#"` (placeholders no enlazados).
- **Backend (sort):** `productController` acepta alias `precio-asc` / `precio-desc`, `fecha-asc`, `popular`; eliminados `console.log` de listado.

## Archivos eliminados

- `frontend/src/pages/NewHomePage.tsx`
- `frontend/src/pages/HomePage.tsx` (versión legacy no montada)

## Duplicaciones reducidas

- Tarjeta de producto unificada en **`ProductCard`** (home + catálogo).
- Categorías navbar vs home: misma fuente de datos (API) en lugar de enlaces hardcodeados.

## Edge cases encontrados y tratados

| Tema | Acción |
|------|--------|
| TypeScript `URLSearchParams.entries` sin `downlevelIteration` | `Array.from(sp.entries())` en `serializeSorted`. |
| `href="#"` en footer (a11y build) | Sustituido por `<span>` con `aria-label` hasta tener URLs reales. |
| Home con stats falsas (10k+/500+/25k+) | Eliminadas; copy honesto en “pilares” operativos. |
| `useSearchParams` + efectos (riesgo de loops) | Comparación de URL con `serializeSorted` antes de `setSearchParams`. |
| Paginación sin `totalElementos` | Heurística `hasMore` por tamaño de página cuando total es 0. |

## Responsive

- Filtros del catálogo: panel oculto bajo `lg` con botón dedicado (corrige hueco **tablet** del audit M8 en la implementación anterior).
- Grids: 1 col → 2 (`md`) → 3 (`xl`) en catálogo para mejor densidad en tablet ancha.

## Performance visual

- Skeletons en home (rieles) y catálogo (grid).
- Imágenes LCP: primeras cards con `loading="eager"` en home (hasta 3 por rail).
- Menos animaciones/gradientes que la home anterior.

## Deuda restante (priorizada)

1. **ProductDetailPage, Checkout, Auth, Dashboard:** siguen fuera del alcance de este lote; mantienen deuda de `frontend-refactor-roadmap.md`.
2. **Merchant / widgets:** siguen con cards legacy; migrar a `ProductCard` variant `merchant` cuando se defina API estable.
3. **React Query / SWR** (DEC-FE-007): cache de categorías hoy con módulo singleton en `useNavCategories`; valorar migración formal.
4. **SEO / slug** (products-audit F6): sin `react-helmet-async` en este cambio.
5. **shadcn MCP / 21st Magic:** no hay servidor MCP shadcn en el workspace; Magic MCP no invocado (cambios aplicados directamente en código).

## Validación

- `npm run build` en `frontend/`: **OK** (warnings ESLint preexistentes en otras rutas; hook de catálogo documentado con eslint-disable focal).

## Referencias de documentación

- Context7 (React composición / Suspense; Tailwind breakpoints y padding; Headless UI Dialog teclado y foco) usados como guía de implementación.
- Documentos leídos: `design-system.md`, `component-architecture.md`, `responsive-rules.md`, `frontend-structure.md`, `frontend-refactor-roadmap.md`, `products-audit.md`, `home-audit.md`, `ui-system-audit.md`, decisiones DEC-UI-*, DEC-FE-*, DEC-RESP-*, DEC-LOAD-*, DEC-COMP-*, DEC-PERF-* en `decisions.md`.
