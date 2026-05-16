# Auditoría final de estabilidad — frontend + backend

**Fecha:** 2026-05-15  
**Contexto:** preparación staging/producción. Lectura cruzada de `docs/roadmap/decisions.md`, `docs/architecture/*`, `docs/ui/*`, `docs/performance/*`, `docs/security/*`, `docs/observability/*`, `docs/testing/*`, `docs/audits/*`.  
**Context7 (obligatorio):** React (error boundaries, Suspense, hidratación), TanStack Query (prefetch, optimistic rollback), React Router (lazy routes), web.dev (CWV, a11y de `dialog`, métricas campo).

---

## 1. Resumen ejecutivo

La base del frontend (**TanStack Query**, code-splitting, skeletons, `ErrorBoundary` / `QueryErrorResetBoundary` documentados en `runtime-hardening.md`) es **sólida para staging**. El backend ha recibido **hardening transversal** en CORS, rate limit, helmet, health, request id y logger; permanece **deuda operativa** en volumen de `console.log` y defaults de entorno.

**No** se cumple aún el mandato global “ningún `console.log` en producción” en **todo** el árbol backend — solo en el camino crítico del servidor central y error handler ampliado.

---

## 2. Frontend — qué quedó estable

| Tema | Estado |
|------|--------|
| Prefetch PDP | `prefetchProductDetail` + eventos hover/focus en `ProductCard` |
| A11y base | `:focus-visible`, `prefers-reduced-motion`, safe areas en `body` y overlays |
| Z-index | Convención `nav` / `dropdown` / `modal` / `toast` en Tailwind |
| Build | OK; warnings ESLint previos (no regresión por cambios de esta pasada) |
| Documentación previa | `query-architecture.md` sigue siendo fuente de verdad para invalidación |

---

## 3. Frontend — deuda REAL restante

| Ítem | Impacto |
|------|---------|
| Páginas densas (`ProfilePage`, órdenes cliente) sin migración completa a Query | Estados duplicados, invalidación inconsistente |
| ESLint exhaustive-deps en checkout / payment / support | Riesgo de efectos obsoletos y flicker |
| Virtualización de listas largas | No implementada |
| INP explícito | Dependiente de upgrade `web-vitals` |
| Auth `fetch` directo en algunas pantallas | DEC-FE-001 pendiente |

---

## 4. Backend — qué quedó estable

| Tema | Estado |
|------|--------|
| Superficie CORS abierta “por log” | **Corregida** en producción |
| Ruta bootstrap admin con secreto hardcodeado | **Sustituida** por env + deshabilitada en prod por defecto |
| `unhandledRejection` con `server` indefinido | **Corregido** (logging sin crash del handler) |
| Trazas `requestId` en 500 | **Sí** |

---

## 5. Backend — riesgos REALES

1. **Defaults** `JWT_SECRET` y URI Mongo en `server.js` si `.env` falta → riesgo catastrófico en deploy descuidado.
2. **Servicios** (Wompi, upload, órdenes) con logging ad hoc y potencial fuga de metadatos.
3. **Idempotencia** pagos y órdenes — requiere revisión de negocio aparte de esta capa HTTP.
4. **Contrato API** mezcla ES/EN — clase de bugs de integración (DEC-API-002).

---

## 6. Qué falta para “producción real”

- Política de secretos: **fail-fast** y rotación; sin contraseñas en respuestas JSON en ningún entorno público.
- Sustituir `console.*` restantes por logger + niveles.
- CSP y headers en el **hosting** del SPA (Netlify/CloudFront/etc.), no solo en API.
- Sesión: DEC-AUTH-002 (httpOnly + estrategia CSRF) para postura definitiva.
- Pruebas automatizadas mínimas (smoke API + 1 E2E crítico checkout).

---

## 7. Qué sigue siendo técnico / deuda histórica

- Passport vs Firebase (DEC-AUTH-003).
- Consolidación endpoints productos comerciante (DEC-BE-005).
- Duplicación naming backend ES/EN.
- Storybook / regresión visual (DEC-UI-006).

---

## 8. Conclusión

La aplicación está **más cerca** de staging seguro y estable: menos superficie CORS, mejor observabilidad base, prefetch de datos, y a11y global mínima. Para **producción real** con tráfico y datos sensibles, cerrar P0 de secretos, logging en controladores, y decisión de sesión (cookie vs storage) sigue siendo **bloqueante** a medio plazo.
