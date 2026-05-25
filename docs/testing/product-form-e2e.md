# Checklist E2E/manual — formulario de productos

**Fecha:** 2026-05-25  
**Flujo:** comerciante → Mis Productos → Nuevo producto / Editar producto.

## Crear Producto

1. Abrir `Mis Productos`.
2. Seleccionar `Nuevo Producto`.
3. Verificar header con breadcrumb `Productos / Nuevo producto`.
4. Completar nombre, descripción, precio, stock y categoría.
5. Agregar etiquetas con Enter y coma.
6. Agregar especificaciones: color, tamaño, material, marca, SKU, opciones.
7. Subir varias imágenes.
8. Reordenar imágenes nuevas.
9. Eliminar una imagen nueva.
10. Guardar una sola vez y verificar que el botón queda deshabilitado mientras guarda.
11. Confirmar retorno a listado y mensaje de éxito existente.

## Editar Producto

1. Abrir un producto existente desde `Mis Productos`.
2. Verificar que nombre, descripción, precio, stock, categoría, tags y especificaciones se hidratan.
3. Verificar que las imágenes actuales aparecen como persistidas.
4. Agregar una imagen nueva.
5. Quitar la imagen nueva antes de guardar.
6. Cambiar un campo de texto y guardar.
7. Confirmar que no se eliminan imágenes existentes accidentalmente.

## Upload

1. Click en dropzone abre selector de archivos.
2. Drag and drop agrega imágenes.
3. Archivos no imagen se ignoran.
4. La primera imagen nueva aparece como portada visual.
5. Botones subir/bajar respetan límites de primera y última posición.
6. El botón eliminar quita solo imágenes nuevas.
7. Navegar fuera del formulario no deja previews rotas.

## Validaciones

1. Intentar guardar vacío.
2. Verificar toast de advertencia.
3. Verificar scroll al primer error.
4. Verificar focus automático en el primer campo inválido.
5. Probar precio `0`.
6. Probar stock negativo.
7. Probar sin categoría.
8. Corregir campo y verificar que el error desaparece.

## Responsive

Validar sin overflow horizontal en:

- 320px.
- 375px.
- 768px tablet.
- 1024px laptop.
- 1440px desktop.
- 1536px+ ultra wide.

Puntos críticos:

- Header no debe cortar acciones.
- Sidebar debe desaparecer en mobile/tablet pequeña.
- Barra inferior sticky debe mostrar dos botones completos.
- Dropzone y previews deben mantenerse dentro del viewport.
- Grids internos no deben forzar ancho mínimo.

## Doble Submit

1. Completar formulario válido.
2. Hacer doble click rápido en guardar.
3. Confirmar que solo se dispara una mutación visible.
4. Confirmar que todos los botones de guardar quedan disabled/loading durante `isLoading`.

## Refresh Durante Edición

1. Abrir un producto existente.
2. Modificar campos sin guardar.
3. Refrescar la página.
4. Confirmar que se recargan datos persistidos desde backend y no se envían cambios parciales.

## Limitaciones Conocidas

- El formulario no elimina imágenes ya persistidas porque no hay contrato estable para esa operación en el flujo principal.
- `precioOferta` no se envía porque el controlador actual no lo persiste.
- Variantes reales no existen como contrato; opciones se guardan como `especificaciones`.
