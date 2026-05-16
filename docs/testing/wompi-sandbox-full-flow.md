# Wompi — flujo sandbox completo (local)

**Entorno:** `NODE_ENV=development`, backend `PORT=5001`, frontend `http://localhost:3000`.

## 1. Separación TEST vs PROD

| Variable | Sandbox (TEST) | Producción |
|----------|------------------|------------|
| `WOMPI_PUBLIC_KEY` / `REACT_APP_WOMPI_PUBLIC_KEY` | `pub_test_…` | `pub_prod_…` |
| `WOMPI_PRIVATE_KEY` | `prv_test_…` | `prv_prod_…` |
| `WOMPI_INTEGRITY_SECRET` | `test_integrity_…` | `prod_integrity_…` |
| `WOMPI_EVENTS_SECRET` | `test_events_…` | `prod_events_…` |
| `WOMPI_API_URL` | `https://sandbox.wompi.co/v1` | `https://production.wompi.co/v1` |

**Regla:** nunca mezclar claves sandbox con URL de producción ni viceversa.

Los valores de ejemplo en `backend/.env.example` y `frontend/.env.example` están alineados para **sandbox** (copia a `.env` / `.env.local`).

## 2. Carga de variables

1. Copia `backend/.env.example` → `backend/.env`.
2. Copia `frontend/.env.example` → `frontend/.env.local` (recomendado en CRA).
3. Verifica que `REACT_APP_API_URL` apunte al mismo host:puerto que el backend.

## 3. Preflight y órdenes (CORS)

El cliente envía `Idempotency-Key` en `POST /api/orders`. El backend debe listar esta cabecera en `Access-Control-Allow-Headers` (corregido en `server.js`).

Prueba rápida en DevTools → pestaña Network → crear pedido: la petición no debe fallar en preflight por cabeceras no permitidas.

## 4. Checkout y retorno

1. Inicia sesión, añade producto al carrito, ve a **Checkout**.
2. Completa dirección y avanza al paso de pago.
3. En sandbox Wompi usa tarjetas/métodos de prueba de la [documentación Wompi](https://docs.wompi.co).
4. Al volver, valida que la app procese `WompiReturnPageFixed` / ruta configurada sin error.

## 5. Webhook local

Para eventos `APPROVED` / `DECLINED` / `PENDING` en desarrollo:

- Exponer el backend con túnel (ngrok, Cloudflare Tunnel) **o** usar el simulador/consola Wompi según tu setup.
- Configura la URL de webhook en el dashboard sandbox apuntando a `POST /api/wompi/...` (ruta exacta según `backend/routes/wompi.js`).

Validar firma con `WOMPI_EVENTS_SECRET` (sandbox).

## 6. Estados a validar

| Estado | Acción |
|--------|--------|
| APPROVED | Pedido actualizado a pagado / confirmado según tu modelo |
| DECLINED | Mensaje de error claro; sin doble cargo |
| PENDING | UI refleja pendiente; reintento o consulta de estado |
| ERROR | Log estructurado; no filtrar secretos al cliente |

## 7. Checklist breve

- [ ] Claves solo sandbox en `.env` local  
- [ ] `npm run build` frontend  
- [ ] Orden de prueba creada con idempotency  
- [ ] Retorno post-pago OK  
- [ ] (Opcional) Webhook recibido y verificado  
