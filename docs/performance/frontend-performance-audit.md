# Auditoría de performance — frontend

**Fecha:** 2026-05-15  
**Stack:** Create React App 5 (`react-scripts`), React 19, React Router 7, Tailwind 3.4, Zustand 5, Axios.  
**Referencias:** `docs/roadmap/decisions.md` (DEC-PERF-001…006, DEC-DATA-001…005), `docs/audits/home-audit.md`, `products-audit.md`, `docs/ui/responsive-rules.md`.

---

## 1. Hallazgos previos (auditorías)

| Tema | Origen | Estado en código (2026-05-15) |
|------|--------|----------------------------------|
| Bundle inicial monolítico | home-audit B5 | **Mitigado:** rutas migradas a `React.lazy` + `Suspense` en `AppRoutes.tsx` (patrón oficial React + CRA `import()`). |
| Fetch duplicado de categorías | products-audit A4 | **Mitigado:** `lib/data/activeCategoriesResource.ts` (TTL 5 min + deduplicación en vuelo); consumido desde `useHomeData`, `useProductsCatalog`, `useNavCategories`, `MerchantProducts`. |
| Catálogo: debounce búsqueda | products-audit A12 | **Ya resuelto:** `useDebouncedValue` + URL en `useProductsCatalog`. |
| Spinners fullscreen en listas | products-audit M4 | **Ya resuelto:** `ProductCatalogSkeleton` en `ProductsPage`. |
| PDP / imágenes | products-audit M5–M6 | Parcial: `ProductCard` usa prioridades; seguir extendiendo `ProductImage` + `srcset` donde falte. |
| Navbar bootstrap | AppRoutes | Sigue existiendo **spinner centrado** solo mientras `authStore.bootstrapPhase !== 'ready'` (sesión). Es intencional para evitar rutas sin usuario; documentado como única pantalla bloqueante corta. |

---

## 2. Resultado `npm run build` (post-cambios)

- **Compilación:** correcta (exit 0).
- **Advertencias ESLint** (preexistentes salvo limpieza menor): `SupportChat`, `NotificationToast`, varios `useEffect` con deps incompletas en checkout/orders/payment/merchant, `wompiService` default export anónimo. No introducen crash en runtime.
- **Browserslist:** datos `caniuse-lite` desactualizados (aviso de herramienta); recomendación: `npx update-browserslist-db@latest` en mantenimiento.
- **Tamaños (gzip, orientativo):** `main.*.js` ~**109 kB**; el resto repartido en **múltiples chunks** nombrados numéricamente (Webpack). La reducción del entry frente a un bundle monolítico previo (~272 kB gzip reportado en el diff del build) confirma **code splitting efectivo**.

---

## 3. Fuentes de rerender (riesgo)

| Área | Riesgo | Notas |
|------|--------|--------|
| `useAuthStore()` sin selector | Medio | `AppRoutes` usa selectores para fase bootstrap; mantener patrón `useStore(s => s.field)` en vistas pesadas. |
| Objetos inline en contexto de notificaciones | Bajo–medio | Evitar crear objetos `options` nuevos en cada render en listas grandes. |
| `useProductsCatalog` + `setSearchParams` | Bajo | Sincronización URL ↔ estado ya compara serialización ordenada para evitar loops. |

---

## 4. Waterfalls evitables

- **Home:** `useHomeData` usa `Promise.allSettled` para paralelizar secciones (alineado a DEC-ERR-002).
- **Categorías:** una sola promesa compartida reduce paralelismo innecesario **duplicado** (mismo endpoint).
- **PDP:** sigue habiendo cadena producto → categoría cuando `categoria` es ID (aceptable; evaluar batch en backend según `products-audit` A17).

---

## 5. Wins aplicados en esta iteración

1. **Route-level code splitting** (`React.lazy` + `Suspense`) con fallback **no fullscreen** (`RouteChunkFallback`: skeleton estable, menos CLS que spinner global de ruta).
2. **Deduplicación + caché temporal** de `GET /categories/active` centralizada.
3. **SEO CSR base** (`SeoHead`): título, descripción, canonical, OG mínimo, JSON-LD `Product` en PDP.
4. **Limpieza:** imports no usados en `MerchantDashboard` y tipo fantasma en `merchantService`.

---

## 6. Cuellos de botella restantes (priorizados)

1. **Sin librería de datos remota** (TanStack Query / SWR) — decisión pendiente DEC-FE-007: retry global, invalidación tras mutaciones, staleTime por recurso.
2. **Interceptores / política de error 401:** ya hay refresh en `api.ts`; seguir evitando `window.location` brusco donde aplique (DEC-ERR-003).
3. **Contratos API/productos** aún con deuda documentada en `products-audit` (sort, paginación, endpoints fantasma) — impacta payloads y trabajo defensivo en cliente.
4. **Virtualización** de listas muy largas (catálogo admin, pedidos): no implementada; valorar `@tanstack/react-virtual` solo si medición lo exige.
5. **Imágenes:** unificar uso de `ProductImage` + URLs responsive en todos los surfaces (DEC-PERF-001).

---

## 7. QA manual sugerido (simulación)

- Navegación rápida entre `/`, `/productos`, PDP y `/carrito`: observar **fallback de ruta** solo en primera carga de chunk.
- Throttling “Slow 3G” + recarga durante fetch de home/catálogo: UI debe mostrar **secciones/skeleton** sin crash; categorías no deben disparar N requests idénticos al cambiar de vista dentro del TTL.
- Resize desktop ↔ tablet ↔ móvil en catálogo: panel de filtros y botón “Filtros” según `responsive-rules.md`.
- Cambio de pestaña y vuelta: estado de carrito (Zustand persist) sin pérdida; sesión según `authStore`.
