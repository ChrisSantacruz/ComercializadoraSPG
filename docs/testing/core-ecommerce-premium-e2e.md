# E2E manual — Core ecommerce premium

**Alcance:** detalle de producto, carrito, checkout (Wompi), perfil y dashboard.  
**Referencias:** `docs/roadmap/decisions.md` (DEC-LOAD-*, DEC-ERR-*, DEC-FORM-006, DEC-STATE-001), `docs/ui/design-system.md`.

---

## 1. Product detail

| Caso | Pasos | Resultado esperado |
|------|--------|----------------------|
| Imagen rota | Producto con URL inválida | `ProductImage` muestra fallback y estado “Sin imagen”; sin CLS brusco |
| Sin stock | `stock === 0` | Badge agotado, sin CTAs de compra, mensaje claro |
| Clics rápidos “Agregar” | Doble clic en Agregar al carrito | Un solo request efectivo por bloqueo `loading` en botón; un toast coherente con acción “Ver carrito” |
| Comprar ahora | Stock > 0 | `addToCart` silencioso y navegación a `/checkout` sin doble toast |
| Galería móvil | Deslizar en imagen principal | Cambia foto en carrusel por swipe |
| Lightbox | Clic en imagen principal | Modal con `object-contain`, navegación anterior/siguiente |
| Tabs | Teclado / lector de pantalla | Headless UI `Tabs`: foco y selección coherentes |

---

## 2. Carrito

| Caso | Pasos | Resultado esperado |
|------|--------|----------------------|
| Refresco | F5 en `/carrito` | `getCart` al servidor; skeleton si no hay caché; totales con `safeMoney` (no NaN) |
| Merge sesión | Login con carrito previo | Contrato backend prevalece; sin duplicar toasts por página + store |
| Spam cantidad | +/- rápido | Indicador por línea; errores visibles vía store + notificación |
| Quitar con cantidad 1 | Menos en qty 1 | Diálogo de confirmación (Modal), no `window.confirm` |
| Vaciar | Confirmar vaciado | Modal; loading en botón |
| Rutas | “Seguir comprando” | Enlace a `/productos` (no `/products`) |

---

## 3. Checkout (Wompi)

| Caso | Pasos | Resultado esperado |
|------|--------|----------------------|
| Carrito vacío | Entrar a `/checkout` sin líneas | Redirección a `/carrito` + mensaje de error |
| Doble submit | Doble clic en pagar | `paymentSubmitLock` + idempotencia ref (código existente) |
| Rechazo / timeout | Simular en sandbox | Páginas de retorno sin spinner infinito; estado alineado con backend |
| Atrás del navegador | Durante flujo | Sin pantalla en blanco; mensaje o paso recuperable |
| Webhook demorado | Orden pending | UI “verificación” sin marcar éxito hasta confirmación servidor |

---

## 4. Perfil y dashboard

| Caso | Pasos | Resultado esperado |
|------|--------|----------------------|
| Stats | Comerciante con datos | Cifras desde API; si falla, error honesto (no métricas inventadas) |
| Órdenes vacías | Cliente nuevo | Empty state claro |
| Tablet | 768–1024px | Layout sin solapamiento de tablas/cards |

---

## 5. Regresión global

- Sin `console.log` en flujos tocados.
- Sin emojis en UI de negocio (carrito/checkout).
- Tokens semánticos (sin `bg-[#…]` nuevo en vistas tocadas).
