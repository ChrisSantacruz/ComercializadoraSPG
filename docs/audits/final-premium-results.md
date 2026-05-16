# Auditoría final premium — resultados (2026-05-15)

**Entrada obligatoria:** `docs/roadmap/decisions.md`, `docs/audits/*`, `docs/testing/*`, `docs/ui/*`, Context7 (React / patrones tipo shadcn Card), Magic MCP (inspiración checkout), `frontend-refactor-roadmap.md`.

**Nota MCP:** No hay servidor **shadcn** dedicado en el workspace; se aplicó documentación Context7 `/websites/ui_shadcn` (composición Card) alineada al kit existente (`components/ui/*` + Headless UI, ver `docs/ui/design-system.md`).

---

## 1. Resumen ejecutivo

| Área | Estado | Cambios principales |
|------|--------|----------------------|
| Retorno Wompi + máquina de estados | Mejorado | Timeout real vs abort por cleanup; polling con intento visible; UI premium con timeline y copy anti–“éxito por URL”. |
| Checkout | Mejorado | Marca `BRAND_NAME`, steps discretos, resumen sticky `lg:top-24`, CTA móvil fija, documento pagador real + validación backend, borrador `sessionStorage`, menos ruido visual. |
| Detalle pedido | Corregido | **Eliminado** fallback de orden simulada; timeline honesta; banner post-Wompi; estados `payment_*` en badges. |
| Backend Wompi `createPaymentLink` | Endurecido | Sin logs ruidosos en flujo; 401 en prod sin usuario; validación documento 6–11 dígitos; ruta test solo fuera de producción. |
| PDP / Perfil / Dashboard | Pendiente | Alcance superior al sprint; deuda listada abajo. |

---

## 2. Edge cases y condiciones de carrera

| Tema | Comportamiento anterior | Corrección |
|------|-------------------------|------------|
| `AbortController` al re-montar / cambiar deps | `axios.isCancel` sin dispatch → posible UI colgada | `verifyCloseRef` distingue abort intencional vs timeout de red; `TIMEOUT` solo cuando aplica. |
| Polling PENDIENTE | Usuario sin visibilidad de reintentos | `pollAttempt` / `pollMax` en contexto + badge en UI. |
| `sessionStorage` corrupto en resume Wompi | `catch` vacío | Limpieza explícita de clave. |

---

## 3. Contratos backend / frontend

| Tema | Detalle |
|------|---------|
| Documento pagador | Frontend envía `legalId` numérico; backend rechaza menos de 6 o más de 11 dígitos (400). |
| Tipos `Order` | Ampliados `estado`, `metodoPago.estado`, `historialEstados`, `paymentInfo`, `envio`, `seguimiento`. |
| Usuario | `numeroDocumento` / `tipoDocumento` opcionales en tipo TS para checkout. |

---

## 4. Endpoints / rutas

| Item | Acción |
|------|--------|
| `POST /api/wompi/test-payment-link` | Registrada solo si `NODE_ENV !== 'production'`. |

---

## 5. QA build

- `npm run build` (frontend): **OK** (warnings ESLint preexistentes en otros módulos + hooks en páginas no tocadas).  

---

## 6. Deuda REAL restante

1. **PDP** (`ProductDetailPage`): galería zoom, thumbnails optimizados, tabs trust, CTA sticky móvil — sin rediseño en esta iteración.  
2. **Perfil**: layout enterprise por tabs; alinear todos los campos con `User` en backend (incl. documento en `GET /users/profile` si falta).  
3. **MerchantDashboard**: imports/charts sin uso; validar `analyticsService` contra datos reales (ver warnings ESLint).  
4. **Rutas duplicadas** checkout/payment legacy: unificar cuando el mapa de rutas lo permita (`wompi-e2e.md` §9).  
5. **Webhook Wompi**: firma criptográfica pendiente según doc Colombia.  
6. **Console.log** restantes en `wompiController` (métodos distintos a `createPaymentLink`) — barrido dedicado recomendado.
