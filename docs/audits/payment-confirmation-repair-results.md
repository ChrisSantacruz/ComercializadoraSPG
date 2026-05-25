# Auditoría — reparación confirmación de pago

**Fecha:** 2026-05-25  
**Resultado:** flujo Wompi reparado para no mostrar ni completar órdenes antes de confirmación real.

## Root Cause Del 400

El endpoint que devolvía el 400 era `POST /api/wompi/confirm-return`.

Payload esperado antes del fix:

```json
{ "transactionId": "...", "orderId": "..." }
```

Payload real posible después de un payment link:

```json
{ "orderId": "..." }
```

El `redirect_url` propio se construía con `orderId/reference`, pero el `transactionId` real no siempre llega en la URL de retorno. Ese ID sí llega por webhook `transaction.updated` o queda disponible solo cuando Wompi lo genera. La validación rota era `if (!transactionId || !orderId)`, que respondía 400 aunque el pago pudiera estar aprobado y el webhook aún no hubiera corrido.

Campos que rompían el flujo:

- Faltaba `transactionId` en el return.
- `id` de query podía no ser una transacción verificable.
- `payment_pending` se trataba como pedido visible.
- `sendOrderConfirmationEmail` se importaba desde un módulo que no lo exportaba, por eso no salían comprobantes.

## Flujo Final

1. Checkout crea una orden en `payment_pending`, no visible comercialmente.
2. Se crea link Wompi con `wompiStatus=CREATED`.
3. Return llama backend con `orderId` y `transactionId` solo si existe.
4. Backend verifica contra API Wompi si tiene transacción real.
5. Si no hay transacción verificable, responde `PENDING` sin 400 y espera webhook/polling.
6. Webhook y return usan la misma sincronización server-authoritative.
7. Solo `APPROVED` cambia la orden a `confirmado`.
8. Solo en `confirmado` se limpia carrito, descuenta stock, notifica y envía emails.

## Machine States

Estados Wompi soportados:

- `CREATED`: link creado, sin transacción final.
- `PENDING`: transacción en proceso.
- `APPROVED`: pago confirmado, orden visible.
- `DECLINED`: pago rechazado, orden oculta.
- `VOIDED`: pago anulado, orden oculta.
- `ERROR`: error del proveedor, orden oculta.
- `EXPIRED`: link/transacción vencida, orden oculta.

Estados de orden:

- `payment_pending`: borrador transaccional oculto.
- `confirmado`: pedido válido visible.
- `payment_failed`: pago no aprobado oculto.
- Estados logísticos visibles después de confirmación: `procesando`, `enviado`, `entregado`, `cancelado`.

## Fixes Aplicados

- `confirm-return` acepta `orderId` sin `transactionId` y responde pending verificable.
- Webhook y return sincronizan por `wompiOrderSync.syncOrderWithTransaction`.
- Se agregó `paymentInfo.wompiStatus`, timestamps de verificación, lock de sync, marcas de stock/email/notificación.
- Mis pedidos y pedidos de comerciante filtran solo estados visibles.
- Detalle de orden no expone estados `payment_pending/payment_failed` a usuarios no admin.
- Checkout ya no limpia carrito al redirigir a Wompi.
- Carrito se limpia únicamente tras `APPROVED`.
- Stock se descuenta únicamente tras `APPROVED`.
- Correos transaccionales nuevos: comprobante comprador y aviso comerciante con retry controlado.
- Logs estructurados para `payment_created`, `payment_verified`, `wompi_webhook_received`, `order_confirmed`, `email_sent`, `email_failed`.

## Edge Cases Cubiertos

- Return antes de webhook: pending sin falso error.
- Webhook antes de return: return confirma con transacción persistida.
- Doble webhook: lock evita doble procesamiento de stock/notificaciones.
- Pago rechazado/vencido/error: no visible, sin emails, sin stock.
- SMTP caído: orden no se revierte; error queda en logs.
- Comprador igual a comerciante: comprador y comerciante reciben correos separados.

## Riesgos Restantes

- La consistencia fuerte de stock ante fallo de proceso a mitad del descuento aún sería mejor con transacciones MongoDB multi-documento.
- Si Wompi no entrega webhook y el return no trae transacción verificable, el estado queda pendiente hasta reconciliación manual o reintento.
- El árbol conserva deuda histórica de logs `console.*` fuera del flujo reparado.

## Recomendaciones Producción

- Configurar webhook HTTPS público y monitoreo de 5xx.
- Agendar job de reconciliación para órdenes `payment_pending` antiguas.
- Mover stock + orden a una transacción MongoDB con replica set.
- Alertar por `email_failed` y por órdenes `APPROVED` sin `buyerEmailSentAt`.
- Probar sandbox con `APPROVED`, `DECLINED`, `PENDING`, `VOIDED`, `ERROR` y `EXPIRED` antes de liberar.
