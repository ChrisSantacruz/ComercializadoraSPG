# Informe de hardening — backend API

**Fecha:** 2026-05-15  
**Alcance:** Express API (`backend/server.js` y middleware globales).  
**Referencias:** `docs/roadmap/decisions.md` (DEC-AUTH-001, DEC-BE-004, DEC-API-006), Context7 (buenas prácticas de observabilidad y errores HTTP coherentes).

---

## 1. Cambios aplicados en esta pasada

| Área | Implementación |
|------|----------------|
| **Logger estructurado** | `backend/utils/logger.js` — líneas JSON, redacción de claves sensibles y tokens tipo JWT |
| **Request ID** | `middlewares/requestContext.js` — header `X-Request-Id` propagado o generado |
| **Health** | `GET /api/health` — `no-store`, `uptime`, `requestId` |
| **CORS producción** | Whitelist explícita; orígenes no listados **rechazados** en `NODE_ENV=production`. Sin `Origin`: bloqueado en prod salvo `CORS_ALLOW_NO_ORIGIN=true` |
| **Helmet** | `referrerPolicy`, `crossOriginResourcePolicy`, **HSTS** en producción |
| **Rate limit** | Producción: `RATE_LIMIT_MAX` (default 400 por ventana 15m); desarrollo permisivo |
| **Errores** | `errorHandler` usa logger; respuestas 500 incluyen `requestId`; errores CORS mapeados a 403 |
| **Bootstrap admin** | Ruta `/api/admin/create-super-admin` **desactivada en producción** salvo `ENABLE_ADMIN_BOOTSTRAP=true`. Secreto vía `ADMIN_BOOTSTRAP_SECRET` (obligatorio en prod). Respuesta **sin** contraseña en claro en producción |
| **Unhandled rejection** | Registro vía logger (sin referencia rota a `server` inexistente en el handler anterior) |

---

## 2. Riesgos que permanecen (reales)

| Riesgo | Severidad | Notas |
|--------|-----------|-------|
| `JWT_SECRET` / `MONGODB_URI` por defecto en código si faltan env | **Alta** | Debe existir **fail-fast** en producción (no implementado en esta iteración) |
| `console.log` en controladores y servicios (auth, orders, wompi, upload, …) | **Media** | Sustituir gradualmente por `utils/logger`; **Wompi init** aún imprime estado de claves en arranque |
| Firebase mock / continuación sin Admin | **Media** | Comportamiento documentado en arranque; no apto para producción sin credenciales |
| CORS uploads `Access-Control-Allow-Origin: *` | **Baja–Media** | Coherente con assets públicos; revisar si debe restringirse al dominio CDN |
| Validación inconsistente en endpoints mutables | **Media** | DEC-BE-002 — trabajo por controlador |

---

## 3. Variables de entorno — staging / producción

| Variable | Uso |
|----------|-----|
| `NODE_ENV=production` | Activa CORS estricto, HSTS, rate limit más bajo |
| `FRONTEND_URL`, `ADMIN_URL` | Orígenes permitidos (sin trailing slash en comparación) |
| `ADMIN_BOOTSTRAP_SECRET` | Obligatorio en prod si bootstrap está habilitado; en desarrollo, por defecto `CREATE_ADMIN_SECRET_2025` si la env no está definida |
| `ENABLE_ADMIN_BOOTSTRAP=true` | Emergencias operativas únicamente |
| `CORS_ALLOW_NO_ORIGIN=true` | Solo si hay clientes sin `Origin` legítimos |
| `RATE_LIMIT_MAX` | Tope de peticiones / ventana en producción |

---

## 4. Próximos pasos recomendados (P0/P1)

1. Eliminar o aislar **todos** los `console.*` en rutas calientes; centralizar en logger.
2. Fail-fast si faltan `JWT_SECRET`, `MONGODB_URI`, claves Wompi en prod cuando las rutas correspondientes estén montadas.
3. Auditoría de **payloads** en logs de terceros (SendGrid, Wompi) — no registrar cuerpos completos.
4. Tracing distribuido: propagar `X-Request-Id` a llamadas a Wompi y correo.

---

## 5. Checklist rápido pre-prod

- [ ] Ningún secret en respuesta JSON de errores genéricos.
- [ ] `/api/health` verde tras deploy.
- [ ] Prueba CORS desde el origen del SPA (debe 200; origen falso debe 403).
- [ ] Bootstrap admin imposible sin flags explícitos.
