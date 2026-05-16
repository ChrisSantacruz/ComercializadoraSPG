# Auditoría técnica — Módulo `Home`

> **Documento oficial de refactor.** Toda implementación sobre el módulo Home debe alinearse con este documento. Si una decisión se desvía del plan aquí descrito, debe justificarse explícitamente.

- **Módulo auditado:** `frontend/src/pages/HomePage.tsx`, `frontend/src/pages/NewHomePage.tsx` y dependencias directas
- **Fecha:** 2026-05-11
- **Estado:** Auditoría completada · Implementación pendiente de confirmación
- **Alcance:** Frontend (React + TypeScript + Tailwind)

---

## 1. Resumen ejecutivo

El módulo Home convive en dos versiones (`HomePage` muerta + `NewHomePage` activa) y acumula deuda en cuatro frentes:

1. **Arquitectura:** 0 componentes reutilizables, `ProductCard` definido inline, lógica de datos duplicada y contratos backend ↔ frontend inestables.
2. **UX/UI:** la página viola explícitamente las reglas del proyecto (`ui-rules.mdc`): demasiados gradientes, animaciones excesivas, estética "template barato".
3. **Datos:** stats hardcodeadas falsas en 3 archivos, manejo de errores silencioso, endpoints semánticos del backend ignorados.
4. **Mantenibilidad:** 751 líneas para una sola página, sin code-splitting, sin sistema de componentes base.

El refactor se ejecutará en **7 fases** (0 a 6) priorizadas por riesgo y dependencia.

---

## 2. Estado actual (hechos verificados)

| Archivo | LOC | Estado |
|---|---|---|
| `frontend/src/pages/HomePage.tsx` | 380 | Código muerto. Importado en `AppRoutes.tsx:10` pero ningún `<Route>` lo monta. |
| `frontend/src/pages/NewHomePage.tsx` | 371 | Activo en `/` (`AppRoutes.tsx:87`). |
| `frontend/src/layouts/PublicLayout.tsx` | 30 | Aplica Navbar fijo + `pt-32`. Conflicto con hero de NewHomePage. |
| `frontend/src/index.css` | 262 | Define animaciones (`animate-float`, `hero-glow`, `hover-lift`) usadas **solo** por `NewHomePage`. |
| `frontend/src/components/ui/ProductImage.tsx` | 88 | Componente con skeleton/fallback **no utilizado** por la home. |

**Veredicto de versionado:** patrón clásico "v1 + v2 conviviendo". La v1 lleva meses sin ruta. Es deuda pura.

---

## 3. Checklist de problemas detectados

### 3.1 Severidad CRÍTICA (riesgo funcional o de seguridad)

- [ ] **C1** — Inyección de HTML como string via `innerHTML` en error handler de imagen (`HomePage.tsx:66-92`). Anti-patrón React + vector XSS potencial.
- [ ] **C2** — Identidad de marca contradictoria: "AndinoExpress" en h1, "SurAndino" en fallback del banner.
- [ ] **C3** — Stats hardcodeadas (`10,000+ / 500+ / 25,000+`) repetidas en 3 archivos: `HomePage.tsx`, `NewHomePage.tsx`, `AboutUsPage.tsx`. Posible información de negocio falsa.
- [ ] **C4** — Manejo de errores silencioso en `NewHomePage.loadHomeData()`: `console.error` y `Promise.all` → si una API cae, la home queda vacía sin retry ni mensaje.

### 3.2 Severidad ALTA (arquitectura y mantenibilidad)

- [ ] **A1** — `ProductCard` definido **inline** dentro de `NewHomePage` (líneas 79-132). Rompe memoization y se duplica visualmente en `ProductsPage.tsx`.
- [ ] **A2** — Inconsistencia en sistema de imágenes: existe `<ProductImage>` con skeleton/fallback pero `NewHomePage` lo ignora y usa `<img>` directo.
- [ ] **A3** — Endpoints semánticos ignorados: `productService` expone `getFeaturedProducts`, `getRecentProducts`, `getBestSellers` y la home no los usa; en su lugar abusa de `getProducts({ limit, ordenar })`.
- [ ] **A4** — Tipado defensivo dudoso: `Array.isArray(res) ? res : res.datos || []` revela contrato roto en `productService.getProducts`.
- [ ] **A5** — `getCategoryIcon` por substring del nombre (frágil, no localizable, no testeable). El icono debería vivir en el modelo `Category` del backend.
- [ ] **A6** — Doble sistema de containers: `max-w-7xl mx-auto` (resto del proyecto) vs `container mx-auto` (NewHomePage), agravado por `.container { max-width: 1200px }` en `index.css` que pisa Tailwind.
- [ ] **A7** — No existe `<Button>`. ~12 CTAs cada uno con su propio cocktail de Tailwind.
- [ ] **A8** — Mezcla `<Link>` + `useNavigate()` para navegación pública pura → penaliza SEO y accesibilidad.

