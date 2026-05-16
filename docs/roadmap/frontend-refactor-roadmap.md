# Roadmap — Refactor frontend (estrategia global)

**Estado:** planificación · **Implementación:** no iniciada en este documento  
**Fuentes:** `docs/audits/auth-audit.md`, `docs/audits/home-audit.md`, `docs/audits/products-audit.md`, `docs/audits/ui-system-audit.md`  
**Fecha de síntesis:** 2026-05-14

---

## 1. Objetivo

Definir una **estrategia de refactor frontend** coherente entre módulos (auth, home, catálogo, dashboard) que maximice **estabilidad** y **reutilización**, reduzca **deuda técnica** sin big-bang, y deje preparado el terreno para **UX/UI**, **performance** y **escalabilidad** (nuevas rutas, más tráfico, más equipos).

---

## 2. Prioridades (orden operativo)

| Prioridad | Qué significa en este repo |
|-----------|----------------------------|
| 1 · Estabilidad | Contratos API alineados, menos `fetch` huérfano, sesión/auth predecible, errores visibles (home/products), feedback de notificaciones unificado. |
| 2 · Quick wins | Bajo riesgo, alto impacto percebido: código muerto, imports rotos, CTAs rotos, logs sensibles, renombrar `NewHomePage`, leer `useSearchParams` donde la URL ya promete filtros. |
| 3 · Reducción de deuda | Páginas >250 LOC, duplicación de `ProductCard`, contratos `Product`/`PaginatedResponse` falsos, helpers defensivos eternos. |
| 4 · Reutilización | Kit UI mínimo compartido (ver `ui-system-roadmap.md`), hooks de datos (`useHomeData`, `useProducts`), mapa de categorías cacheado. |
| 5 · UX/UI | Alineación a `ui-rules.mdc`: menos gradientes/animaciones ruidosas, accesibilidad (tabs, breadcrumbs, links reales vs `button`+`navigate`). |
| 6 · Performance | Code-splitting de rutas, imágenes (`ProductImage`, `srcset`, LCP), `svh` en hero, menos refetch (debounce, cache). |
| 7 · Escalabilidad | Estructura por feature (`pages/home/sections`, `pages/products/...`), decisión sobre React Query/SWR, SEO head por ruta (catálogo). |

---

## 3. Principios de ejecución

1. **Vertical slices deployables:** cada entrega debe poder mergearse sin dejar rutas públicas rotas (regla ya usada en auditorías de Home y Products).
2. **Backend primero donde el frontend está “mentiendo”:** sort keys, paginación, tipos de `Product`, endpoints fantasma — sin contrato firme, el refactor UI amplía bugs.
3. **Un solo cliente HTTP en auth:** todo flujo auth pasa por `api` + `authService`; eliminar divergencia `fetch` vs axios (auth-audit).
4. **Config centralizada:** `REACT_APP_API_URL` y Firebase env en un solo módulo (`config/env.ts`) — reduce incidentes cross-entorno.
5. **Boy Scout en archivos tocados:** al editar una pantalla, migrar gradualmente a primitivos del design system (ui-system-audit).

---

## 4. Dependencias críticas

| Bloqueo | Origen | Impacto frontend |
|---------|--------|------------------|
| Contratos auth rotos + seguridad | auth-audit | Login/recuperación/cambio password; OAuth callback; rol admin inconsistente. |
| Contratos producto/paginación/sort | products-audit | Home, catálogo, detalle, merchant, tipos TS. |
| Tokens Tailwind duplicados / notificaciones rotas | ui-system-audit | Coherencia visual y feedback en checkout/carrito. |
| Stats “falsas” / decisión de datos | home-audit | Copy honesto y trust de marca. |

**Orden recomendado de carriles:** (A) estabilizar auth + API client → (B) contratos Products Fase 0 (sincronizado con backend roadmap) → (C) kit UI + migración por flujo de tráfico → (D) modularización Home/Products → (E) performance + SEO.

---

## 5. Fases propuestas (solo estrategia)

### Fase F0 — Cimientos de estabilidad (quick wins + riesgo)

- Alinear **interceptores** (`api.ts`): sin logs de tokens/bodies en prod; reemplazar `window.location` brusco por estrategia acordada con refresh token (cuando exista en backend).
- **Auth UI:** dejar de escribir `localStorage` manual en páginas sueltas; una sola vía de persistencia acordada con decisión de tokens (auth-audit D1).
- **Products/Home:** eliminar código muerto obvio (`HomePage` no montada), arreglar enlaces que hoy no aplican estado (ej. `?categoria=` sin `useSearchParams`).
- **Notificaciones:** un solo viewport montado; carrito/checkout usando el mismo canal (ui-system-audit).

