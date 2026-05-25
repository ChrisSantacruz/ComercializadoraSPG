# Arquitectura de variantes de producto

## Contrato backend

`Product.variants` es un arreglo dinámico. Cada variante guarda:

- `sku`: opcional en el request; el backend lo genera si falta.
- `attributes`: mapa libre de atributos visibles (`color`, `talla`, `version`, `almacenamiento`, `material`, etc.).
- `precio`, `precioOferta`, `stock`, `imagenes`, `activo`, `isDefault`.

No se limita a ropa. El mismo contrato cubre tecnología, calzado, hogar, belleza y electrodomésticos.

## Reglas de consistencia

- No puede haber dos variantes con la misma combinación normalizada de atributos.
- Si ninguna variante viene marcada como default, el backend marca la primera activa.
- Cuando existen variantes activas, `Product.stock` se deriva de la suma del stock de variantes.
- El precio base del producto se actualiza al menor precio vendible de variantes activas.
- La imagen principal puede salir de la variante default si tiene imágenes.

## Carrito y pedidos

Cada línea de carrito conserva `variantId` y un snapshot `variante` con `sku`, `attributes` e `imagen`.

El merge del carrito usa `producto + variantId`; dos tallas o colores distintos no se mezclan. El checkout envía el `variantId` y el pedido guarda el mismo snapshot histórico para que la compra no cambie si el comerciante edita el producto después.

## Wompi y stock

La orden valida stock antes de crear el pago, pero el descuento real de stock sigue ocurriendo cuando Wompi confirma `APPROVED`.

Para productos con variante, `wompiOrderSync` descuenta:

- `Product.stock`
- `variants.$.stock`
- `estadisticas.cantidadVendida`

El flujo sigue siendo idempotente: si la orden ya está confirmada, no descuenta dos veces.

## TanStack Query

La arquitectura existente se mantiene:

- `queryKeys.products.detail(id)` para PDP.
- `queryKeys.cart.current()` para carrito.
- Mutaciones de carrito hacen optimistic update con snapshot y rollback.
- `onSettled` invalida `queryKeys.cart.all`.

Referencia Context7 usada: TanStack Query v5 recomienda cancelar queries en `onMutate`, guardar snapshot, aplicar cache optimistic, restaurar en `onError` e invalidar en `onSettled`.

## UX

PDP:

- Selector por atributo con pills accesibles.
- Variantes sin stock aparecen deshabilitadas.
- Precio, stock, SKU e imágenes cambian con la variante seleccionada.
- CTA no permite agregar variantes sin stock.

Admin:

- Variant Builder con atributos dinámicos.
- Generación automática por combinaciones.
- Tabla desktop y cards mobile.
- Edición por variante de SKU, precio, precio oferta, stock, imagen y estado.

## Riesgos restantes

- Las imágenes por variante aceptan URL en el builder actual. Subida directa de archivo por variante requiere extender multer con asignación `variantId -> file`.
- El formulario conserva especificaciones existentes, pero ya no expone campos técnicos de SEO/SKU interno en la UI.
- El backend tiene deuda histórica de logs y respuestas mixtas `exito/success`; esta implementación no cambia ese contrato global.