### 3.3 Severidad MEDIA (UX / responsive / rendimiento)

- [ ] **M1** — Hero `min-h-[80vh]` colisiona con `pt-32` del `PublicLayout` → contenido apretado bajo navbar fijo en pantallas <900px de alto.
- [ ] **M2** — `min-h-[80vh]` en iOS Safari causa jank por la barra de URL dinámica. Usar `svh`.
- [ ] **M3** — CTA principal del hero cae fuera del fold en móvil pequeño (iPhone SE). Impacto directo en conversión.
- [ ] **M4** — Sobrecarga de animaciones (animate-float ×3, pulse-glow ×3, bounce, pulse, bg-clip-text, hover scale/translate). Viola `ui-rules.mdc` ("animaciones sutiles, no exageradas").
- [ ] **M5** — 7 gradientes distintos en una sola página. Viola `ui-rules.mdc` ("evitar saturación extrema", "minimalista SaaS premium").
- [ ] **M6** — Botón "Contáctanos" con `onClick={() => {/* */}}` → handler vacío, promesa rota al usuario.
- [ ] **M7** — Accesibilidad pobre: emojis como único indicador semántico, falta de `aria-label`, `<button>` para navegación, contraste WCAG no auditado.
- [ ] **M8** — `loading="lazy"` aplicado correctamente en grids de productos, pero la home muerta carga `banner-home.png` sin `fetchpriority="high"`.

### 3.4 Severidad BAJA (limpieza)

- [ ] **B1** — `console.log` y comentarios `TODO` residuales en `imageUtils.ts` y `NewHomePage.tsx`.
- [ ] **B2** — Comentarios redundantes que narran lo que el código ya dice (`// Cargar productos paralelo`, `// Función para asignar iconos a categorías`).
- [ ] **B3** — Animaciones CSS huérfanas en `index.css` (`animate-float`, `animate-pulse-glow`, `hero-glow`, `animate-slide-in-up`) — usadas solo por NewHomePage.
- [ ] **B4** — Imports muertos en `AppRoutes.tsx:10` (`HomePage`).
- [ ] **B5** — No hay `React.lazy` / code-splitting en `AppRoutes.tsx` → bundle inicial pesado.
- [ ] **B6** — Nombres `NewHomePage`, `WompiReturnPageFixed` revelan ciclos de fix sin renombrar.

---

## 4. Mapa de duplicación

| Concepto | Apariciones actuales | Debería ser |
|---|---|---|
| Stats `10k+ / 500+ / 25k+` | 3 archivos (`HomePage`, `NewHomePage`, `AboutUsPage`) | 1 fuente (constante o endpoint) |
| Tarjeta de producto visual | `NewHomePage` (inline) + `ProductsPage` | `<ProductCard>` único |
| Botón CTA grande | ~12 instancias entre Home actual y muerta | `<Button variant>` |
| Stats card | HomePage + NewHomePage + AboutUsPage | `<StatCard>` |
| Hero pattern | HomePage + NewHomePage | `<Hero>` con slots |
| Sección features ("¿Por qué elegir?") | HomePage + AboutUsPage | `<FeatureCard>` |
| Sección "Acceso Rápido" | HomePage (muerta) | Eliminar — duplica navbar |

---

## 5. Roadmap por fases

> **Regla de oro:** cada fase debe poder mergearse y desplegarse sin dejar la home rota. No saltar fases.

### Fase 0 — Limpieza inmediata
> **Riesgo:** nulo · **Esfuerzo:** bajo · **Bloquea:** nada

- [ ] Eliminar `frontend/src/pages/HomePage.tsx` (código muerto, 380 LOC).
- [ ] Eliminar import muerto en `AppRoutes.tsx:10`.
- [ ] Renombrar `NewHomePage.tsx` → `HomePage.tsx` y actualizar import/uso en `AppRoutes.tsx`.
- [ ] Eliminar el botón "Contáctanos" con handler vacío **o** conectarlo al `SupportChat` ya montado en `PublicLayout`.
- [ ] Limpiar `console.log` en `imageUtils.ts` que no estén guarded por `NODE_ENV === 'development'`.

