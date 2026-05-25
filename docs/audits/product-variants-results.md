# Resultados — variantes de producto

## Implementado

- Modelo `Product` con variantes dinámicas, SKU automático, combinación única, default variant, stock y precio derivados.
- Carrito con snapshot de variante y merge por `producto + variantId`.
- Checkout envía `variantId` y muestra atributos/SKU en el resumen.
- Pedido guarda snapshot histórico de variante.
- Sincronización Wompi descuenta stock por variante en pagos aprobados.
- PDP selecciona variante, cambia precio, stock, SKU e imágenes.
- Admin reemplaza secciones técnicas por Variant Builder.
- Navbar de merchant corregida: `/merchant/products` ya no activa `Dashboard`.

## Limpieza visual

- Se quitó el bloque informativo de precio de descuento que exponía detalles de contrato interno.
- Se retiraron las secciones de SEO/metadatos y estado/publicación del formulario de comerciante.
- El cuadro de inventario quedó dentro del layout de precio con estructura consistente.
- Se eliminó el emoji visible en checkout para recogida en establecimiento.

## Decisiones

- El sistema permite atributos arbitrarios, no solo color/talla.
- Productos sin variantes conservan el comportamiento anterior.
- Productos con variantes calculan disponibilidad desde variantes activas.
- No se agregó una dependencia nueva; el diseño usa primitivos existentes, Heroicons y tokens Tailwind del repo.

## Riesgos

- Falta subida de archivo por variante en admin; hoy se registra URL de imagen por variante.
- La edición de imágenes persistidas sigue limitada por el contrato previo del formulario.
- Debe validarse Wompi en sandbox porque el descuento de stock ahora toca subdocumentos de variantes.
- Las pantallas de detalle de pedido fuera de checkout pueden necesitar una pasada visual adicional para destacar atributos de variante.
