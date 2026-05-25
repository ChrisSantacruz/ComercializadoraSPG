# E2E manual — reparación carrito y checkout

**Fecha:** 2026-05-25  
**Alcance:** flujo agregar → carrito → checkout → orden → Wompi (sandbox)

---

## Pre-requisitos

- Backend en `http://localhost:5001` (o `REACT_APP_API_URL` alineado)
- Frontend CRA con usuario cliente autenticado
- Al menos un producto con `estado: approved` o `aprobado`
- Producto con variantes (talla/color) y otro sin variantes

---

## 1. Agregar al carrito

| ID | Caso | Pasos | Esperado |
|----|------|-------|----------|
| A1 | Producto simple | Catálogo → Agregar | 200, toast éxito, badge carrito |
| A2 | Producto `approved` | Mismo con producto solo `approved` en DB | Ya no 400 "no disponible" |
| A3 | Con variante | PDP → elegir talla/color → Agregar | Línea con `variantId` y etiqueta en carrito |
| A4 | Sin variante obligatoria | PDP legacy sin variantes | Agrega sin `variantId` |
| A5 | Sin stock | Cantidad > stock | 400 `INSUFFICIENT_STOCK`, mensaje + acción visibles |
| A6 | Sin autenticación | Logout → agregar | 401, redirección login |
| A7 | Doble clic rápido | Doble clic Agregar | Una línea coherente; sin duplicar error silencioso |
| A8 | Payload inválido | (dev) POST sin `productoId` | 400 primer error de campo legible |

---

## 2. Carrito

| ID | Caso | Esperado |
|----|------|----------|
| C1 | Actualizar cantidad | Total recalculado; rollback si falla API |
| C2 | Quitar línea | Modal confirmación; carrito actualizado |
| C3 | Vaciar | Carrito vacío premium |
| C4 | Refresh F5 | Re-sync servidor; sin `src=""` en imágenes |
| C5 | Producto eliminado en DB | Línea removida al GET carrito o mensaje claro |
| C6 | Variante en resumen | Texto atributos + SKU si aplica |

---

## 3. Checkout

| ID | Caso | Esperado |
|----|------|----------|
| K1 | Delivery + dirección guardada | Orden creada; totales = carrito |
| K2 | Pickup | Sin dirección; `tipoEntrega: recoger_establecimiento` |
| K3 | Carrito vacío | Redirección / mensaje; no crear orden |
| K4 | Sesión expirada al pagar | Mensaje auth; no spinner infinito |
| K5 | Stock agotado entre carrito y orden | 400 stock; no orden parcial |
| K6 | Variante inválida | 400 `VARIANT_*` con acción |
| K7 | Doble submit pagar | Idempotency-Key; una orden |
| K8 | Documento Wompi inválido | Validación paso 2; sin redirect |

---

## 4. Orden y pago

| ID | Caso | Esperado |
|----|------|----------|
| O1 | POST `/api/orders` éxito | 201, `exito`, `datos._id`, carrito limpiado |
| O2 | Wompi sandbox OK | Retorno `/payment/wompi/return` coherente |
| O3 | Reintento idempotente | Misma key → 200 orden existente |

---

## 5. Regresión

- `npm run build` en `frontend/` sin errores TS
- `node --check` en `backend/server.js`
- Auth, Wompi y emails sin cambios de contrato rotos

---

## Comandos rápidos

```bash
cd backend && node --check server.js
cd frontend && npm run build
```
