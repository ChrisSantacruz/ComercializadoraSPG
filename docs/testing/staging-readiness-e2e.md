# E2E y readiness — staging / producción

**Fecha:** 2026-05-15  
**Referencias normativas:** `docs/roadmap/decisions.md`, Context7 (React error boundaries / Suspense, TanStack Query prefetch + optimistic rollback, React Router lazy routes, web.dev Core Web Vitals y a11y), `docs/architecture/query-architecture.md`, `docs/observability/runtime-hardening.md`.

---

## 1. Smoke test plan (post-deploy)

Ejecutar en orden sobre el entorno de staging (misma config que prod salvo URLs y claves sandbox).

| # | Flujo | Criterio de éxito |
|---|--------|-------------------|
| 1 | `GET /api/health` | `200`, `ok: true`, header `X-Request-Id` presente |
| 2 | `GET /` (SPA) | HTML entregado; sin error de consola bloqueante |
| 3 | Catálogo `/productos` | Grid visible; skeleton solo en primera carga; sin spinner infinito |
| 4 | PDP desde catálogo | Navegación fluida; datos coherentes; prefetch percibible opcional (red menor en 2ª visita) |
| 5 | Login / sesión | Sin JWT en URL post-OAuth; 401 manejado sin pantalla blanca |
| 6 | Carrito + checkout | Doble submit bloqueado en UI; estado de botón `loading` |
| 7 | Retorno Wompi (sandbox) | Máquina de estados checkout sin catch silencioso; error con retry |
| 8 | Merchant dashboard | Datos reales o `ErrorState` explícito (sin ceros mock) |

---

## 2. Accessibility checklist (WCAG-orientado)

| Ítem | Verificación |
|------|----------------|
| Focus visible | Todos los controles interactivos muestran anillo coherente (`:focus-visible` global en `index.css`) |
| Teclado | Catálogo: filtros y drawer cerrables con Esc; orden de tab lógico |
| ARIA | Botones sólo-icono con `aria-label`; modales con `DialogTitle` / `DialogDescription` (Headless UI) |
| Títulos | Una jerarquía `h1` → `h2` por vista sin saltos arbitrarios |
| Forms | Errores enlazados con `aria-describedby` donde usa `FormField` |
| Movimiento | Con `prefers-reduced-motion: reduce`, animaciones no deben dominar la UI |
| Contraste | Revisión spot en botones primarios y texto sobre `secondary` / `accent` |

---

## 3. Responsive checklist

| Vista | Verificación |
|-------|----------------|
| 320–390px | Safe areas: body y `Sheet` / `Modal` no cortan CTAs; navbar no oculta hero crítico |
| 768–1024px (tablet) | Filtros catálogo accesibles (drawer o panel); sin sidebar “muerto” |
| ≥1280px | Contenedor máximo consistente (`Container` / `max-w-7xl`); sin filas rotas |
| Orientación | Cambio portrait/landscape sin pérdida de foco en campo activo (cuando aplique) |

---

## 4. Production readiness checklist

- [ ] `NODE_ENV=production` en API; sin defaults de `JWT_SECRET` débil en filosofía de despliegue (el código aún define fallback local — **riesgo** documentado en informe de seguridad).
- [ ] `FRONTEND_URL` / URLs en whitelist CORS alineadas al dominio real.
- [ ] `ENABLE_ADMIN_BOOTSTRAP` **no** activo salvo ventana operativa; `ADMIN_BOOTSTRAP_SECRET` fuerte y rotado.
- [ ] `CORS_ALLOW_NO_ORIGIN=true` solo si hay integraciones sin header `Origin` justificadas (monitorear).
- [ ] Variables Wompi / Firebase / OAuth completas o rutas deshabilitadas conscientemente.
- [ ] Frontend: `npm run build` sin errores; warnings ESLint conocidos acotados (ver informe Lighthouse).
- [ ] Logs API en formato JSON (logger estructurado) hacia agregador; sin tokens en texto plano.

---

## 5. Rollback checklist

1. Congelar tráfico (lb / feature flag) o redeploy imagen etiqueta `previous`.
2. Restaurar variables de entorno y secretos del release anterior.
3. Verificar `GET /api/health` y un flujo auth + un GET de catálogo.
4. Comunicar `requestId` de errores 5xx si hay tickets abiertos.
5. Post-mortem: entrada en `docs/audits/` si hubo incidente de datos.

---

## 6. Deployment checklist

- [ ] Migraciones / índices Mongo aplicados si el release los incluye.
- [ ] Smoke §1 en staging antes de prod.
- [ ] CDN / cache bust en estáticos (`build/`).
- [ ] Probar CORS desde el dominio final (browser real, no sólo curl).
- [ ] Monitoreo: latencia p95 auth, tasa 4xx/5xx, saturación rate-limit.

---

## 7. Simulaciones manuales obligatorias

| Escenario | Cómo | Esperado |
|-----------|------|----------|
| Offline / online | DevTools → Offline | Banner red; Query `refetchOnReconnect` sin bucles |
| Refresh agresivo | F5 durante fetch | Sin estado corrupto visible; errores recuperables |
| Slow 3G | Throttling | Skeletons estables; sin CLS salvaje al hidratar imágenes |
| Mobile Safari | Dispositivo o Simulator | Safe areas; scroll sin jump bajo barra fija |
| Tablet | 820px ancho | Filtros usables; layout sin columnas rotas |
| Doble navegación | Click rápido entre rutas | Sin warning “setState on unmounted” crítico |
| Doble submit | Doble click pagar | Idempotencia backend + UI disabled |
| Back / forward | Historial en PDP | Estado URL coherente; scroll restaurado por hook de app |
| Sesión expirada | Token inválido | Logout / mensaje; no loop silencioso |
| Race API | Respuesta lenta + cambio ruta | TanStack cancela obsoletos donde axios lo permita |
| API caída | Stop backend | `ErrorState` + retry |
| Imágenes rotas | URL inválida en producto | Placeholder en `ProductImage` |
| Categorías vacías | DB sin categorías | Empty state enterprise, sin datos inventados |
| Carrito corrupto | JSON inválido en storage | Parser defensivo en store / migración |
| localStorage corrupto | Basura en keys auth/cart | Fallback a sesión fresca + mensaje |

---

## 8. Deuda de testing real (no cubierta por este documento)

- Suite automatizada Cypress/Playwright no incluida en esta pasada.
- Contrato API bilingüe / campos legacy sigue siendo fuente de regresión (DEC-API-002 pendiente en `decisions.md`).
