# Auditoría — reparación carrito y checkout

**Fecha:** 2026-05-25

---

## Resumen ejecutivo

El flujo carrito/checkout fallaba principalmente por **reglas de negocio inconsistentes** entre lectura y escritura del carrito, y por **errores API genéricos** en el cliente. Se unificó la validación de productos/variantes/stock y se expusieron mensajes accionables (`mensaje`, `codigo`, `accion`).

---

## Causa raíz del `POST /api/cart/add` → 400

| Causa | Evidencia | Severidad |
|-------|-----------|-----------|
| **`estado` solo `aprobado` en add** | `agregarAlCarrito` rechazaba `approved`; `obtenerCarrito` aceptaba ambos | P0 |
| Validación express devolvía mensaje genérico "Errores de validación" | `manejarErroresValidacion` no propagaba el primer `msg` | P1 |
| Productos con variantes sin `variantId` | No se exigía variante si el producto tenía variantes activas | P1 |

---

## Causa raíz de `POST /api/orders` fallido

| Causa | Evidencia |
|-------|-----------|
| `producto` undefined en payload | Checkout mapeaba `item.producto._id` cuando persist/local tenía solo string |
| Sin validación de estado/stock unificada | Orden podía intentar líneas inválidas |
| Errores 400 sin `codigo`/`accion` | Frontend mostraba "Error inesperado" vía mensaje axios |

---

## Fixes aplicados

### Backend

- `backend/utils/productCommerce.js` — estado aprobado (`aprobado` + `approved`), variantes, stock, pricing, logs sanitizados
- `backend/utils/apiContract.js` — `sendApiError` / `sendCommerceError`
- `backend/controllers/cartController.js` — reglas unificadas, códigos `PRODUCT_NOT_AVAILABLE`, `INSUFFICIENT_STOCK`, logger estructurado
- `backend/controllers/orderController.js` — validación completa pre-save, sin orden parcial, logs
- `backend/middlewares/validation.js` — primer error como `mensaje`, `variantId` opcional validado

### Frontend

- `frontend/src/lib/apiErrors.ts` — `parseApiError`, `getApiErrorMessage`, `codigo` + `accion` + `errores[]`
- `frontend/src/lib/cartLineUtils.ts` — `resolveCartProductId` para checkout/persist
- `cartService`, `cartStore`, `useCartQuery`, `CheckoutPage`, Home/Products — mensajes reales y sync Query/Zustand en checkout

---

## Contratos alineados

**Agregar al carrito (body):**

```json
{
  "productoId": "<mongoId>",
  "cantidad": 1,
  "variantId": "<mongoId opcional si hay variantes>"
}
```

**Error estándar:**

```json
{
  "exito": false,
  "mensaje": "Stock insuficiente. Disponible: 2",
  "codigo": "INSUFFICIENT_STOCK",
  "accion": "Reduce la cantidad o elige otra variante",
  "requestId": "..."
}
```

**Crear orden (líneas):**

```json
{
  "productos": [{ "producto": "<id>", "cantidad": 1, "variantId": "<opcional>" }],
  "tipoEntrega": "domicilio | recoger_establecimiento",
  "direccionEntrega": "<id o objeto>",
  "metodoPago": { "tipo": "wompi" }
}
```

---

## Edge cases cubiertos

- Productos legacy sin variantes
- Variantes inactivas / stock por variante
- Carrito persistido en localStorage con `producto` como string
- Idempotencia de orden (header `Idempotency-Key`)
- Imágenes vacías (placeholder en `ProductImage` / carrito sin `src=""`)

---

## Deuda restante

- Orden: transacción Mongo multi-documento (stock decrement atómico al confirmar pago — ya era así; reforzar en confirmación Wompi)
- Unificar respuestas legacy que aún usan solo `errorResponse` sin `codigo`
- Tests automatizados API (supertest) para cart add + create order
- `addMutation` optimista visual completo (hoy rollback + invalidate; sin línea fantasma)

---

## Riesgos en producción

| Riesgo | Mitigación |
|--------|------------|
| Cache carrito stale en otro tab | `invalidateQueries` en mutaciones |
| Race doble checkout | Idempotency-Key + lock UI en checkout |
| Productos `pending` en catálogo público | Revisar filtros de listado (fuera de este fix) |

---

## Verificación realizada

- Revisión estática de contratos y flujos
- `node --check` backend (pendiente ejecución en CI local)
- `npm run build` frontend (pendiente ejecución en CI local)

Ver matriz completa: `docs/testing/cart-checkout-repair-e2e.md`.
