# E2E manual final — experiencia premium (post-iteración)

**Fecha:** 2026-05-15  
**Referencias:** `docs/roadmap/decisions.md`, `docs/testing/wompi-e2e.md`, `docs/testing/core-premium-e2e.md`, `docs/testing/full-premium-e2e.md`, `docs/testing/auth-test-plan.md`.

---

## 1. Checkout y Wompi

| ID | Caso | Pasos | Esperado |
|----|------|-------|----------|
| C1 | Documento pagador | Paso 2: dejar documento vacío o menos de 6 dígitos, pagar | Mensaje de error claro; sin redirect Wompi |
| C2 | Documento válido | 6–11 dígitos, resto OK | Orden + redirect Wompi |
| C3 | Borrador checkout | Avanzar paso 1, recargar | `sessionStorage` restaura paso y campos (hasta 1 h) |
| C4 | Pago OK | Sandbox aprobada | Retorno: timeline → éxito → `/orders/:id` con banner opcional |
| C5 | Pago pendiente | Estado PENDING | UI “verificación”; contador “consulta X de N”; sin spinner infinito |
| C6 | Timeout verificación | Red lenta / 48s | Estado recuperable “reintento” o timeout explícito (no silencio) |
| C7 | Abort por re-ejecutar efecto | Login durante retorno | Sin falso “timeout” por cleanup (`verifyCloseRef`) |
| C8 | Sesión expirada | 401 en confirm-return | `needsAuth` + login con `redirect` seguro |
| C9 | Doble submit | Doble clic pagar | Candado + idempotencia orden |

---

## 2. Detalle de pedido

| ID | Caso | Esperado |
|----|------|----------|
| O1 | API caída | Pantalla error + **Reintentar**; **sin** pedido simulado |
| O2 | Timeline | Fechas reales o sin fecha; sin guía TRK inventada |
| O3 | `fromWompi` | Banner dismissible tras redirect desde Wompi |

---

## 3. Backend Wompi

| ID | Caso | Esperado |
|----|------|----------|
| B1 | Producción | `POST /test-payment-link` **no** registrado |
| B2 | `createPaymentLink` sin usuario | Producción → 401 |
| B3 | Documento inválido | 400 con mensaje claro |

---

## 4. Regresión rápida

- Auth: login / logout / refresh (`auth-test-plan.md` T1–T8 subset).  
- Carrito: vacío, cantidad, error API (`core-premium-e2e.md` C1–C3).  
- `npm run build` en `frontend/` sin errores TS.

---

## 5. Deuda explícita (no cubierta en esta pasada)

- PDP enterprise completa (galería zoom, tabs, merchant block).  
- Perfil tabs enterprise + endpoints exhaustivos.  
- Merchant dashboard: gráficos no usados / métricas a auditar (`MerchantDashboard.tsx`).  
- Consolidar rutas legacy `WompiReturnPage.tsx` vs `Fixed` si aún coexisten en árbol.
