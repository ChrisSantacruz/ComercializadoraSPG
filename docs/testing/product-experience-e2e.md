# E2E manual — experiencia producto / pedidos / perfil / carrito (enterprise)

**Fecha:** 2026-05-15  
**Contexto:** validación tras migración PDP + órdenes + carrito optimista + notificaciones (DEC-FE-007, DEC-DATA-001–005, DEC-ERR-001–005, DEC-LOAD-001–004).

---

## 1. Product Detail (PDP)

1. Abrir `/productos/:id` válido → ficha carga sin doble fetch manual de categoría (Query + `useCategoryQuery` cuando `categoria` es ID).
2. Red dimensionada tipo **tablet** (768–1024px): galería sticky en scroll, columnas `md:grid-cols-2`, CTA desktop vs barra fija móvil.
3. Barra CTA móvil: respeta **safe-area** inferior; no queda bajo el home indicator.
4. Productos relacionados:
   - Si el backend envía `productosRelacionados`, se usan.
   - Si no, `useRelatedProductsQuery` + skeleton mientras carga.
5. Imágenes relacionadas pasan por **`ProductImage`** (fallback coherente).
6. Error de red / 404: `ErrorDisplay` + reintento; sin spinners globales eternos.

---

## 2. Carrito

1. En `/carrito`, cambiar cantidades **rápido**: UI refleja cambio optimista; al fallar API, rollback + toast de error.
2. Quitar línea y vaciar carrito: mismos patrones (`onMutate` / rollback en mutaciones).
3. **Móvil:** resumen fijo inferior con `pb` extra en el `<main>` para no tapar contenido.
4. Dos pestañas abiertas: al actualizar en una, la otra se alinea tras refetch/`invalidate` (comprobar `onSettled`).

---

## 3. Pedidos (cliente)

1. `/orders`: primera carga → **skeleton**; error → `ErrorState`; refetch no bloquea lista completa (mensaje “Actualizando lista…”).
2. Tras **confirmar entrega** o **reseña**, la lista se invalida vía `queryKeys.orders`.
3. Detalle `/orders/:id`: skeleton inicial; si pago pendiente, **polling ~12s** hasta estado estable (no infinito si pago ya aprobado/rechazado).

---

## 4. Pedidos comerciante

1. Cambiar estado / agregar guía: mutación con **optimistic cache** + `invalidateQueries` en `onSettled`.
2. Contrato unificado con lista: `orderService.updateOrderStatusWithTracking` (misma ruta que la pantalla).

---

## 5. Perfil

1. Guardar perfil / subir avatar / banner → `invalidateQueries` sobre `queryKeys.profile` para otros consumidores Query futuros.

---

## 6. Notificaciones

1. Disparar el mismo mensaje dos veces seguidas → **no duplicar** toasts idénticos (mismo título/mensaje/tipo).
2. Comprobar posición con **safe-area** en esquina superior derecha.

---

## 7. Sesión y red

1. Throttling **Slow 3G**: operaciones muestran estados granulares, no pantalla en blanco.
2. **Offline** breve: al volver online, `refetchOnReconnect` (Query defaults) recupera datos donde aplique.
3. Refresh en checkout y **volver atrás** desde Wompi: sin pérdida silenciosa del detalle de pedido (invalidación coherente en flujos existentes).

---

## 8. Regresión build

- `npm run build` (CRA) exit 0, revisar **warnings ESLint** nuevos (no silenciar con desactivar reglas salvo justificación).
