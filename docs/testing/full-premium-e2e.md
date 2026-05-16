# Plan E2E — experiencias premium (Comercializadora SPG)

**Estado:** checklist manual de regresión (2026-05-14)  
**Alcance:** auth, perfil, catálogo, carrito, checkout/pagos, pedidos, dashboard comerciante, notificaciones.

---

## 1. Entornos y datos

- [ ] API `REACT_APP_API_URL` apunta al backend correcto (sin mezcla 5000/5001).
- [ ] Usuario **cliente** con historial de pedidos y sin pedidos.
- [ ] Usuario **comerciante** con productos y órdenes.
- [ ] Red lenta (throttling 3G) y **offline** intermitente.

---

## 2. Auth y sesión

- [ ] Login email/contraseña: errores claros; éxito redirige a `redirect` seguro (solo rutas internas `/...`).
- [ ] OAuth Google/Facebook: popup bloqueado, cancelación, error de red.
- [ ] Registro → redirección a verificación de email.
- [ ] Recuperación / cambio de contraseña (si aplica en despliegue).
- [ ] **Refresh** con sesión válida: `bootstrapSession` restaura perfil sin bucle infinito.
- [ ] Token expirado / refresh fallido: pérdida de sesión sin `window.location` brusco en flujos cubiertos por `api` (ver `AuthProvider` + eventos).

---

## 3. Perfil y cuenta

- [ ] Carga de perfil y actualización sin `console` ni datos sensibles en UI.
- [ ] Tabs/secciones accesibles por teclado (alinear a Headless UI `TabGroup` donde exista).
- [ ] Centro de notificaciones: lista, marcar leída, vacío y error de API sin fugas de token en logs.

---

## 4. Producto y carrito

- [ ] Detalle: imágenes con fallback; categoría opcional falla sin romper página.
- [ ] Añadir al carrito: feedback consistente (`NotificationProvider`).
- [ ] Carrito: actualizar cantidad (ruta principal + fallback `/cart/update`), eliminar, vacío → checkout bloqueado con mensaje.

---

## 5. Checkout y pagos

- [ ] Recalcular carrito en checkout es **best-effort**; si falla, flujo continúa con carrito persistido.
- [ ] Crear orden + Wompi: montos mínimos, errores mostrados al usuario.
- [ ] `WompiPayment`: fallo de acceptance token propaga vía `onError` (sin `console.error`).
- [ ] Páginas éxito/cancelación: sin dependencia de logs para diagnóstico.

---

## 6. Pedidos

- [ ] Lista cliente: `/orders/my-orders` con fallback a `/orders`; sin spinners eternos; error muestra mensaje.
- [ ] Detalle: carga real; fallback simulado solo si API cae (deuda documentada en auditoría).
- [ ] Comerciante: órdenes sin panel de debug; recarga sin emojis en CTAs.

---

## 7. Dashboard y analytics

- [ ] Dashboard comerciante: stats principales visibles aunque falle bloque secundario (órdenes/reseñas).
- [ ] Analytics: periodo cambia datos; fallo API → métricas en cero sin crash.

---

## 8. Responsive

- [ ] **Mobile:** sin overflow horizontal en login, pedidos, checkout.
- [ ] **Tablet:** filtros pedidos/catálogo usables (DEC-RESP-003).
- [ ] **Desktop:** layout auth de dos columnas (`AuthLayoutShell`).

---

## 9. Regresión técnica

- [ ] `npm run build` sin errores de TypeScript.
- [ ] Sin `console.log` / `console.warn` en rutas críticas tocadas en esta pasada (quedan utilidades opcionales `debugUtils` / `imageTest` para desarrollo local).

---

## Referencias

- Decisiones: `docs/roadmap/decisions.md` (DEC-UI-*, DEC-ERR-*, DEC-LOAD-*, DEC-AUTH-*, DEC-FE-*).
- Auditorías previas: `docs/audits/*.md`.
- Plan auth: `docs/testing/auth-test-plan.md`.