**Resultado:** menos superficie de error operativo y mejor confianza del usuario en feedback.

### Fase F1 — Contratos y tipos honestos

- Sincronizar tipos `Product` (`imagenes`, `especificaciones`, paginación, estadísticas) con backend; eliminar “danzas” en `getFirstImageUrl` cuando el contrato sea único.
- Normalizar **sort** y **paginación** con enum compartido (ideal: paquete o archivo compartido si en el futuro hay monorepo; mientras tanto, documento de contrato + tests de integración).
- Decidir qué endpoints semánticos existen vs eliminar del `productService` (products-audit D2).

**Resultado:** el TypeScript deja de esconder bugs; menos regresiones en formulario de producto y edición.

### Fase F2 — Design system mínimo y migración por flujos

- Implementar primitivos MVP acordados en `ui-system-roadmap.md` (Button, Container/Section, ProductCard variants, EmptyState, Skeleton).
- Orden de migración sugerido por auditoría UI: **Checkout/pagos → Auth → Catálogo/detalle → Carrito → Merchant → Profile → Marketing**.

**Resultado:** reutilización real y velocidad de iteración en nuevas pantallas.

### Fase F3 — Arquitectura de páginas (mantenibilidad)

- **Home:** carpeta `pages/home/` + `useHomeData` + secciones; métrica LOC como en home-audit.
- **Products:** `ProductsPage` / `ProductDetailPage` / `ProductForm` particionados; hooks `useProducts`, `useCategoriesMap`.
- **Merchant:** alinear con `ProductCard` variant merchant tras kit base.

**Resultado:** archivos bajo límites del proyecto, onboarding más rápido, A/B y reorder de secciones viable.

### Fase F4 — UX/UI y accesibilidad

- Sustituir `button`+`navigate` por `<Link>` donde corresponda; tabs con roles ARIA; breadcrumbs semánticos.
- Reducir gradientes/animaciones en Home y catálogo según `ui-rules.mdc`.
- Resolver branding contradictorio (“AndinoExpress” vs marca real) en la misma oleada que marketing UI.

**Resultado:** percepción “SaaS premium”, mejor SEO indirecto (enlaces reales), menos fatiga visual.

### Fase F5 — Performance y SEO (frontend)

- `React.lazy` + `Suspense` en rutas; priorizar LCP en listados; `buildResponsiveSrcSet` en imágenes de producto.
- Head dinámico y JSON-LD en detalle/listado (products-audit F6; depende de D4/D7).
- Decisión **React Query vs SWR vs Zustand cache** para categorías y datos repetidos (home-audit D3 / products-audit D5).

**Resultado:** mejor Core Web Vitals, compartir URLs con estado, catálogo más indexable junto al trabajo backend de sitemap.

---

## 6. Quick wins explícitos (lista corta)

1. Eliminar `HomePage` muerta + import en rutas; renombrar `NewHomePage` → `HomePage`.
2. Conectar o quitar CTA “Contáctanos” vacío (home-audit).
3. `ProductsPage`: leer query params (`categoria`, etc.) — coherencia con links desde Home.
4. Quitar logs ruidosos/sensibles en cliente cuando se toque el archivo.
5. Montaje único de toasts / retirar `react-hot-toast` huérfano o cablear `<Toaster />` (decisión en UI roadmap).
6. Centralizar `API_BASE_URL` / env Firebase.

---

## 7. Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| Regresión visual masiva | Migración por flujo + checklist manual; Storybook o `/dev/ui` opcional post-MVP kit. |
| Doble trabajo Home vs Products en `ProductCard` | Una sola issue épica “Kit + ProductCard” con dueño único y definición de variants (products-audit F2 / home-audit F2). |
| Auth cambia mientras Products avanza | Congelar decisiones D1–D4 auth-audit antes de retocar `OAuthCallback` y persistencia. |

---

## 8. Métricas de seguimiento (sin medición = sin mejora)

- LOC por archivo objetivo (frontend-rules / auditorías).
- Número de `fetch(` directos en auth → **0**.
- Número de implementaciones inline de tarjeta de producto → **1** componente.
- LCP móvil (home + listado) < 2.5 s como meta orientativa de auditorías.
- Cobertura de rutas con `<title>` dinámico / JSON-LD (post-fase SEO).

---

## 9. Documentos relacionados

- `docs/roadmap/backend-refactor-roadmap.md` — contratos, servicios, auth, índices, SEO servidor.
- `docs/roadmap/ui-system-roadmap.md` — tokens, primitivos, notificaciones, layouts.
- Auditorías detalladas en `docs/audits/*.md`.

---

## 10. Bitácora

| Fecha | Cambio |
|-------|--------|
| 2026-05-14 | Creación del roadmap a partir de las cuatro auditorías. |
