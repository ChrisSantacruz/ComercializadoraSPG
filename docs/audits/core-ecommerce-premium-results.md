# Auditoría — Core ecommerce premium (resultados)

**Fecha:** 2026-05-15  
**Alcance:** Fases 1–2 parciales, feedback unificado carrito, correcciones de rutas checkout, documentación E2E.  
**Fuentes revisadas:** `docs/roadmap/decisions.md`, `docs/ui/design-system.md`, `docs/roadmap/frontend-refactor-roadmap.md`.

---

## Resumen ejecutivo

Se elevó la experiencia de **detalle de producto** y **carrito** hacia el design system (tokens, primitivos, Headless UI ya integrado en `Tabs`/`Modal`), se eliminó **doble notificación** al añadir desde ficha (toast único vía `notifyCartSuccess` + acción opcional), y se endureció el **store del carrito** contra totales no numéricos y errores silenciosos en `getCart`.

Checkout, perfil, dashboard y backend en profundidad quedan con **deuda explícita** (ver sección 4).

---

## Hallazgos corregidos

| ID | Área | Problema | Mitigación |
|----|------|-----------|------------|
| R1 | Product detail | Hex sueltos, emojis en reseñas, spinner fullscreen | Tokens, `StarRating` con Heroicons, skeleton de página |
| R2 | Product detail | Galería sin lightbox ni swipe | `ProductDetailGallery` + Modal + swipe táctil |
| R3 | Product detail | Posible `stock`/`precio` indefinidos | `safeInt` / `safeMoney` |
| R4 | Carrito + ficha | Toast duplicado (página + `cartStore`) | Solo store con `action` opcional en `notifyCartSuccess` |
| R5 | Carrito | `getCart` no propagaba error al `catch` de página | `getCart` relanza tras `set` |
| R6 | Carrito | Totales NaN si API devuelve basura | `getTotalPrice` / `getItemCount` defensivos + `safeMoney` en página |
| R7 | Carrito / checkout | Rutas `/cart` y `/products` incorrectas | `/carrito`, `/productos` |
| R8 | Carrito | `window.confirm` y emoji en envío | `Modal` + copy neutra |

---

## Riesgos residuales

1. **Checkout multi-step visual:** `CheckoutPage` sigue siendo un archivo grande; progreso UI premium pendiente sin romper máquina de estados Wompi.
2. **Optimistic cart:** No se implementó `useOptimistic` (React 19); el carrito sigue siendo “servidor primero” con loading por acción.
3. **Perfil / dashboard:** No auditados en esta pasada; riesgo de métricas o gráficos desalineados con backend permanece.
4. **Contratos producto:** `especificaciones` como array en UI vs `Record` en tipos — posible desajuste en productos legacy.

---

## Archivos tocados (esta entrega)

- `frontend/src/lib/safeNumeric.ts` (nuevo)
- `frontend/src/lib/appNotifications.ts`
- `frontend/src/stores/cartStore.ts`
- `frontend/src/pages/products/ProductDetailPage.tsx`
- `frontend/src/pages/products/ProductDetailGallery.tsx` (nuevo)
- `frontend/src/pages/cart/CartPage.tsx`
- `frontend/src/pages/checkout/CheckoutPage.tsx` (ruta carrito)
- `.cursor/mcp.json` (MCP registro shadcn.io adicional)
- `docs/testing/core-ecommerce-premium-e2e.md` (nuevo)
- `docs/audits/core-ecommerce-premium-results.md` (este archivo)

---

## Próximos pasos recomendados

1. Partir `CheckoutPage` en pasos + `Suspense` por bloque según DEC-LOAD / DEC-ERR-002.
2. `useOptimistic` o cola de mutaciones para cantidades en carrito (React 19, Context7 referencia).
3. Auditoría dashboard: queries reales y eliminación de placeholders.
4. Ejecutar `npm run build` en CI y checklist E2E de este documento.

## Build (2026-05-15)

`npm run build` en `frontend/`: **éxito**. Persisten advertencias ESLint previas en otros módulos (`SupportChat`, `MerchantDashboard`, páginas de órdenes, etc.); ninguna bloqueante introducida por los archivos nuevos salvo corrección de import no usado en `ProductDetailPage`.
