# Plan E2E manual — Core premium (auth, perfil, catálogo, carrito, checkout, dashboard)

**Versión:** 2026-05-15  
**Alcance:** Simulación de casos críticos descritos en `decisions.md` (DEC-ERR-*, DEC-LOAD-*, DEC-FORM-*, DEC-AUTH-*, DEC-UI-*, DEC-RESP-*) y alineación con `docs/ui/design-system.md`.  
**Herramientas:** No hay suite Playwright/Cypress en repo; ejecutar manualmente o automatizar en CI posterior.

---

## 1. Auth y sesión

| ID | Caso | Pasos | Esperado |
|----|------|-------|----------|
| A1 | Login OK | Credenciales válidas + email verificado | Sin flash; redirect seguro (`redirect` solo paths internos); sin `window.location` brusco |
| A2 | Login fallido | Password incorrecto | Mensaje humano; sin enumeración de existencia de email |
| A3 | Login no verificado | Usuario `verificado: false` | 403 claro; sin sesión persistida |
| A4 | Registro cliente | Formulario registro | Validación Yup + servidor; submit deshabilitado durante carga; sin doble submit |
| A5 | Registro comerciante | Rol comerciante + empresa | Error de campo si falta empresa; sin emojis en toggles de contraseña |
| A6 | Verificación código | 6 dígitos correctos | Toast `showSuccess` (título + mensaje); `setSession`; navegación a `/` |
| A7 | Verificación código inválido | Código erróneo | Toast `showError` (título + mensaje) |
| A8 | Reenvío código | Botón reenviar | Toast éxito genérico (anti-enumeración); timeout manejado con mensaje claro |
| A9 | Forgot password | `/forgot-password` | Respuesta genérica siempre; sin ruta 404 |
| A10 | Reset password | Enlace email `.../restablecer-password?token=...` | Formulario premium; PUT con token en path o query; éxito → `/login?notice=reset` → banner verde en login |
| A11 | Reset token inválido | Token corrupto / expirado | Mensaje de error del API; sin pantalla en blanco |
| A12 | OAuth Firebase | Google/Facebook | `authService` + store; rol pendiente → `/select-role` |
| A13 | OAuth callback código | `/auth/callback?code=` | Intercambio `oauth/exchange`; sin JWT en URL persistente |
| A14 | Refresh / 401 | Access expirado + refresh válido | Cola interceptor; reintento transparente |
| A15 | Sesión perdida | Refresh inválido | Evento `app:auth-session-lost`; navegación a login sin reload agresivo |

---

## 2. Perfil

| ID | Caso | Pasos | Esperado |
|----|------|-------|----------|
| P1 | Carga perfil | Abrir `/profile` | Skeleton o loading real; sin NaN en métricas |
| P2 | Actualizar datos | Guardar perfil | Feedback unificado; sin métricas falsas |
| P3 | Cambio contraseña | `currentPassword` / `newPassword` | Contrato EN alineado con backend |
| P4 | Merchant stats | Usuario comerciante | Cards con datos reales o empty state honesto |

---

## 3. Producto y carrito

| ID | Caso | Pasos | Esperado |
|----|------|-------|----------|
| PR1 | Sin stock | Producto agotado | CTA deshabilitado o mensaje claro; sin add silencioso |
| PR2 | Imagen rota | URL inválida | Fallback en `ProductImage`; sin layout roto |
| PR3 | Add to cart | Botón añadir | Toast único; optimistic si aplica en store |
| C1 | Carrito vacío | `/carrito` sin items | Empty state premium; sin NaN en totales |
| C2 | Cantidad | +/- cantidad | Sin duplicados; sin race visible |
| C3 | Refresh | F5 en carrito | Merge guest/sesión según implementación; persistencia coherente |

---

## 4. Checkout y pagos (Wompi)

| ID | Caso | Pasos | Esperado |
|----|------|-------|----------|
| W1 | Flujo feliz | Pago aprobado | Confirmación con verificación backend; sin “éxito” solo por URL |
| W2 | Rechazado | Tarjeta / estado rechazado | Página failed clara; CTA reintentar |
| W3 | Pendiente | Estado pending | Página pending + polling o instrucciones |
| W4 | Refresh en retorno | F5 en `payment/wompi/return` | Recovery sin spinner infinito |
| W5 | Back navigation | Atrás desde checkout | Sin doble cargo; estado consistente |
| W6 | Webhook tardío | Pago OK, orden aún pending | UX no ambigua; reintentar consulta orden |

---

## 5. Dashboard merchant

| ID | Caso | Pasos | Esperado |
|----|------|-------|----------|
| M1 | Sin datos | Comerciante nuevo | Empty states; sin charts rotos |
| M2 | API fallida | Simular 500 | ErrorState + retry |
| M3 | Tablet | Viewport ~768–1024px | Sidebar/drawer accesible; tablas con scroll horizontal controlado |

---

## 6. Responsive global (DEC-RESP)

- Navbar móvil: foco y escape en menús Headless UI.  
- Galería producto: swipe móvil (cuando exista).  
- Auth: formularios usables en 320px de ancho.  
- Checkout: pasos legibles en tablet sin CLS brusco.

---

## 7. Referencias

- `docs/testing/auth-test-plan.md` — matriz auth ampliada (refresh, OAuth).  
- `docs/audits/auth-audit.md` — riesgos backend aún abiertos fuera del alcance UI.  
- `docs/roadmap/decisions.md` — DEC-* obligatorios para futuras iteraciones.