**Entregable:** home idéntica visualmente, −400 LOC, sin imports rotos, sin nombres mentirosos.

---

### Fase 1 — Capa de datos
> **Riesgo:** medio · **Esfuerzo:** medio · **Bloquea:** Fases 2 y 3

- [ ] Definir contrato único de `productService.getProducts`. Eliminar el parche `Array.isArray ? ... : .datos || []`.
- [ ] Reemplazar `getProducts({ limit, ordenar })` por endpoints semánticos: `getFeaturedProducts`, `getRecentProducts`, `getCheapestProducts` (o equivalente).
- [ ] **Stats reales o fuera**: exponer `GET /api/stats/public` (cacheado 1h en backend) o eliminar la sección. No mentir.
- [ ] Sustituir `Promise.all` por `Promise.allSettled` con estado `{ loading, error, data }` por sección.
- [ ] Resolver `getCategoryIcon`: validar si `backend/models/Category.js` tiene campo `icono` / `slug`; agregarlo o crear diccionario `slug → icon` centralizado en el frontend.

**Entregable:** datos honestos, contratos claros, errores resilientes por sección.

---

### Fase 2 — Sistema de componentes base
> **Riesgo:** bajo · **Esfuerzo:** alto (amortizable en todo el frontend) · **Bloquea:** Fase 3

Crear en `frontend/src/components/ui/`:

- [ ] `<Button variant="primary | secondary | ghost | outline" size="sm | md | lg" as={Link | 'button'}>`
- [ ] `<Container>` (reemplaza `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` y `.container` global)
- [ ] `<Section background padding>` (encapsula el patrón `<section>` repetido)
- [ ] `<StatCard value label>` (deduplica Home/About)
- [ ] `<ProductCard product showOffer onAddToCart>` (extrae lo de NewHomePage; usa internamente `<ProductImage>`; reemplaza también la tarjeta de `ProductsPage`)
- [ ] `<FeatureCard icon title description ctaHref>` (para "¿Por qué elegir?")
- [ ] Eliminar `.container { max-width: 1200px }` de `index.css` (pisa Tailwind).

**Entregable:** kit UI mínimo y consistente, aplicable a todo el frontend.

---

### Fase 3 — Modularización de Home
> **Riesgo:** bajo · **Esfuerzo:** medio · **Bloquea:** Fase 5

Estructura propuesta:

```
pages/home/
  HomePage.tsx              # composición + orquestación
  sections/
    HeroSection.tsx
    CategoriesSection.tsx
    FeaturedProductsSection.tsx
    NewProductsSection.tsx
    DealsSection.tsx
    CtaSection.tsx
  hooks/
    useHomeData.ts          # encapsula fetches (allSettled + retry + cache)
```

- [ ] Crear hook `useHomeData` que retorne `{ section: { data, loading, error, retry } }`.
- [ ] Extraer cada sección en su propio archivo con skeleton, error y content.
- [ ] `HomePage` queda como ensamblador (~80 LOC).

**Entregable:** home en ~80 LOC, secciones de ~50, fácil A/B test y reordenamiento.

---

### Fase 4 — Performance
> **Riesgo:** bajo · **Esfuerzo:** medio · **Bloquea:** nada (puede ir en paralelo con Fase 5)

- [ ] `React.lazy` + `Suspense` para todas las rutas en `AppRoutes.tsx`.
- [ ] `useCallback` para `handleAddToCart` y handlers de navegación tras extraer `ProductCard`.
- [ ] Aplicar `buildResponsiveSrcSet` (ya existente en `imageUtils`) en `<ProductCard>` para imágenes Cloudinary.
- [ ] Cache de categorías en `sessionStorage` o evaluar introducción de `react-query`/`SWR` (decisión pendiente, ver §7).
- [ ] Reemplazar `min-h-[80vh]` por `min-h-[80svh]` (arregla iOS Safari).

**Entregable:** LCP mejor, bundle inicial −30 a −50%, mejor experiencia móvil.

---

### Fase 5 — Rediseño UI alineado a `ui-rules.mdc`
> **Riesgo:** medio (impacto visual) · **Esfuerzo:** medio · **Bloquea:** nada

- [ ] Reducir gradientes a **máximo 2** en toda la home. Hero con color sólido o gradiente sutil ≤2 stops.
- [ ] Eliminar animaciones decorativas: `animate-float`, `animate-pulse-glow`, círculos flotantes, scroll indicator. Conservar solo hover sutil (`translateY(-2px)`).
- [ ] Quitar `bg-clip-text` con gradiente del título del hero (rompe legibilidad y estética minimalista).
- [ ] Sustituir emojis decorativos por iconos de un set consistente (Lucide / Heroicons) — decisión pendiente (§7).
- [ ] Auditar contraste WCAG AA en cada CTA y texto sobre gradiente.
- [ ] Validar tipografía: Montserrat en h1-h6 ya está global, mantener jerarquía limpia.

