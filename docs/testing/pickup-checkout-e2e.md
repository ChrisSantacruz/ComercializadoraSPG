# Pickup Checkout E2E

## Objetivo

Validar que checkout soporta correctamente:

- Entrega a domicilio con dirección obligatoria.
- Recogida en ubicación sin dirección de entrega.
- Creación de orden y enlace Wompi con payload consistente.

## Precondiciones

- Usuario autenticado.
- Carrito con al menos un producto disponible.
- Backend conectado a base de datos.
- Credenciales Wompi configuradas para sandbox o producción.

## Caso 1: Pickup Sin Direcciones Guardadas

1. Iniciar sesión con un usuario sin direcciones.
2. Agregar producto al carrito.
3. Ir a checkout.
4. Seleccionar `Recoger en ubicación`.
5. Aceptar términos.
6. Continuar al pago.
7. Ingresar documento válido del pagador.
8. Pagar con Wompi.

Resultado esperado:

- No aparece `Selecciona una dirección de entrega`.
- No se muestra formulario de dirección.
- Se muestra el bloque `Recogerás tu pedido en: Comercializadora SPG, Pasto, Nariño`.
- La orden se crea con `tipoEntrega: "recoger_establecimiento"`.
- La orden se crea con `deliveryMethod: "pickup"`.
- `costoEnvio` es `0`.
- El payload Wompi no incluye `shippingAddress`.

## Caso 2: Delivery Con Dirección Guardada

1. Iniciar sesión con una dirección guardada.
2. Agregar producto al carrito.
3. Ir a checkout.
4. Seleccionar `Envío a domicilio`.
5. Seleccionar dirección guardada.
6. Aceptar términos.
7. Continuar al pago.
8. Ingresar documento válido.
9. Pagar con Wompi.

Resultado esperado:

- La dirección es obligatoria.
- La orden se crea con `tipoEntrega: "domicilio"`.
- La orden se crea con `deliveryMethod: "delivery"`.
- `costoEnvio` aplica.
- El payload Wompi incluye `shippingAddress`.

## Caso 3: Delivery Con Dirección Nueva Incompleta

1. Seleccionar `Envío a domicilio`.
2. Activar `Usar una nueva dirección`.
3. Dejar campos obligatorios vacíos.
4. Aceptar términos.
5. Intentar continuar.

Resultado esperado:

- El checkout bloquea avance.
- El mensaje indica el campo obligatorio pendiente.
- No se crea orden.
- No se crea enlace Wompi.

## Caso 4: Delivery A Pickup Con Dirección Parcial

1. Seleccionar `Envío a domicilio`.
2. Activar dirección nueva.
3. Llenar parcialmente la dirección.
4. Cambiar a `Recoger en ubicación`.
5. Aceptar términos.
6. Continuar al pago.
7. Pagar con Wompi.

Resultado esperado:

- Se limpian errores de dirección previos.
- La dirección parcial no bloquea pickup.
- `direccionEntrega` viaja como `null` en creación de orden.
- Backend persiste `pickupLocation`.
- Wompi no recibe `shipping_address`.

## Caso 5: Pickup A Delivery

1. Seleccionar `Recoger en ubicación`.
2. Cambiar a `Envío a domicilio`.
3. Intentar continuar sin dirección.

Resultado esperado:

- El checkout exige dirección.
- Aparece `Selecciona una dirección de entrega`.
- No se crea orden hasta seleccionar o completar dirección.

## Caso 6: Refresh Del Navegador

1. Seleccionar pickup.
2. Aceptar términos.
3. Refrescar el navegador.

Resultado esperado:

- El draft conserva `deliveryType`.
- La UI vuelve en pickup si el carrito sigue válido.
- No aparece error de dirección heredado.

## Caso 7: Doble Click En Pagar

1. Llegar a paso de pago.
2. Hacer doble click rápido en `Pagar`.

Resultado esperado:

- Solo se dispara una mutation.
- Solo se crea una orden por idempotency key.
- El botón queda en loading.
- No hay segundo link Wompi.

## Caso 8: Carrito Vacío O Sesión Expirada

Resultado esperado:

- Carrito vacío redirige a `/carrito`.
- Sesión expirada devuelve error de autenticación del backend y no genera orden ni link.

## Responsive Móvil

Validar en ancho móvil:

- Las cards de entrega se apilan correctamente.
- El bloque pickup mantiene spacing limpio.
- El sticky bottom usa el mismo estado loading que desktop.
- No hay overflow horizontal.

## Checklist Wompi

- Link se crea para pickup.
- Link se crea para delivery.
- `reference` coincide con `orderId`.
- `amount_in_cents` coincide con `order.total`.
- Redirect vuelve a `/payment/wompi/return`.
- Confirmación de pago no depende de dirección.
- Success page y detalle de orden muestran el método correcto.
