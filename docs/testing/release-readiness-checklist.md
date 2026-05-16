# Checklist de readiness para release — Comercializadora SPG

**Uso:** completar antes de promover a producción. Cruza con `docs/roadmap/decisions.md` y auditorías en `docs/audits/`.

---

## Seguridad

- [ ] Variables `REACT_APP_*` y `NODE_ENV` revisadas en el pipeline; **sin** secretos en frontend.
- [ ] OAuth: ningún JWT en query persistente ni en logs de servidor (rutas `/auth/`, `/wompi/`).
- [ ] CORS/orígenes acordados para producción (restringir callback `null, true` en CORS si aplica).
- [ ] Contraseñas/tokens no aparecen en logs backend (middleware `server.js` redacta cuerpos sensibles).

## Observabilidad

- [ ] Logger: en producción, nivel por defecto **warn** o superior; `debug` solo con flag explícita.
- [ ] APM/error tracking configurado (opcional pero recomendado): DSN y entorno `production`.
- [ ] `reportWebVitals`: si se requiere telemetría real, sustituir no-op por endpoint de ingesta.

## Errores y resiliencia

- [ ] Probar **Reintentar** en boundary raíz tras error simulado en componente hijo.
- [ ] Probar flujo offline → online (banner + datos que refetch solos).
- [ ] Checkout Wompi: retorno `WompiReturnPageFixed` + carrito; sin spinners infinitos tras fallo red.
- [ ] Mensajes de error genéricos en prod para 500 / red (no stack del backend en UI).

## Performance

- [ ] Lighthouse móvil en home, catálogo y PDP (registrar LCP/CLS).
- [ ] Verificar que imágenes críticas tienen dimensiones o aspect-ratio estable (CLS).

## Datos y contratos

- [ ] Helpers `apiContract.js` (backend) listos para normalizar listas/números en nuevos endpoints.
- [ ] `helpers.errorResponse` no filtra `detalles` en producción.

## Accesibilidad y UI

- [ ] Modales Headless UI: foco y Escape (smoke test en checkout y formularios).
- [ ] Toasts: `NotificationToast` / contenedor no quedan bajo el navbar (`z-toast`).

## Limpieza

- [ ] Sin archivos duplicados backend/frontend (`notificationService` fantasma eliminado 2026-05-15).
- [ ] Build `npm run build` sin errores TypeScript.

---

**Firma release (opcional):** responsable / fecha / versión git tag.
