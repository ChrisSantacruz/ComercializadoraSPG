# Informe de performance — release hardening 2026-05-15

**Contexto:** CSR (Create React App), TanStack Query v5, code-splitting por ruta (`React.lazy` + `Suspense`), documentación Web Vitals y React consultada vía **Context7**.

---

## 1. Core Web Vitals (referencia)

| Métrica | Significado breve | Notas proyecto |
|---------|-------------------|----------------|
| **LCP** | Carga del elemento principal | Imágenes: usar `ProductImage` + URLs optimizadas (DEC-PERF-001); evitar hero sin dimensiones |
| **CLS** | Estabilidad layout | Skeletons alineados al grid (`DEC-LOAD-001`); límites de animación hover en cards (DEC-ANIM-003) |
| **INP** | Latencia de interacción | `web-vitals` v2 en el repo expone CLS/FID/FCP/LCP/TTFB; **INP** requiere upgrade a `web-vitals` v3+ para medición nativa |

## 2. Mediciones en runtime

- `reportWebVitals` envía métricas a `log.debug` solo en **desarrollo** (evita ruido y coste en producción). Para producción real, sustituir el handler por envío a APM (Datadog, Sentry performance, etc.).

## 3. Red y datos (TanStack Query)

Alineado con `docs/architecture/query-architecture.md`:

- `retry` sin 4xx, backoff acotado.
- `refetchOnReconnect: true`, `networkMode: 'online'` — sin colas agresivas offline.
- `QueryErrorResetBoundary` en `ProductionShell` + `ErrorBoundary` raíz: evita UI colgada tras error de render en árbol de datos.

**Waterfalls:** preferir claves estables y evitar encadenar hooks que bloqueen el siguiente sin necesidad; hooks home/catálogo ya usan patrones paralelos donde aplica.

## 4. Navegación y scroll (CSR)

- **`useRouteScrollRestoration`:** scroll al cambiar ruta; soporte de anclas `#id` (equivalente funcional a `ScrollRestoration` de React Router en modo framework).
- Hash navigation: si el elemento no existe, fallback a scroll top.

## 5. Bundle / chunks

Build actual (post-cambios): chunk principal ~126 kB gzip (main) — según `npm run build`. Lazy por página mantiene splitting; mercantil/analytics (Recharts) permanecen en chunks dedicados.

## 6. Backlog performance

1. Sustituir emojis en nav dashboard por icon set acotado (DEC-UI-005) — bundle y a11y.
2. Virtualización de listas largas si el catálogo supera umbral acordado (~100 ítems DOM visibles).
3. Prefetch PDP en hover de `ProductCard` (opcional, medir antes).
4. Actualizar `web-vitals` para INP y panel de campo.

---

**Última actualización:** 2026-05-15
