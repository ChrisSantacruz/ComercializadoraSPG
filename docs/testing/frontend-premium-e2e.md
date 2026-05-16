# E2E manual — frontend premium (Comercializadora SPG)

**Fecha:** 2026-05-14  
**Alcance:** rutas públicas prioritarias tras refactor visual y de catálogo.

## Preparación

- Backend accesible (`REACT_APP_API_URL`).
- `npm start` en `frontend/`.
- Navegador: Chrome + DevTools (throttling “Slow 3G” opcional).

## Checklist — Home (`/`)

- [ ] Hero legible en móvil (sin overflow horizontal); CTAs “Ver catálogo” y “Hablar con ventas”.
- [ ] Franja de confianza (3 tarjetas) sin gradientes agresivos.
- [ ] Categorías: enlaces a `/productos?categoria=<id>`; sin emojis como única UI.
- [ ] Tres rieles de productos: skeleton → datos o `ErrorState` con reintentar.
- [ ] “Agregar al carrito” en cards: toast de éxito / error visible.
- [ ] CTA final y footer con marca **Comercializadora SPG** (no “AndinoExpress”).

## Navbar / menú móvil

- [ ] Desktop: Inicio, Productos, Categorías (mega menú con categorías reales o fallback catálogo).
- [ ] Contacto enlaza a `/contacto`.
- [ ] Móvil: mismas rutas + lista de categorías; cerrar menú al navegar.
- [ ] Búsqueda en strip (si aplica): foco y teclado.

## Catálogo (`/productos`)

- [ ] Filtros visibles en **tablet** vía botón “Filtros” (`lg:hidden`).
- [ ] URL refleja `q`, `categoria`, `precioMin`, `precioMax`, `ordenar` (orden normalizado en serialización).
- [ ] Búsqueda con debounce (~300 ms): no dispara un request por tecla.
- [ ] Skeleton en carga inicial; sin spinner fullscreen infinito.
- [ ] Cards: `ProductCard` grid; enlaces “Ver” con `<Link>`; hover sutil (sin scale agresivo).
- [ ] “Cargar más” sin duplicar página; sin error silencioso.
- [ ] Vacío: `EmptyState` + limpiar filtros.

## Contacto (`/contacto`)

- [ ] Formulario valida campos requeridos; `mailto:` se abre con cuerpo prellenado.
- [ ] Sin `href="#"` en bloques tocados.

## Regresión rápida

- [ ] `/sobre-nosotros`, `/carrito`, `/login` abren sin error de consola por imports rotos.
- [ ] Resize ventana móvil → tablet → desktop sin overflow horizontal en Home y Catálogo.

## Notas

- Auditorías de referencia: `docs/audits/ui-system-audit.md`, `home-audit.md`, `products-audit.md`, `docs/roadmap/frontend-refactor-roadmap.md`.
- Los archivos `docs/audits/ui-audit.md` y `docs/audits/frontend-audit.md` **no existen** en el repo; se usaron los anteriores como fuente normativa.
