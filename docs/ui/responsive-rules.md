# Reglas responsive (DEC-RESP-001…004)

## DEC-RESP-001 — Mobile first

- Definir estilos base para viewport estrecho; añadir `sm:`, `md:`, `lg:` solo cuando haya un salto de diseño real.
- Evitar anchos fijos en px para contenedores principales; preferir `max-w-*`, `%`, `min-w-0` en flex.

## DEC-RESP-002 — Contenedor único

- **Canónico:** `Container` (`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`) o utilidades equivalentes documentadas.
- **Evitar:** mezclar `.container` personalizado con `max-w-7xl` (el override global fue retirado de `index.css`).

## DEC-RESP-003 — Tablet y filtros (catálogo)

- El catálogo aún debe migrar drawer de filtros en `md` (pendiente en `ProductsPage`; ver `products-audit.md` M8).
- Cualquier nuevo listado con sidebar: en `md` debe existir acceso a filtros (drawer o columna).

## DEC-RESP-004 — Navbar fijo y “saltos”

- `PublicLayout` mantiene compensación superior (`pt-*`) coherente con la altura real del header; al cambiar el navbar, revisar **una sola vez** el offset en layout + hero (`min-h` con `svh` recomendado en home-audit).
- No repartir `pt` hacks entre página y layout sin documentar.

## Breakpoints (Tailwind default)

| Token | Ancho |
|-------|--------|
| `sm` | 640px |
| `md` | 768px |
| `lg` | 1024px |
| `xl` | 1280px |
| `2xl` | 1536px |

## Z-index

Usar solo la escala del tema: `z-nav`, `z-dropdown`, `z-modal`, `z-toast` para evitar guerras de apilamiento.