**Entregable:** home con apariencia SaaS premium minimalista, alineada con la guía de marca.

---

### Fase 6 — Limpieza final
> **Riesgo:** nulo · **Esfuerzo:** bajo

- [ ] Eliminar de `index.css` las animaciones sin uso tras refactor (`animate-float`, `animate-pulse-glow`, `hero-glow`, `animate-slide-in-up`).
- [ ] Eliminar archivos de utilidad sin uso real: revisar `imageTest.ts`, `debugUtils.ts`.
- [ ] Revisar nombres residuales tipo `WompiReturnPageFixed` (fuera del scope de Home, pero documentar).

**Entregable:** repositorio limpio y consistente.

---

## 6. Métricas objetivo

| Métrica | Antes | Objetivo |
|---|---|---|
| LOC del módulo Home | 751 (Home + NewHome) | ≤ 350 (página + 6 secciones + hook) |
| Componentes UI reutilizables | 0 | 6 (`Button`, `Container`, `Section`, `StatCard`, `ProductCard`, `FeatureCard`) |
| Fuentes duplicadas de stats | 3 | 1 |
| Fetches con retry/resiliencia | 0 / 4 | 4 / 4 |
| Animaciones simultáneas en hero | 8+ | ≤ 2 sutiles |
| Gradientes por página | 7 | ≤ 2 |
| Bundle inicial (con lazy routes) | sin medir | −30 a −50% |
| LCP (móvil 3G simulado) | sin medir | < 2.5 s |
| Contraste WCAG AA en CTAs | sin medir | 100% |

---

## 7. Decisiones pendientes (bloquean implementación)

> Cada decisión debe resolverse **antes** de iniciar la fase que la requiere.

- [ ] **D1** — ¿Las stats `10k+/500+/25k+` existen reales en backend?
  - **Opción A:** Exponer `GET /api/stats/public` con datos reales cacheados.
  - **Opción B:** Eliminar la sección por completo.
  - **Bloquea:** Fase 1.3
- [ ] **D2** — ¿`Category.icono` o `Category.slug` en el modelo backend?
  - **Opción A:** Agregar campo `icono` al modelo `Category`.
  - **Opción B:** Diccionario `slug → icon` centralizado en frontend.
  - **Bloquea:** Fase 1.5
- [ ] **D3** — ¿Introducir `react-query` / `SWR` para server state?
  - Decidir si el beneficio (cache, retry, sync) justifica la dependencia nueva.
  - **Bloquea:** parte de Fase 4 (caching). El resto de la fase puede avanzar sin esto.
- [ ] **D4** — ¿Sistema de iconos: emojis o Lucide/Heroicons?
  - Emojis refuerzan la estética "template barato" que `ui-rules.mdc` prohíbe.
  - **Bloquea:** Fase 5.
- [ ] **D5** — ¿Conservar la sección "Súper Ofertas" si no hay sistema de descuentos real en `Product`?
  - **Opción A:** Renombrar a "Económicos" (refleja la realidad).
  - **Opción B:** Implementar `precioOriginal` / `descuento` en `Product` para ofertas reales.
  - **Opción C:** Eliminar la sección.
  - **Bloquea:** Fase 1.2 y Fase 3.

---

## 8. Referencias

- Reglas del proyecto: `.cursor/rules/ui-rules.mdc`, `.cursor/rules/api-rules.mdc`, `.cursor/rules/database-rules.mdc`, `.cursor/rules/backend-rules.mdc`
- Archivos auditados:
  - `frontend/src/pages/HomePage.tsx`
  - `frontend/src/pages/NewHomePage.tsx`
  - `frontend/src/routes/AppRoutes.tsx`
  - `frontend/src/layouts/PublicLayout.tsx`
  - `frontend/src/components/ui/ProductImage.tsx`
  - `frontend/src/components/ui/LoadingSpinner.tsx`
  - `frontend/src/services/productService.ts`
  - `frontend/src/utils/imageUtils.ts`
  - `frontend/src/index.css`

---

## 9. Bitácora de cambios del documento

| Fecha | Cambio | Autor |
|---|---|---|
| 2026-05-11 | Auditoría inicial · 7 fases definidas · 5 decisiones pendientes | — |
