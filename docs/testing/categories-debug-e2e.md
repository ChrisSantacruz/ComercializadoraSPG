# Checklist E2E/manual — categorías en creación de producto

**Fecha:** 2026-05-25  
**Flujo:** comerciante → Mis Productos → Nuevo Producto → Categoría.

## Happy Path

1. Iniciar backend y frontend.
2. Entrar con un usuario comerciante activo.
3. Abrir `Mis Productos`.
4. Seleccionar `Nuevo Producto`.
5. Confirmar que el selector muestra skeleton mientras carga.
6. Confirmar que aparecen las categorías activas.
7. Buscar por nombre, por ejemplo `hogar`.
8. Seleccionar una categoría con mouse.
9. Reabrir el selector y seleccionar otra con teclado.
10. Crear producto real y confirmar que se envía `categoria` como ObjectId.

## Endpoint

Validar:

```http
GET /api/categories/active
```

Respuesta esperada:

```json
{
  "success": true,
  "categories": []
}
```

La respuesta no debe ser array suelto ni `datos` anidado para este endpoint.

## Estados De QA

- Sin categorías activas: cambiar temporalmente categorías a `inactiva` en entorno local/staging y confirmar empty state con retry.
- Backend apagado: detener API y confirmar toast de error, panel visible y botón `Reintentar carga`.
- Timeout/red lenta: simular throttling o bloquear `/api/categories/active`; no debe quedar spinner infinito.
- 401/403: el endpoint es público; si aparece, revisar middleware/CORS porque el formulario debe mostrar el error real.
- Refresh navegador: recargar estando en el formulario y confirmar que la query vuelve a cargar categorías.
- Cache inválida: activar/desactivar una categoría y usar retry/refetch para confirmar estado actualizado.
- Merchant nuevo: el selector debe cargar categorías sin depender de permisos del comerciante.

## Validaciones Del Formulario

1. Intentar guardar mientras las categorías cargan.
2. Confirmar error `Espera a que terminen de cargar las categorías`.
3. Forzar fallo del endpoint.
4. Intentar guardar.
5. Confirmar error `Corrige la carga de categorías antes de guardar`.
6. Forzar respuesta vacía.
7. Confirmar que no se puede guardar sin categoría activa.

## Consola Y Red

- En production no deben aparecer logs de debug de categorías.
- En development puede aparecer un log estructurado `category_query_failed` sin tokens ni secretos.
- La pestaña Network debe mostrar `/api/categories/active` con timeout del cliente y respuesta cacheable.
- No debe haber CORS blocked para `REACT_APP_API_URL`.

## Responsive

Validar selector en:

- 320px.
- 375px.
- 768px.
- 1024px.
- 1440px.

El dropdown debe mantenerse dentro del ancho del formulario, sin overflow horizontal, con opciones legibles y estados táctiles utilizables.
