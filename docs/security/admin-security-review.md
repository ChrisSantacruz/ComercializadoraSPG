# Admin security review

Fecha: 2026-05-25

## Cambios de seguridad

- CORS usa whitelist explícita y elimina `Access-Control-Allow-Origin: *` en uploads.
- Preflight `OPTIONS` queda cubierto por `cors(corsOptions)`.
- Headers permitidos incluyen `Content-Type`, `Authorization`, `Idempotency-Key`, `X-Request-Id`, `Accept`, `Origin`, `X-Requested-With`, `X-Signature`, `X-Timestamp`.
- Bootstrap admin ya no crea usuarios con email/password hardcodeados.
- Bootstrap requiere `ADMIN_BOOTSTRAP_SECRET` y está bloqueado en producción salvo `ENABLE_ADMIN_BOOTSTRAP=true`.
- Admin CRUD/moderación requiere JWT y rol `admin` o `superadmin`.
- Wompi valida configuración al arranque y evita logs de secretos.
- Webhook Wompi valida checksum del evento antes de reconciliar transacciones.
- Endpoint de generación de datos de prueba de analytics quedó desmontado.

## Controles operativos requeridos

- En Render definir `NODE_ENV=production`.
- Definir `FRONTEND_URL=https://andinoexpress.com`.
- No activar `ENABLE_ADMIN_BOOTSTRAP` salvo ventana controlada.
- Rotar `ADMIN_BOOTSTRAP_SECRET` después de crear superadmin.
- Usar claves Wompi sandbox solo en staging y claves prod solo en producción.

## Pendientes

- Migrar sesión a refresh httpOnly + CSRF si se endurece más allá de staging.
- Reemplazar `console.*` legacy restante por logger estructurado.
- Añadir auditoría persistente de acciones admin si se requiere trazabilidad legal.
