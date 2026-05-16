# Arquitectura de datos — TanStack Query

**Fecha:** 2026-05-15  
**Decisión:** DEC-FE-007 → **TanStack Query v5** (adoptado)  
**Estado:** implementado en módulos críticos (catálogo, home, merchant, órdenes comerciante, carrito sync).

---

## 1. Provider y cliente

| Archivo | Rol |
|---------|-----|
| `frontend/src/lib/query/queryClient.ts` | `appQueryClient` singleton + `STALE_TIMES` por dominio |
| `frontend/src/lib/query/QueryProvider.tsx` | `QueryClientProvider` + Devtools solo en `development` |
| `frontend/src/App.tsx` | Envuelve la app: `BrowserRouter` → `QueryProvider` → `AuthProvider` |

### Defaults globales (no agresivos)

| Opción | Valor | Motivo |
|--------|-------|--------|
| `staleTime` | 60s | Evita refetch en cada mount de ruta |
| `gcTime` | 5 min | Retención razonable tras desmontar |
| `retry` | ≤2, sin 4xx | Retry inteligente (DEC-DATA-003) |
| `retryDelay` | exponencial cap 8s | Backoff sin saturar API |
| `refetchOnWindowFocus` | `false` | Sin flicker en dashboards |
| `refetchOnReconnect` | `true` | Recuperación tras offline |
| `networkMode` | `online` | No colas infinitas offline |

---

## 2. Query keys

Fuente única: `frontend/src/lib/query/queryKeys.ts`

Patrón factory por feature:

- `queryKeys.categories.active()`
- `queryKeys.products.list(filters)`
- `queryKeys.cart.current()`
- `queryKeys.merchant.dashboard()`
- `queryKeys.merchant.analytics(period)`
- `queryKeys.orders.merchant(filters)`

**Prohibido:** strings inline duplicados en hooks o páginas.

---

## 3. Hooks por dominio

| Hook | Archivo | Uso |
|------|---------|-----|
| `useActiveCategoriesQuery` | `hooks/useCategoriesQuery.ts` | Nav, home, catálogo |
| `useProductsInfiniteQuery` | `hooks/useProductsQuery.ts` | Catálogo + load more |
| `useHomeProductsQueries` | idem | Rails home (paralelo, dedupe cache) |
| `useProductDetailQuery` | idem | PDP (pendiente cablear en página) |
| `useMerchantDashboardQuery` | `hooks/useMerchantQuery.ts` | Panel comerciante |
| `useMerchantAnalyticsQuery` | idem | Analytics por período |
| `useMerchantOrdersQuery` | `hooks/useOrdersQuery.ts` | Pedidos merchant |
| `useCartQuery` / `useCartMutations` | `hooks/useCartQuery.ts` | Mutaciones carrito (bridge Zustand activo) |

---

## 4. Convenciones de invalidación (DEC-DATA-003)

| Evento | Invalidar |
|--------|-----------|
| Mutación carrito | `queryKeys.cart.all` (+ sync Zustand en `cartStore`) |
| Actualizar estado pedido merchant | `queryKeys.orders.all`, `queryKeys.merchant.all` |
| CRUD producto merchant (futuro) | `queryKeys.products.*`, `queryKeys.merchant.products` |
| Admin categorías | `queryKeys.categories.active()` vía `invalidateActiveCategoriesCache()` |

---

## 5. Estado cliente vs servidor (DEC-STATE-002)

- **Servidor:** TanStack Query (listas, dashboards, detalle).
- **Cliente:** Zustand (`authStore`, `cartStore` con persistencia local).
- **Bridge:** `cartStore` escribe en `appQueryClient.setQueryData` tras cada mutación.

---

## 6. UX loading / error / empty

- Listas: skeletons (`ProductCatalogSkeleton`, `MerchantDashboardSkeleton`).
- Errores: `ErrorState` con `onRetry` → `refetch()`.
- Vacío: `EmptyState` con CTA (sin datos inventados).
- **Prohibido:** fallback silencioso con ceros en analytics (eliminado en `MerchantAnalytics`).

---

## 7. Deuda restante

- `OrdersPage` / `OrderDetailPage` / `ProfilePage`: migrar a hooks Query (patrón en `useOrdersQuery`).
- `ProductDetailPage`: usar `useProductDetailQuery` + `useCategoryQuery`.
- Optimistic updates completos en carrito vía `useCartMutations` (sustituir gradualmente Zustand).
- Prefetch en hover de `ProductCard` (opcional, medir primero).

---

## 8. Referencias

- React: `Suspense`, error boundaries por ruta (`RouteChunkFallback`).
- TanStack Query: query keys, `staleTime`/`gcTime`, infinite queries, `placeholderData`.
- Decisiones: `docs/roadmap/decisions.md` DEC-FE-007, DEC-DATA-001…005, DEC-LOAD-001…004, DEC-ERR-001…005.
