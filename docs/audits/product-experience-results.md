# Auditoría — experiencia producto (resultados)

**Fecha:** 2026-05-15  
**Alcance:** PDP, órdenes (cliente + comerciante), carrito, perfil (invalidación Query), notificaciones, contrato merchant/pedidos.

---

## Resumen ejecutivo

| Área | Antes | Después |
|------|--------|---------|
| PDP datos | `useEffect` + servicios sueltos; categoría secuencial manual | `useProductDetailQuery`, `useCategoryQuery`, `useRelatedProductsQuery` con claves en `queryKeys` |
| PDP UI | Relaciones solo embebidas; `<img>` bruto en relacionados | Relaciones embebidas **o** fetch; `ProductImage`; galería sticky tablet/desktop |
| Órdenes lista | Spinner fullscreen; estado local | TanStack Query + skeleton + refetch no bloqueante |
| Detalle pedido | fetch manual | `useOrderDetailQuery` + polling condicional pago pendiente |
| Merchant pedidos | `orderService` + invalidación manual | `useUpdateMerchantOrderStatusMutation` + optimistic lists + misma API `update-status` |
| Carrito mutaciones | Solo Zustand + sync query al éxito | Optimistic **quantity/remove/clear** con rollback + `syncCart` en store |
| Notificaciones | Posible duplicación visual | Dedupe título/mensaje/tipo |
| Perfil | Solo store | Invalidación `queryKeys.profile` tras mutaciones |

---

## Riesgos residuales

1. **Totales optimistas del carrito:** recomputación local (`lib/cartOptimistic.ts`) puede diferir milimétricamente del servidor si impuestos dependen de reglas no lineales; mitigado con `invalidateQueries` en `onSettled`.
2. **Polling detalle pedido:** 12s mientras pago no está en estado terminal; no aplica a pedidos ya pagados (evita ruido).
3. **`merchantService.updateOrderStatus` vs `/orders/.../update-status`:** unificado en **update-status** para pantalla de comerciante; si otro flujo dependía de `/commerce/orders/...`, documentar y alinear backend.

---

## Criterios “prohibidos” (verificación)

- Sin timelines inventadas: se mantiene `buildOrderTimelineFromOrder` basada en `historialEstados` o derivación explícita de campos del pedido.
- Sin mocks silenciosos en flujos tocados.
- Sin `console.*` añadidos en esta iteración (limpieza continua recomendada en checkout/payment legacy).

---

## Seguimiento recomendado

- Tests automatizados de contrato (Jest/MSW) para `/orders` y `/cart`.
- Evaluar `useSuspenseQuery` en PDP tras boundary de error dedicada (React 19 + Query v5).
