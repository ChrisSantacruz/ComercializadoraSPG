# Informe Lighthouse / Core Web Vitals — hardening

**Fecha:** 2026-05-15  
**Build:** `npm run build` (CRA) — **exit 0**  
**Documentación consultada (Context7):** [web.dev vitals](https://web.dev/articles/vitals) (`onLCP`, `onCLS`, `onINP` vía librería `web-vitals`); React oficial (Suspense / selective hydration, errores de hidratación); TanStack Query (prefetch en hover/focus).

---

## 1. Core Web Vitals — estado del proyecto

| Métrica | Objetivo típico | Acciones aplicadas / recomendadas |
|---------|-----------------|-----------------------------------|
| **LCP** | Buena experiencia | `ProductImage` + `loading` eager/lazy en cards; hero: dimensiones explícitas donde falten |
| **CLS** | Minimizar saltos | Skeletons de catálogo; transiciones hover moderadas en cards; focus-visible sin desplazar layout |
| **INP** | Interacción rápida | Prefetch PDP desde `ProductCard` (`prefetchProductDetail`); debounce catálogo ya en hooks; revisar listeners pesados en merchant |

**Nota:** El cliente aún puede usar `web-vitals` v2 en reporte anterior; migrar a v3+ para **INP** nativo (recomendación web.dev field measurement).

---

## 2. Resultado del build (chunks gzip)

| Asset (gzip) | Tamaño |
|--------------|--------|
| `main.*.js` | ~125.9 kB |
| Mayor chunk route | ~42.3 kB (`676.*`) |

Code splitting por ruta activo; numeración Webpack en chunks nombrados.

---

## 3. Advertencias de compilación (ESLint)

No bloquean el build; pendientes para “cero warning” de producto:

- `SupportChat.tsx` — `useEffect` deps.
- `NotificationToast.tsx` — deps.
- `CheckoutPage.tsx` — deps ciudad.
- `MerchantReviewsPage.tsx`, `OrderConfirmationPage.tsx`, `PaymentSuccessPage.tsx` — deps loaders.
- `wompiService.ts` — default export anónimo.

**Acción:** corregir por archivo o eslint-disable acotado con justificación.

---

## 4. Lazy loading y Suspense

- Rutas: `React.lazy` + `RouteChunkFallback` (fallback no fullscreen — alineado a DEC-PERF-002 / DEC-LOAD-001).
- **React Router (Context7):** patrón `lazy()` en módulos de ruta recomendado para data frameworks; en CRA actual se usa `lazy` a nivel componente de página — válido.

---

## 5. Responsive / hidratación

- **Reduced motion:** reglas globales en `index.css` (`prefers-reduced-motion`).
- **Safe areas:** `body` + `Modal` / `Drawer` / `Sheet` ajustados con `env(safe-area-inset-*)`.
- **Hidratación:** evitar `Date.now()` / random en primer render; React 19 mejora mensajes de mismatch (documentación React.dev).

---

## 6. Lighthouse manual (staging)

Ejecutar en Chrome anónimo, throttling simulado:

1. Home, catálogo, PDP, checkout.
2. Comparar **Performance** y **Accessibility** ≥ objetivo interno (definir umbral por negocio; referencia orientativa 85+ en staging limpio).
3. Validar **Best Practices** (HTTPS, mixed content) en URL final.

---

## 7. Backlog performance medible

1. Virtualizar listas admin largas si DOM > umbral acordado.
2. Unificar transformaciones Cloudinary en una capa (DEC-PERF-001).
3. Subir `web-vitals` y enviar métricas a APM en prod (no sólo `log.debug` en dev).
4. Auditar waterfalls PDP (producto + categoría) con posible batch en backend.
