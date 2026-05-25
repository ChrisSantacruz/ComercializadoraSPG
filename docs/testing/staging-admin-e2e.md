# Staging admin E2E

Fecha: 2026-05-25

## Entorno

- Frontend producción: `https://andinoexpress.com`
- Backend Render: `https://comercializadoraspg.onrender.com`
- Wompi: sandbox (`WOMPI_API_URL=https://sandbox.wompi.co/v1`)
- CORS permitido: `https://andinoexpress.com`, `https://www.andinoexpress.com`, `http://localhost:3000`

## Smoke obligatorio

1. `GET /api/health` debe responder `200` y header `X-Request-Id`.
2. Login admin con el auth normal debe redirigir a `/admin`.
3. Login merchant debe redirigir a `/merchant`.
4. Crear producto desde merchant debe quedar `pending`.
5. Admin aprueba producto y el producto aparece en catálogo público.
6. Admin rechaza producto con razón y merchant ve la razón.
7. Admin suspende y elimina producto sin exponer endpoints públicos.
8. Checkout con `Idempotency-Key` debe completar preflight CORS.
9. Wompi retorno debe confirmar transacción contra backend.
10. Webhook Wompi debe rechazar firma inválida.

## Responsive manual

Validar `/`, `/productos`, `/productos/:id`, `/merchant/products`, `/admin`, `/checkout` en:

- 320px
- 375px
- 768px
- 1024px
- 1440px

## Resultado local

- `npm run build` en `frontend`: OK.
- `node --check` en archivos backend tocados: OK.

## Pendientes antes de abrir pruebas externas

- Ejecutar flujo Wompi real en sandbox desde dominio público.
- Crear o migrar un superadmin con `POST /api/admin/bootstrap-superadmin` solo con `ADMIN_BOOTSTRAP_SECRET`.
- Revisar consola del navegador en dominio real para confirmar que no hay preflights bloqueados por CDN/proxy.
