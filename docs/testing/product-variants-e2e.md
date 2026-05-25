# E2E manual — variantes de producto

## Datos de prueba

Crear tres productos:

- Camiseta: `Color = Negro, Blanco`, `Talla = S, M, XL`.
- Teléfono: `Almacenamiento = 128GB, 256GB`, `Versión = Pro, Pro Max`, `Color = Negro, Plata`.
- Zapatos: `Talla = 38, 39, 40`, `Color = Blanco, Negro`.

## Admin

1. Crear producto simple sin variantes y confirmar que se guarda como antes.
2. Crear producto con dos atributos y generar combinaciones.
3. Editar stock individual por variante.
4. Editar precio individual por variante.
5. Marcar variante default.
6. Desactivar una variante y confirmar que no aparece comprable.
7. Agregar URL de imagen en variante y verificar que se usa en PDP.
8. Editar producto existente con variantes y confirmar que no duplica combinaciones.

## PDP

1. Abrir producto con variantes.
2. Seleccionar color/talla/version.
3. Verificar cambio de precio.
4. Verificar cambio de stock.
5. Verificar cambio de SKU.
6. Verificar cambio de imagen si la variante tiene imagen.
7. Intentar seleccionar variante sin stock: debe verse deshabilitada.
8. Intentar agregar variante sin stock: no debe permitir compra.

## Carrito

1. Agregar camiseta negra XL.
2. Agregar camiseta negra M.
3. Confirmar que son líneas separadas.
4. Agregar nuevamente camiseta negra XL.
5. Confirmar que solo incrementa la línea negra XL.
6. Cambiar cantidad de una variante y confirmar rollback si backend rechaza stock.
7. Eliminar una variante y confirmar que no elimina otra del mismo producto.

## Checkout

1. Confirmar que cada línea muestra atributos seleccionados.
2. Confirmar que se envía `variantId` en la orden.
3. Crear orden con Wompi sandbox.
4. Confirmar que la orden conserva nombre, atributos, SKU, imagen y precio de variante.
5. Confirmar que el carrito se limpia solo después de crear link de pago.

## Pedido y stock

1. Confirmar pago aprobado en sandbox.
2. Verificar decremento de `Product.stock`.
3. Verificar decremento de `variants.$.stock`.
4. Reconciliar la misma transacción otra vez y confirmar que no descuenta doble.
5. Cancelar pedido confirmado en ambiente de prueba y validar devolución de stock simple/variante.

## Responsive

Probar sin overflow horizontal:

- 320px
- 375px
- 768px
- 1024px
- 1440px+

Rutas:

- Admin product form.
- PDP.
- Carrito.
- Checkout.
- Navbar merchant con Dashboard y Productos.
