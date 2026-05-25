# Auditoría — flujo de categorías

**Fecha:** 2026-05-25  
**Alcance:** creación de productos, categorías activas, API, TanStack Query, estado visual y contrato frontend/backend.

## Causa Raíz

La base de datos sí tiene categorías: se verificaron 15 documentos en `Category`, todos con `estado: "activa"`. El problema no era ausencia de datos.

La falla principal estaba en el contrato y en el manejo silencioso del frontend:

- `GET /api/categories/active` reutilizaba el controlador genérico `obtenerCategorias`, por lo que no existía contrato dedicado para el flujo crítico de creación de producto.
- El frontend podía convertir respuestas no esperadas en `[]` (`Array.isArray(raw) ? raw : []`), ocultando errores de contrato como si no existieran categorías.
- `ProductForm` no usaba el hook de TanStack Query disponible; cargaba categorías con una caché manual local y mostraba un select deshabilitado con un mensaje genérico.
- El selector no tenía retry manual, estado vacío robusto ni toast visible para errores de red/API.

## Fix Aplicado

- Se creó un controlador dedicado para `GET /api/categories/active`.
- El endpoint devuelve el contrato canónico:

```json
{
  "success": true,
  "categories": []
}
```

- El endpoint filtra únicamente `estado: "activa"`, ordena por `orden` y `nombre`, y expone campos públicos.
- Se agregó `Cache-Control: public, max-age=60, stale-while-revalidate=300`.
- El servicio frontend parsea explícitamente el contrato canónico y mantiene compatibilidad temporal con `exito/datos`.
- `useActiveCategoriesQuery` dejó de convertir respuestas inválidas en `[]`.
- `ProductForm` ahora usa TanStack Query para categorías activas y bloquea el submit cuando la carga falla, está pendiente o no hay categorías activas.
- El selector se reemplazó por un Combobox searchable con Headless UI, Heroicons, keyboard navigation, skeleton, error state, empty state y retry.
- Se agregan toasts de error reales y logs estructurados solo en development.

## Endpoint

`GET /api/categories/active`

Propiedades:

- Público, sin token requerido.
- Solo categorías activas.
- Respuesta estable con `success` y `categories`.
- Cacheable por navegador/CDN.
- Sin arrays sueltos ni `data.data.data`.

## Query E Invalidation

Query key usada:

```ts
queryKeys.categories.active()
```

TanStack Query conserva `staleTime` de 5 minutos para taxonomías. El retry global evita reintentar errores 4xx y solo reintenta fallos transitorios.

El retry manual del formulario llama `refetch()` sobre la misma query key, sin recargar la página ni crear una caché paralela.

## Edge Cases Revisados

- Sin categorías: estado vacío visible y submit bloqueado.
- Categorías inactivas: no aparecen porque el backend filtra `estado: "activa"`.
- Backend apagado o timeout: error visible, toast y botón reintentar.
- 401/403: el endpoint público no debe requerir auth; si CORS/auth fallan, el error ya no se degrada a lista vacía.
- Refresh navegador: Query vuelve a hidratar desde el endpoint activo.
- Merchant nuevo: no depende de permisos de merchant para listar categorías activas.
- Contrato inválido: el parser lanza error visible en lugar de devolver `[]`.

## Riesgos Restantes

- El helper global `handleApiResponse` sigue usando el contrato legado `exito/datos`; el endpoint activo usa parser dedicado para evitar romper otros servicios.
- La caché manual `activeCategoriesResource` aún existe para otros flujos, pero ahora recibe datos desde el parser estricto de `categoryService`.
- Los slugs existentes perdieron acentos por el generador actual (`decoracin`, `tecnologa`); no bloquea el selector porque la UI muestra `nombre`.

## Validación Ejecutada

- Base de datos local: 15 categorías, todas `estado: "activa"`.
- `npm run build` en `frontend/`: OK.
- Backend local: arranca en `5001` y conecta MongoDB.
- `GET /api/health`: OK.
- `GET /api/categories/active`: `success: true`, 15 categorías.
- Smoke real de creación por API: `POST /api/products` respondió `201`, persistió la categoría enviada y el producto temporal fue eliminado después de la prueba.

No se validó visualmente en navegador real desde esta sesión; el checklist responsive y de consola queda en `docs/testing/categories-debug-e2e.md` para QA manual.
