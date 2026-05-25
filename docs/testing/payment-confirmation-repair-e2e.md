# E2E manual — reparación confirmación de pago

**Fecha:** 2026-05-25  
**Alcance:** checkout Wompi, retorno, webhook, órdenes visibles, stock y correos transaccionales.

## Pre-requisitos

- Backend con `WOMPI_*`, SMTP o SendGrid configurado.
- Webhook Wompi apuntando a `/api/wompi/webhook` con HTTPS público en staging/producción.
- Usuario comprador autenticado con carrito válido.
- Producto con stock suficiente y comerciante con email.

## Matriz obligatoria

| ID | Caso | Pasos | Esperado |
|----|------|-------|----------|
| P1 | APPROVED | Checkout → pagar sandbox aprobado → return | Backend verifica Wompi, orden pasa a `confirmado`, aparece en Mis pedidos, carrito se limpia, stock descuenta una vez, llegan email cliente y comerciante. |
| P2 | DECLINED | Checkout → pago rechazado | Orden queda `payment_failed`, no aparece en Mis pedidos, carrito permanece, no hay stock ni emails. |
| P3 | PENDING | Dejar pago en proceso | Return muestra verificación/pending acotado; orden no aparece hasta `APPROVED`. |
| P4 | EXPIRED | Usar link vencido | Orden queda `payment_failed` con `wompiStatus=EXPIRED`; no aparece, no emails, no stock. |
| P5 | Refresh browser | Recargar `/payment/wompi/return` durante verificación | Reintenta con `orderId/reference`; no falso éxito ni 400 por falta de `transactionId`. |
| P6 | Webhook retrasado | Return antes que webhook | Backend responde `PENDING`/`waiting_for_wompi_transaction`; cuando llega webhook, confirma desde API Wompi. |
| P7 | Webhook antes del return | Webhook confirma y luego usuario vuelve | Return lee/verifica `transactionId` almacenado; orden ya confirmada e idempotente. |
| P8 | Doble webhook | Enviar dos eventos `transaction.updated` del mismo APPROVED | Stock, notificaciones y emails se ejecutan una vez. |
| P9 | Return + webhook compiten | Disparar return y webhook casi simultáneos | Una ruta toma el lock de sincronización; la otra responde idempotente/procesando sin doble descuento. |
| P10 | SMTP caído | Romper credenciales SMTP/SendGrid | Pago queda confirmado y stock consistente; logs `email_failed`; no se revierte orden por correo. |
| P11 | Comprador = comerciante | Comprar producto propio en sandbox | Se envía comprobante comprador y aviso comerciante como correos separados al mismo email. |
| P12 | Query inválida | Return con `id` no verificable por Wompi | No devuelve 400 superficial; queda pendiente hasta webhook real. |

## Validaciones de UI

- Success: texto “Pago confirmado”, icono Heroicons, sin emojis, navegación al detalle solo cuando backend confirma.
- Failed: texto “Pago no completado”, sin prometer pedido visible.
- Pending: texto “Pago en verificación”, contador de consulta y mensaje claro de que no aparecerá en pedidos hasta aprobación.
- Mis pedidos: no lista `payment_pending`, `payment_failed`, `DECLINED`, `ERROR`, `VOIDED` ni `EXPIRED`.

## Comandos

```bash
cd backend && node --check controllers/wompiController.js && node --check services/wompiOrderSync.js
cd frontend && npm run build
```
