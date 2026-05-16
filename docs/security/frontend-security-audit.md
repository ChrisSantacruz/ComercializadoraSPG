# Auditoría de seguridad frontend — release 2026-05-15

**Alcance:** SPA React (CRA), cliente HTTP `axios`, almacenamiento de sesión, superficie XSS y fugas de datos vía logs/UI.

**Referencias normativas:** `docs/roadmap/decisions.md` (DEC-AUTH-002/005, DEC-API-006, DEC-ERR-005), Context7 (React error boundaries + TanStack Query error reset).

---

## 1. XSS y HTML dinámico

| Verificación | Estado |
|--------------|--------|
| `dangerouslySetInnerHTML` en `frontend/src` | **No encontrado** (búsqueda global) |
| Contenido de usuario renderizado como texto | Predominio de React escaped — mantener sin `dangerouslySetInnerHTML` sin sanitización (DOMPurify u otro) si se introduce rich text |

## 2. Tokens y almacenamiento

| Riesgo | Mitigación actual | Nota |
|--------|-------------------|------|
| JWT / refresh en `localStorage` (XSS) | Persistencia vía `tokenBridge` + `authStore` — **DEC-AUTH-002 pendiente** (httpOnly + refresh) | Postura definitiva requiere backend cookies + CSRF |
| Tokens en query string OAuth | **DEC-AUTH-005** — revisar `OAuthCallback` y handoff backend; no persistir JWT en URL | Auditar rutas tras cada cambio auth |

## 3. Logs y errores en cliente

| Regla | Implementación |
|-------|----------------|
| Sin `console.*` en código de producto | **Capa canónica:** `frontend/src/lib/observability/logger.ts` (único sink con redacción) |
| No JWT / passwords / payloads sensibles | `redactForLogs` + claves sensibles por regex |
| Mensajes 500 al usuario | `parseApiError` + `sanitizeUserFacingMessage` en `authErrors.ts` — mensaje genérico en **producción** para status ≥500 y red sin respuesta |

**Herramientas de diagnóstico** (`debugUtils`, `imageTest`) migradas a `log.debug` / `log.warn`.

## 4. Open redirect y navegación

| Área | Recomendación |
|------|----------------|
| `window.location` / redirects post-login | Mantener lista blanca de rutas o relativas internas; revisar cualquier `navigate` con query externa |

## 5. Backend logging de rutas sensibles (relacionado)

En `backend/server.js`, el middleware de rutas `/auth/` y `/wompi/`:

- **Producción:** solo método + URL; sin cuerpo completo.
- **Desarrollo:** cuerpo con **redacción** de campos tipo password/token/refresh.

`backend/utils/helpers.js` — `errorResponse` no envía `detalles` al cliente fuera de `NODE_ENV=development` (DEC-API-006).

## 6. Limpieza realizada

- Eliminado `frontend/src/services/notificationService.js` (código duplicado tipo backend, sin imports; riesgo de confusión y mantenimiento).

## 7. Backlog de seguridad P0/P1

1. DEC-AUTH-002: sesión httpOnly + estrategia CSRF.
2. CSP headers en hosting estático + API.
3. Sustituir `web-vitals` v2 por v3+ para **INP** cuando se priorice Core Web Vitals 2024+.
4. Auditoría de todas las rutas `Navigate`/`open()` con parámetros externos.

---

**Última actualización:** 2026-05-15
