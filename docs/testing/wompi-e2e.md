# Wompi + Checkout — E2E manual, arquitectura y troubleshooting

**Última actualización:** 2026-05-14  
**Alcance:** flujo checkout → orden → enlace Wompi → redirect → verificación → webhook; alineado con DEC-FORM-006 (idempotencia), DEC-UI-004 (notificaciones visibles), DEC-ERR-003/005, DEC-DATA-004 (abort), DEC-LOAD-001–004.

---

## 1. Arquitectura final

### Backend

| Pieza | Rol |
|-------|-----|
| `POST /api/orders` | Crea pedido; acepta cabecera `Idempotency-Key` o `body.idempotencyKey` (único por cliente). Evita doble orden en doble submit. |
| `POST /api/wompi/payment-link` | Crea `payment_link` en Wompi; `redirect_url` incluye `orderId` + `reference` + Wompi añade `id` de transacción al volver. |
| `POST /api/wompi/webhook` | Cuerpo `application/json` como **Buffer** (`express.raw`). Extrae `transaction.id`, llama **GET /v1/transactions/:id** y aplica estado con **`wompiOrderSync`** (fuente de verdad = API Wompi, no solo el JSON del webhook). |
| `POST /api/wompi/confirm-return` | Autenticado. Vuelve a consultar transacción en Wompi, valida `reference === orderId`, valida `amount_in_cents`, aplica `syncOrderWithTransaction`. |
| `services/wompiOrderSync.js` | Unifica: `estado` de orden (`confirmado`, `payment_pending`, `payment_failed`), `metodoPago`, `paymentInfo`, stock (`estadisticas.cantidadVendida`), notificaciones con esquema válido (`usuario`, `tipo`, `titulo`, `mensaje`). Idempotencia en **APPROVED** (no doble stock). |

### Frontend

| Pieza | Rol |
|-------|-----|
| `state/checkoutPaymentMachine.ts` | Estados explícitos: `validating`, `verifying`, `pending_confirmation`, `success`, `failed`, `retryable_error`, etc. |
| `hooks/useCheckoutPaymentReturn.ts` | AbortController + timeout, polling acotado si `PENDING`, resume en `sessionStorage` si 401, cleanup al desmontar. |
| `services/checkoutPaymentService.ts` | Solo `api` + `handleApiResponse` → `POST /wompi/confirm-return`. |
| `components/checkout/CheckoutPaymentReturnView.tsx` | UI premium: skeleton implícito en fase inicial, estados claros, CTAs. |
| `components/checkout/CheckoutErrorBoundary.tsx` | Evita pantalla blanca por errores de render en el retorno. |
| `pages/checkout/WompiReturnPageFixed.tsx` | Orquesta hook + vista + boundary; redirección a pedido tras éxito. |
| `pages/checkout/CheckoutPage.tsx` | `useNotifications` (DEC-UI-004), idempotencia de orden, candado anti doble submit, sin logs sensibles en `wompiService`. |
| `pages/auth/LoginPage.tsx` | `?redirect=/payment/wompi/return?...` interno y seguro (anti open-redirect). |

### Context7 / Wompi

