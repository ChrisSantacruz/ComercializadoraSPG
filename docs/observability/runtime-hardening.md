# Runtime hardening y observabilidad — producción

**Fecha:** 2026-05-15  
**Decisiones:** DEC-ERR-001…005, observabilidad sin secretos (DEC-BE-004 cliente), TanStack **QueryErrorResetBoundary** (documentación Context7).

---

## 1. Logger central (`frontend/src/lib/observability/logger.ts`)

| Nivel | Uso |
|-------|-----|
| `debug` | Solo verbose; en prod efectivo solo si `REACT_APP_LOG_LEVEL=debug` |
| `info` / `warn` / `error` | Según umbral mínimo (`warn` por defecto en producción build) |

**Redacción automática:** claves matching `password|token|refresh|…`, truncado de strings largos, JWT-like en strings.

**Prohibido:** `console.log` directo en código de aplicación (salvo `logger.ts` como único sink).

## 2. Handlers globales (`runtimeBootstrap.ts`)

Registrados en `index.tsx` antes del render:

- `window` `error` → `log.error` con metadatos redactados.
- `unhandledrejection` → `log.error` (sin detener el comportamiento por defecto en dev).

## 3. Error boundaries en capas

| Zona | Componente | Comportamiento |
|------|------------|----------------|
| Raíz | `ProductionShell` = `QueryErrorResetBoundary` + `ErrorBoundary` (`zone="root"`) | Botón **Reintentar** llama reset de Query + estado boundary |
| Público | `PublicLayout` → `ErrorBoundary` (`zone="public"`) | Fallo localizado; no pantalla blanca completa del sitio |
| Dashboard | `DashboardLayout` → `ErrorBoundary` (`zone="dashboard"`) | Idem |
| Checkout | `CheckoutErrorBoundary` | Retry sin reload obligatorio; log estructurado; enlace a pedidos |

Ningún boundary traga errores sin UI ni logging.

## 4. Reconexión y offline

- `NetworkStatusBanner`: aviso no bloqueante cuando `navigator.onLine === false`.
- Reintento de datos: delegado en **TanStack Query** (`refetchOnReconnect`), sin bucles ni `invalidateQueries` duplicados en el banner.

## 5. Integración futura APM

Sustituir/ extender el método `error` del logger para enviar a:

- Sentry / OpenTelemetry browser / proveedor elegido  
con **misma política de redacción**.

## 6. Context7 — resumen técnico aplicado

- **React:** boundaries con `getDerivedStateFromError` / `componentDidCatch`; combinar **Suspense** con boundary para errores de `use`/async UI.
- **TanStack Query:** `QueryErrorResetBoundary` + `reset` en **Reintentar** tras errores de query/render coordinados.
- **React Router:** `ScrollRestoration` del framework no aplica en `BrowserRouter` puro; sustituido por hook de scroll + hash.

---

**Mantenimiento:** al añadir nuevas zonas de página críticas, considerar un boundary adicional solo si el subtree tiene riesgo de throw frecuente o librería de terceros inestable.
