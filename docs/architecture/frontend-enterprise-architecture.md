# Arquitectura frontend orientada a enterprise

**Fecha:** 2026-05-15  
**Estado:** incremental (sin big-bang de carpetas `features/*` masivas).  
**Normas:** `docs/roadmap/decisions.md` (DEC-FE-001…007, DEC-STATE-001…004, DEC-COMP-001…005), `docs/ui/frontend-structure.md`, `docs/ui/component-architecture.md`, `frontend-refactor-roadmap.md`.

---

## 1. Principios

1. **Capas claras:** primitivos en `components/ui/`, orquestación en `pages/`, datos en `services/` + hooks en `hooks/`, estado cliente en `stores/`, utilidades puras en `lib/`.
2. **Límite práctico de LOC** por archivo de vista (objetivo ≤250 líneas en componentes de presentación; páginas compuestas como ensambladores + secciones).
3. **Un solo cliente HTTP** canónico (`services/api.ts`, DEC-FE-001); flujos sueltos con `fetch` en auth siguen siendo deuda P1 explícita en `auth-audit`.
4. **Datos remotos:** **TanStack Query v5** (DEC-FE-007 cerrado 2026-05-15). Ver `docs/architecture/query-architecture.md`. `lib/data/activeCategoriesResource` queda como bridge de invalidación legacy.

---

## 2. Estructura de carpetas (actual + dirección)

```
frontend/src/
  components/
    ui/              # Design system (Button, Container, Skeleton, …)
    products/        # Dominio catálogo reutilizable (ProductCard, filtros, skeletons)
    home/            # Secciones home
    nav/             # Navbar modular
    seo/             # SeoHead (meta CSR)
    routing/         # RouteChunkFallback (Suspense)
  hooks/             # useHomeData, useProductsCatalog, useNavCategories, …
  lib/
    data/            # activeCategoriesResource (cache + dedupe)
    cn.ts, safeNumeric, …
  layouts/           # PublicLayout, DashboardLayout (eager: shell estable)
  pages/             # Rutas; lazy-load desde AppRoutes
  routes/AppRoutes.tsx
  services/
  stores/
```

**Hacia feature-based (DEC-FE-006):** nuevas piezas de catálogo/checkout deben preferir `pages/<feature>/sections` + `hooks/use<Feature>` antes de inflar un solo `.tsx`.

---

## 3. Enrutamiento

- **React Router 7** en modo biblioteca con `<BrowserRouter>` en `App.tsx`.
- **Code splitting:** `React.lazy(() => import('…'))` por página; **Suspense** con `RouteChunkFallback` para cumplir “sin loading global bloqueante” en transiciones de ruta (salvo bootstrap de auth).
- **Documentación consultada:** React oficial (`lazy`, `Suspense`), CRA (dynamic `import()`), React Router 7 (patrones `lazy` en route modules).

---

## 4. Capa de datos (cliente)

| Patrón | Implementación | Próximo paso |
|--------|----------------|--------------|
| Categorías activas | `useActiveCategoriesQuery` (`staleTime` 5 min) | Invalidación vía `queryKeys.categories.active()`. |
| Productos / home | `useProductsInfiniteQuery`, `useHomeProductsQueries` | Catálogo infinite + rails home en paralelo con dedupe Query. |
| Merchant dashboard | `useMerchantDashboardQuery`, `useMerchantAnalyticsQuery` | Sin mocks silenciosos; skeletons + ErrorState. |
| Auth | `authStore` + `api` interceptors | Resolver persistencia/TTL según DEC-AUTH-002. |

---

## 5. SEO y rendering (CSR)

- **`SeoHead`:** actualiza `document.title`, meta description, `og:*`, `link[rel=canonical]`, JSON-LD opcional.
- **Limitación:** CRA es SPA; crawlers completos requieren prerender/SSR o HTML estático — coordinar con `backend-refactor-roadmap` para sitemap/HTML crítico.

---

## 6. Design system y responsive

- Tokens y primitivos según `docs/ui/design-system.md` y DEC-UI-001…003.
- Reglas tablet/móvil: `docs/ui/responsive-rules.md` (contenedor único, filtros en `md`, offsets navbar).

---

## 7. Deuda arquitectónica explícita

- Páginas merchant/checkout/profile aún densas (ver `ui-system-audit`).
- **React Query adoptado** — migración parcial: pendiente `OrdersPage`, `ProfilePage`, PDP con hooks dedicados.
- **Auth:** varias pantallas con `fetch` directo (auditoría); migración a `api` unificado.
- **Wompi / checkout:** duplicidad histórica de páginas de retorno — consolidación ya parcial (`WompiReturnPageFixed`).

---

## 8. Referencias cruzadas

- Auditorías: `docs/audits/*.md`
- Testing manual performance: `docs/testing/performance-e2e.md`
- Performance técnica: `docs/performance/frontend-performance-audit.md`
