# Arquitectura de componentes (frontend)

## 1. Capas

| Capa | Carpeta | Responsabilidad |
|------|---------|-----------------|
| **UI primitivos** | `src/components/ui/` | Presentación reutilizable, a11y base, sin lógica de negocio |
| **Nav / marketing** | `src/components/nav/` | Piezas del header público (promo, categorías, búsqueda, móvil) |
| **Features / dominio** | `src/components/{forms,payment,dashboard,…}` | Reglas de negocio + composición |
| **Páginas** | `src/pages/` | Orquestación, rutas, fetching (idealmente delegado a hooks) |
| **Layouts** | `src/layouts/` | Shells (`PublicLayout`, `DashboardLayout`) |
| **Hooks** | `src/hooks/` | Estado y efectos compartidos (aumentar con el tiempo) |
| **Lib** | `src/lib/` | Utilidades puras (`cn`, `appNotifications`) |

## 2. Composición (Context7 / React)

- **Compound components** donde aporta claridad: `Card` + `CardHeader` | `CardBody` | `CardFooter`; `Table` + `THead` | `TR` | `TD`.
- **Headless + estilo:** Headless UI aporta foco, teclado y roles; el diseño vive en clases Tailwind tokenizadas.
- **Error boundaries:** seguir usando `ErrorBoundary` existente en puntos de lista/checkout según necesidad; no duplicar límites sin motivo.

## 3. Convenciones de import

Preferir barrel para UI nueva:

```ts
import { Button, Container, FormField, Input } from '../components/ui';
```

Imports directos a archivos siguen siendo válidos durante la migración.

## 4. Polimorfismo / `as`

`Button` es `<button>` nativo. Para enlaces estilo botón, usar `Link` con las mismas clases del primitivo o extender el `Button` con `as` en una iteración futura (DEC-FE-004).

## 5. Estado global vs UI

- **Zustand** (`stores/*`): estado de dominio (carrito, auth).
- **Notificaciones:** no deben vivir en stores; el sink `appNotifications` conecta dominio con `NotificationProvider` sin acoplar Zustand a React context en el store.

## 6. Deuda estructural documentada

- Páginas >250 LOC y duplicación de cards (ver `products-audit.md`, `home-audit.md`).
- `features/` y `sections/` por página: crear al partir `ProductsPage` / `NewHomePage` (DEC-FE-006).
