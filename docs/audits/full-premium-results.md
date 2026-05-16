# Auditoría premium — resultados (frontend + contratos)

**Fecha:** 2026-05-14  
**Build:** `npm run build` en `frontend/` — **OK** (advertencias ESLint preexistentes en hooks y módulos no tocados en profundidad).

---

## 1. Context7 (documentación aplicada)

- **React (react.dev):** límites de error con `getDerivedStateFromError` / `componentDidCatch`; `Suspense` con fallback explícito; `useMemo` / `useCallback` para estabilizar props en formularios hijos.
- **Tailwind:** enfoque **mobile-first**, breakpoints `sm/md/lg`, espaciado coherente con escala del tema.
- **Headless UI:** tabs con navegación por teclado (`ArrowLeft`/`ArrowRight`, `Home`/`End`, modo `manual` opcional para paneles costosos).

---

## 2. Magic MCP (21st.dev)

- **Estado:** la herramienta `21st_magic_component_refiner` respondió *«Anthropic experiencing high load»* en el intento de refinamiento automático de `LoginPage.tsx`.
- **Mitigación:** refinamiento visual aplicado manualmente con `AuthLayoutShell`, tokens `primary` / `accent` / `secondary` del `tailwind.config.js`, primitivos `Button`, `Input`, `FormField` y Heroicons (sin emojis en controles críticos).

---

## 3. Endpoints y clientes corregidos / alineados

| Área | Cambio |
|------|--------|
| **Notificaciones** | `NotificationCenter` dejó de usar `fetch` + parsing manual de `localStorage` y **fragmentos de JWT en consola**. Ahora usa `axios` vía `userNotificationsService` (`/notifications/user`, `PUT /notifications/:id/read`) con `API_BASE` unificado. |
| **Pedidos cliente** | `orderService.getMyOrders` mantiene fallback `/orders` **sin ruido en consola**; errores propagan al caller. |
| **Carrito** | `cartService.updateQuantity`: fallback silencioso con re-lanzamiento del error primario (`primary`). |
| **Wompi** | Métodos de consulta devuelven `{ success: false }` sin `console.error`. |

---

## 4. Edge cases encontrados

1. **Bootstrap de perfil:** fallo de red vs token inválido sigue limpiando sesión local sin navegación global forzada (evita expulsar al usuario por un glitch temporal; alineado a DEC-ERR-003 en espíritu).
2. **Checkout:** recálculo de carrito puede fallar; el flujo **no debe bloquearse** si el carrito en servidor sigue siendo legible.
3. **`WompiPayment`:** fallo al cargar acceptance token ahora notifica al padre con `onError` en lugar de solo registrar en consola.
4. **`OrderDetailPage`:** aún existe **fallback simulado** si el backend no responde — deuda explícita para retirar en producción estricta.
5. **`ProductForm`:** categorías por defecto con ObjectIds fijos (DEC-FORM-004 advierte contra datos falsos; se mantiene comportamiento previo sin logs).

---

## 5. Mejoras visibles / UX

- **Login:** layout premium de dos columnas en `lg`, formulario con etiquetas visibles, botón de ver contraseña accesible, CTA con `Button` + estado `loading`, colores semánticos (`primary`/`error`).
- **Pedidos (cliente):** iconos Heroicons en lugar de emojis en estados; botón **Recargar** con componente `Button`.
- **Pedidos (comerciante):** eliminado panel **“Modo Debug”** y logs de depuración.
- **Notificaciones:** misma política de auth que el resto de la app (interceptores, refresh).

---

## 6. Duplicaciones / higiene

- Eliminados **múltiples `console.log` / `console.warn` / `console.error`** en servicios y páginas de alto tráfico (pedidos, analytics, dashboard, checkout, wompi, reseñas, etc.).
- `ErrorBoundary` global y `CheckoutErrorBoundary` ya no escriben en consola en esta configuración (telemetría pendiente si se desea).

---

## 7. Performance

- Sin cambios de bundle agresivos en esta iteración; reducción de trabajo en runtime al eliminar logs en calientes paths (lista de pedidos, analytics, notificaciones).

---

## 8. Inconsistencias corregidas

- Imports rotos tras edición de `OrdersPage` (`orderService`, `getCompleteAddress`) — **corregido**.
- `cartService` referencia a `error` inexistente en `catch` — **corregido** (`throw primary`).
- TypeScript en `MerchantOrders` para inspección defensiva de respuesta — cast vía `unknown`.

---

## 9. Deuda restante (priorizada)

| Prioridad | Ítem |
|-----------|------|
| P0 | Sustituir datos simulados en `OrderDetailPage` por estado vacío + CTA cuando falle API. |
| P1 | Unificar toasts (`DEC-UI-004`): un solo viewport y política de duración/stack. |
| P1 | `RegisterPage` / forgot-password con el mismo `AuthLayoutShell` y `react-hook-form` (`DEC-FORM-001`). |
| P2 | Sustituir emojis en `DashboardLayout` y `NotificationCenter` por iconos Heroicons. |
| P2 | Resolver advertencias `react-hooks/exhaustive-deps` en `CartPage`, `CheckoutPage`, `OrdersPage`, etc. |
| P3 | Eliminar o aislar `utils/imageTest.ts` y `debugUtils.ts` a scripts CLI para no tentar logs en build. |

---

## 10. Validación responsive (manual)

Checklist detallado en `docs/testing/full-premium-e2e.md` §8. No se ejecutó automatización visual en esta pasada.
