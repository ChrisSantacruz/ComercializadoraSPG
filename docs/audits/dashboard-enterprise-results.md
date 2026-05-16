# Resultados — Auditoría dashboard enterprise

**Fecha:** 2026-05-15  
**Referencias:** `docs/testing/dashboard-enterprise-e2e.md`, `docs/architecture/query-architecture.md`

---

## Resumen ejecutivo

| Área | Antes | Después |
|------|-------|---------|
| Capa de datos | `useEffect` + fetch manual, TTL manual categorías | **TanStack Query v5** con keys centralizadas |
| Analytics merchant | Fallback silencioso a objeto de ceros; polling 60s | Error explícito + `refetch`; sin polling infinito |
| Dashboard merchant | Métricas recalculadas en cliente con `limit: 1000`; emojis; spinner fullscreen | API `/commerce/dashboard` + `/analytics/merchant`; skeletons; Heroicons |
| Catálogo | `useProductsCatalog` con cancel manual | `useInfiniteQuery` + debounce URL |
| Pedidos merchant | `useEffect` + parse defensivo | `useMerchantOrdersQuery` + invalidación |
| Build | — | **OK** (main ~123 kB gzip post-Query) |

---

## Hallazgos corregidos

### P0 — Datos falsos / silenciosos

- **MerchantAnalytics:** `catch` reemplazaba error por `fallbackData` con todos los campos en 0 → **eliminado**. Ahora `ErrorState` o datos reales del API.
- **Dashboard:** `crecimientoMensual: 0` hardcodeado y métricas derivadas client-side de 1000 pedidos → **sustituido** por `resumenGeneral` del backend y analytics API.

### P1 — Arquitectura de requests

- Categorías: `activeCategoriesResource` convive con Query; invalidación unificada hacia `queryKeys.categories.active()`.
- Carrito: Zustand sincroniza `queryKeys.cart.current()` tras mutaciones (DEC-STATE-002).

### P1 — UX

- Spinners fullscreen en dashboard/orders → **MerchantDashboardSkeleton** + `ErrorState`/`EmptyState`.
- Sin `setInterval` 60s en analytics (DEC-DATA: no polling infinito).

### P2 — Pendiente

| Item | Prioridad |
|------|-----------|
| Migrar `OrdersPage`, `OrderDetailPage`, `ProfilePage` a Query | P1 |
| Cablear `ProductDetailPage` a `useProductDetailQuery` | P1 |
| Optimistic UI carrito vía `useCartMutations` (reducir Zustand) | P2 |
| Quitar `console.log` en `analyticsController.js` (backend) | P2 |
| Virtualización listas pedidos muy largas | P3 |

---

## Endpoints verificados (backend)

| Endpoint | Uso frontend | Notas |
|----------|--------------|-------|
| `GET /api/commerce/dashboard` | `useMerchantDashboardQuery` | Agregaciones Mongo reales |
| `GET /api/analytics/merchant?periodo=` | `useMerchantAnalyticsQuery` | Totales, trends, top products |
| `GET /api/commerce/products` | `useMerchantProductsQuery` | Catálogo reciente |
| `GET /commerce/orders` (merchant) | `orderService.getMerchantOrders` | Lista pedidos |

No se detectaron mocks en frontend tras este cambio en rutas merchant tocadas.

---

## Métricas build (2026-05-15)

- `npm run build`: **éxito**
- `main.*.js` gzip: **~123 kB** (incremento moderado por React Query)
- Warnings ESLint: preexistentes en checkout/support; **nuevo:** `pagination` unused corregido en MerchantOrders

---

## DEC-FE-007 — Cerrada

**Opción elegida:** (A) TanStack Query. Bitácora actualizada en `docs/roadmap/decisions.md`.

---

## Conclusión

El panel comerciante pasa de UX improvisada con datos parcialmente inventados a **fuente única servidor + cache Query + estados resilientes**. Queda deuda en órdenes cliente y PDP para completar la migración enterprise en todo el frontend.
