# Auditoría — Product Form premium

**Fecha:** 2026-05-25  
**Alcance:** `frontend/src/components/forms/ProductForm.tsx` y subcomponentes en `frontend/src/components/forms/product-form/`.

## Resultado

El formulario de creación/edición de productos fue rediseñado como pantalla de administración premium:

- Header enterprise con breadcrumb, título, subtítulo, estado del borrador y acciones primarias.
- Layout responsive con contenido principal y sidebar sticky en desktop.
- Barra sticky inferior en mobile para evitar botones cortados.
- Secciones agrupadas: información general, multimedia, precio e inventario, categorías y etiquetas, variantes/opciones, SEO y metadata, estado/publicación.
- Inputs migrados a primitivas del design system (`Button`, `Input`, `Textarea`, `Select`, `FormField`, `Badge`, `Card`).
- Upload de imágenes con drag and drop, preview, portada visual, eliminación de imágenes nuevas y reordenamiento por teclado/botón.

## Contrato y validaciones

Se mantienen los nombres enviados al API:

- `nombre`
- `descripcion`
- `precio`
- `stock`
- `categoria`
- `tags`
- `especificaciones`
- `imagenes`

No se agregaron campos nuevos al `FormData`. Los metadatos visuales como SKU, SEO y opciones se guardan dentro de `especificaciones`, que ya existía como contrato flexible.

Validaciones preservadas y mejoradas visualmente:

- Nombre requerido.
- Descripción requerida.
- Precio mayor a 0.
- Stock no negativo.
- Categoría requerida.
- Scroll y focus automático al primer campo inválido.
- Toast de advertencia usando el sistema unificado de notificaciones.
- Prevención de doble submit mediante bloqueo local y `isLoading`.

## Edge Cases Tratados

- Categorías: se eliminó el fallback de ObjectIds falsos. Si el API falla, el select queda deshabilitado y se informa el problema.
- Imágenes nuevas: se revocan `ObjectURL` al eliminar o desmontar para evitar fugas de memoria.
- Edición con imágenes existentes: se muestran como imágenes actuales sin inventar un contrato de eliminación.
- Reordenamiento: solo afecta imágenes nuevas antes del submit.
- Producto sin imágenes: no se muestra placeholder como si fuera imagen persistida.
- `especificaciones` soporta forma objeto y arreglo `{ nombre, valor }`.

## Responsive

Revisado en diseño para:

- 320px: layout en stack, inputs full width, acciones sticky inferiores.
- 375px: se mantienen paddings compactos y grids de imagen en 2 columnas.
- Tablet: secciones en stack con grids internos de 2 columnas cuando hay espacio.
- Laptop/desktop: dos columnas con sidebar sticky de 320px.
- Ultra wide: contenedor limitado a `max-w-7xl`.

Se aplicaron `min-w-0`, grids fluidos, `100svh` y botones full width en mobile para evitar overflow horizontal.

## Performance

- El estado del formulario queda local y acotado.
- Handlers principales usan `useCallback`.
- Previews de imágenes usan URLs temporales controladas y limpieza explícita.
- No se agregaron dependencias.
- Incremento de bundle observado en build: `main` +1.95 kB gzip y chunk del formulario +7.96 kB gzip, aceptable para el rediseño.

## Deuda Restante

- El backend tiene modelo/validación para `precioOferta`, pero los controladores actuales no lo persisten en crear/editar; por eso no se envía desde el formulario.
- No existe contrato para eliminar imágenes ya guardadas desde el formulario principal.
- No existe contrato real de variantes; se modelan como `especificaciones`.
- `ProductFormMainSections.tsx` concentra varias secciones y puede dividirse más si crece.
- La validación backend exige descripción mínima de 10 caracteres, pero el formulario heredado solo requería no vacío; no se endureció para no cambiar comportamiento.

## Validación Ejecutada

- `npm run build` en `frontend/`: OK.
- Warnings: Browserslist/caniuse-lite desactualizado, no introducido por este cambio.
