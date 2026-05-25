# Pickup Checkout Root Cause

## Resumen

El bug crítico ocurría porque el checkout tenía dos decisiones distintas para el método de entrega:

- La UI y la creación de orden sí permitían `recoger_establecimiento`.
- El flujo que crea el enlace de pago de Wompi volvía a resolver una dirección y fallaba si no existía una dirección seleccionada.

El resultado era inconsistente: el usuario seleccionaba "Recoger en ubicación", la pantalla ocultaba el formulario de dirección, pero el submit terminaba bloqueado por lógica de pago que seguía asumiendo entrega a domicilio.

## Causa Raíz

En `frontend/src/pages/checkout/CheckoutPage.tsx`, `validateForm` omitía la dirección cuando `deliveryType === "recoger_establecimiento"`, y `handleCreateOrder` enviaba `direccionEntrega: null`.

El problema estaba después, en el armado del payload de Wompi:

- `handleWompiPayment` siempre intentaba construir `address`.
- Si no había dirección guardada seleccionada, lanzaba `No se ha seleccionado una dirección válida`.
- Si el usuario venía de una dirección nueva incompleta y cambiaba a pickup, lanzaba `Los datos de la dirección están incompletos`.
- `shippingAddress` se omitía para pickup, pero demasiado tarde: la dirección ya se había exigido.

## Corrección Implementada

Frontend:

- Se agregó una capa de React Hook Form para centralizar el estado validable del checkout.
- La validación dinámica distingue `domicilio` y `recoger_establecimiento`.
- En pickup se limpian errores de dirección y touched state relacionado con `selectedAddress`, `newAddress` y `otraCiudad`.
- El submit de Wompi usa TanStack Query `useMutation` con `retry: false` para evitar reintentos peligrosos en creación de órdenes/pagos.
- El payload ahora envía `deliveryMethod: "pickup"` y `pickupLocation` cuando aplica.
- El flujo pickup ya no resuelve ni valida `shippingAddress`.

Backend:

- `Order` ahora soporta `deliveryMethod` (`delivery` / `pickup`) y `pickupLocation`.
- `crearPedido` normaliza `deliveryMethod` con el contrato legacy `tipoEntrega`.
- `tipoEntrega` se valida explícitamente.
- Pickup mantiene `direccionEntrega` compatible para órdenes antiguas, pero también persiste `pickupLocation`.
- Wompi verifica la orden en backend, compara monto contra `order.total` y omite `shipping_address` para pickup aunque el cliente lo envíe.
- La orden pasa a `payment_pending` cuando se crea el link de Wompi.

## Payloads

Entrega a domicilio:

```json
{
  "tipoEntrega": "domicilio",
  "deliveryMethod": "delivery",
  "direccionEntrega": "addressId-or-address-object",
  "pickupLocation": null
}
```

Recogida en ubicación:

```json
{
  "tipoEntrega": "recoger_establecimiento",
  "deliveryMethod": "pickup",
  "direccionEntrega": null,
  "pickupLocation": {
    "name": "Comercializadora SPG",
    "address": "Pasto, Nariño",
    "instructions": "Te avisaremos cuando el pedido esté listo. Lleva tu documento y el número de orden."
  }
}
```

## Compatibilidad

El backend conserva `tipoEntrega` y `direccionEntrega` para no romper pantallas o reportes existentes. `deliveryMethod` y `pickupLocation` son campos adicionales y explícitos para el nuevo contrato.

Órdenes antiguas sin `deliveryMethod` siguen funcionando porque `tipoEntrega` continúa siendo la fuente compatible.

## Riesgos Residuales

- Los estados operativos de merchant todavía usan una línea de tiempo centrada en envío (`enviado`, tracking, guía). Pickup ya no bloquea checkout/pago, pero la operación post-pago puede requerir una mejora posterior para estados como `listo_recoger`.
- La prueba real de Wompi depende de credenciales sandbox/producción válidas y conectividad contra la API de Wompi.
