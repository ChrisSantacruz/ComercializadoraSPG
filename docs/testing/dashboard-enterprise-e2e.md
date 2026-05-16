# E2E manual — Dashboard enterprise

**Fecha:** 2026-05-15  
**Alcance:** panel comerciante, analytics, pedidos merchant, TanStack Query, estados UX.

---

## Pre-requisitos

- Backend en marcha con MongoDB poblado (o merchant con ventas reales).
- Usuario rol `comerciante` autenticado.
- Frontend: `npm start` (dev) o build servido.

---

## 1. Carga inicial y cache

| # | Paso | Esperado |
|---|------|----------|
| 1.1 | Login comerciante → `/merchant` o dashboard | Skeleton de layout, luego métricas sin spinner fullscreen infinito |
| 1.2 | Abrir DevTools → Network | Una request a `/commerce/dashboard`, una a `/analytics/merchant?periodo=30d` (no duplicadas en 60s) |
| 1.3 | Navegar a productos y volver al dashboard &lt;60s | Datos desde cache (sin nueva ráfaga de dashboard) |
| 1.4 | Esperar &gt;90s o forzar refetch (botón reintentar si error) | Datos actualizados |

---

## 2. Analytics por período

| # | Paso | Esperado |
|---|------|----------|
| 2.1 | `/merchant/analytics` | Métricas numéricas coherentes con pedidos reales (no bloque de ceros tras error) |
| 2.2 | Cambiar 7d → 30d → 90d rápido | Sin crash; query key distinta; `placeholderData` evita flash vacío |
| 2.3 | Simular API caída (offline / stop backend) | `ErrorState` + Reintentar; **no** dashboard falso con mocks |
| 2.4 | Restaurar red | Retry automático al reconectar (si query activa) o Reintentar manual |

---

## 3. Merchant sin ventas

| # | Paso | Esperado |
|---|------|----------|
| 3.1 | Cuenta nueva sin pedidos | KPIs en 0, copy honesto, `EmptyState` en top products / ventas por día |
| 3.2 | Sin productos | CTA “Publicar producto” en catálogo reciente |

---

## 4. Pedidos merchant

| # | Paso | Esperado |
|---|------|----------|
| 4.1 | `/merchant/orders` | Lista carga con skeleton, no `useEffect` doble |
| 4.2 | Filtrar por estado rápido | Una query por filtro; sin race (último filtro gana) |
| 4.3 | Actualizar estado de pedido | Lista se invalida y refresca; sin duplicar toasts |
| 4.4 | Lista masiva (si hay datos) | Scroll estable; tabla/grid sin overflow horizontal en tablet |

---

## 5. Navegación y sesión

| # | Paso | Esperado |
|---|------|----------|
| 5.1 | Refresh en dashboard | Recupera sesión; vuelve a cargar queries |
| 5.2 | Cambio rápido de rutas públicas ↔ merchant | Sin warnings masivos de setState; requests canceladas por Query |
| 5.3 | Token expirado (401) | Logout / redirect según `api.ts`; sin spinner infinito |
| 5.4 | Doble click en “actualizar” / submit | Sin doble mutación (botones disabled o idempotencia) |

---

## 6. Responsive tablet / móvil

| # | Paso | Esperado |
|---|------|----------|
| 6.1 | Viewport 768×1024 | Grid métricas 2–3 columnas; sin overflow-x en cards |
| 6.2 | Viewport 375×812 | Métricas apiladas; alertas legibles; CTAs táctiles |
| 6.3 | Gráficas / listas ventas por día | Scroll interno si overflow; sticky header layout merchant OK |

---

## 7. Catálogo y home (Query)

| # | Paso | Esperado |
|---|------|----------|
| 7.1 | Home → Productos → Home | `/categories/active` deduplicado (1 inflight) |
| 7.2 | Búsqueda catálogo con debounce 300ms | No un request por tecla |
| 7.3 | Categorías vacías en API | Empty state catálogo, no spinner infinito |

---

## 8. Build y runtime

| # | Paso | Esperado |
|---|------|----------|
| 8.1 | `npm run build` | Exit 0 |
| 8.2 | Producción: lazy chunks cargan | `RouteChunkFallback` breve, no pantalla blanca |
| 8.3 | React Query Devtools | Solo visible en development |

---

## Registro de ejecución

| Fecha | Ejecutor | Entorno | Resultado | Notas |
|-------|----------|---------|-----------|-------|
| 2026-05-15 | — | local | Build OK | Migración Query + dashboard refactor; pruebas manuales UI pendientes en entorno con datos |