- **React** (Error Boundaries, recuperación): documentación oficial consultada vía Context7 (`/reactjs/react.dev`).
- **Wompi Colombia:** no hay paquete indexado en Context7 con ID estable; criterios tomados de la documentación pública (redirect con `id`, verificación por API `GET /transactions/:id`, webhooks HTTPS). Ver [Widget & Checkout Web](https://docs.wompi.co/docs/colombia/widget-checkout-web/) y [Eventos](https://docs.wompi.co/docs/colombia/eventos/).

---

## 2. Flujo exacto (happy path)

1. Usuario en `/checkout` completa dirección y acepta términos.  
2. Clic en pagar → se genera **una** clave idempotencia por sesión de checkout → `POST /orders` con header `Idempotency-Key`.  
3. Orden `pendiente`; carrito sigue hasta crear enlace.  
4. `POST /wompi/payment-link` → URL checkout Wompi; carrito se vacía; redirect externo (`window.location.href` solo hacia dominio Wompi).  
5. Usuario paga en Wompi → redirect a `/payment/wompi/return?id=<transactionId>&orderId=...&reference=...`.  
6. SPA carga retorno público: si hay sesión → `POST /wompi/confirm-return` → servidor consulta Wompi → actualiza orden → respuesta con `transactionStatus` + `order`.  
7. UI pasa a `success` → redirección automática a `/orders/:id` (ruta protegida; el usuario ya está autenticado).  
8. En paralelo, Wompi puede enviar **webhook** → mismo `sync` por API de transacción (idempotente).

---

## 3. State machine (retorno)

| Estado | Significado |
|--------|-------------|
| `validating` | Carga inicial; resolviendo query + resume. |
| `verifying` | Llamada activa a `confirm-return`. |
| `pending_confirmation` | Wompi/banco en `PENDING`; polling acotado (intervalo + máximo de intentos). |
| `success` | Transacción y orden coherentes con aprobación. |
| `failed` | Rechazado, error de negocio o falta de parámetros; puede incluir `needsAuth`. |
| `retryable_error` | 502/503 o timeout de verificación; botón reintentar. |
| `idle` / otros | Reservados para extensiones; el hook inicia en `validating`. |

---

## 4. Edge cases y recuperación

| Escenario | Comportamiento |
|-----------|------------------|
| Pantalla blanca por error React | `CheckoutErrorBoundary` muestra fallback con enlace a pedidos. |
| URL sin `id` ni `orderId` | Estado `failed` con mensaje claro; CTA a pedidos. |
| Sesión expirida al volver | `401` → guarda `sessionStorage` + UI “inicia sesión” → `LoginPage` con `redirect` → vuelve al mismo return URL. |
| `PENDING` prolongado | Hasta N reintentos con backoff fijo; luego `retryable_error` + “revisar pedidos”. |
| Doble clic pagar | `paymentSubmitLock` + idempotencia en orden. |
| Webhook antes que el usuario vuelva | Reconciliación por API actualiza orden; al abrir retorno, estado ya puede ser `confirmado`. |
| Webhook con cuerpo Buffer | `JSON.parse` explícito en servidor. |
| `order.status` (campo inexistente) | **Corregido:** solo se usa `estado` en Mongoose. |
| Stock doble en aprobación repetida | Comprobación idempotente antes de descontar. |
| Notificaciones rotas (`user` vs `usuario`) | **Corregido:** esquema `Notification` respetado. |
| Monto transacción ≠ total orden | `AMOUNT_MISMATCH` en `confirm-return` y en `syncOrderWithTransaction`. |

---

## 5. Troubleshooting

| Síntoma | Causa probable | Qué revisar |
|---------|----------------|-------------|
| 502 en retorno | Wompi API no responde o llaves inválidas | `WOMPI_PRIVATE_KEY`, `WOMPI_API_URL`, logs servidor. |
| `REFERENCE_MISMATCH` | `reference` en Wompi no es el `_id` de la orden | `redirect_url` y payload `reference` al crear link. |
| `AMOUNT_MISMATCH` | Total orden en COP vs `amount_in_cents` | Cálculo `Math.round(order.total * 100)` vs lo enviado al link. |
| Webhook 503 | Misma causa que GET transacción | Reintentos Wompi; no devolver 200 si quieres que reintenten (actual: 503 en fallo remoto). |
| Idempotencia no funciona | Clave distinta entre requests | Misma clave por sesión checkout (`useRef`). |

---

## 6. Matriz QA manual

| # | Caso | Pasos | Esperado |
|---|------|-------|----------|
| 1 | Pago aprobado | Sandbox tarjeta aprobada | `success` → `/orders/:id`, orden `confirmado`, stock descontado. |
| 2 | Pago rechazado | Tarjeta declinada sandbox | `failed` o estado orden `payment_failed`. |
| 3 | Timeout verificación | Simular 502 en confirm | `retryable_error`, reintentar funciona o pedidos. |
| 4 | Webhook tardío | Pagar y esperar webhook sin recargar | Orden actualizada; retorno puede mostrar ya `confirmado`. |
| 5 | Refresh en retorno | F5 en `/payment/wompi/return?...` | Re-verifica sin bucle infinito; máximo polls. |
| 6 | Atrás del navegador | Volver desde Wompi | Depende de caché Wompi; al menos no crashea SPA. |
| 7 | Doble submit | Doble clic rápido en pagar | Una orden (misma idempotencia) o segunda rechazada por carrito vacío. |
| 8 | Sesión expirada | Borrar token y volver con URL Wompi | `needsAuth` + login + redirect seguro. |
| 9 | Token expirado con refresh | Interceptor refresh | Debe completar `confirm-return` si refresh OK. |
| 10 | Sin red en confirm | DevTools offline | Error manejado, no spinner infinito. |

---

## 7. Simulación (checklist mental)

- Pago exitoso / rechazado / pendiente con polling.  
- Refresh y pestaña en background: abort y límites evitan fugas.  
- Móvil vs desktop: mismos query params Wompi (`id`).  
- OAuth + checkout: login respeta `redirect` hacia return URL.

---

## 8. Decisiones tomadas (resumen)

- **Fuente de verdad del pago:** API Wompi `GET /transactions/:id`, no confiar solo en query string del redirect ni en el payload crudo del webhook sin reconciliar.  
- **DEC-FORM-006:** `Idempotency-Key` en creación de orden + candado frontend.  
- **DEC-UI-004:** Toasts vía `NotificationProvider` en checkout.  
- **DEC-ERR-003:** evitar depender de `window.location` para recuperación de 401 en el retorno; flujo login + redirect.  
- **Context7:** usado para React Error Boundaries; Wompi por docs oficiales (sin ID en Context7).

---

## 9. Riesgos y deuda pendiente

| Riesgo | Mitigación actual | Deuda |
|--------|-------------------|--------|
| Webhook sin firma criptográfica del body | Confianza en llamada autenticada a Wompi con llave privada | Implementar validación oficial de `signature.checksum` + cabeceras según doc Colombia cuando se estabilice el algoritmo en entorno de pruebas. |
| `single_use: true` en links | Reduce reutilización del link | Probar bien en sandbox antes de producción. |
| Tipos TS `Order.estado` | Cast local en hook | Ampliar `types/index.ts` con `payment_pending` / `payment_failed`. |
| Ruta `/order-confirmation` duplicada a return | Legacy | Unificar rutas cuando el producto lo permita. |

---

## 10. Pruebas ejecutadas

- `npm run build` en `frontend/` (éxito; warnings ESLint preexistentes en otros archivos).
