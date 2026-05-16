# Design system — Comercializadora SPG (frontend)

**Estado:** fase 1 implementada en código (`frontend/src/components/ui/`, tokens Tailwind corregidos, notificaciones unificadas).  
**Referencias:** `docs/audits/ui-system-audit.md`, `docs/roadmap/ui-system-roadmap.md`, decisiones DEC-UI-001…008.

---

## 1. Principios

1. **Tokens semánticos** (DEC-UI-001): en código nuevo, usar `primary-*`, `secondary-*`, `accent-*`, `gray-*`, `success|error|warning`, no `bg-[#…]` salvo transición documentada.
2. **Una fuente de verdad de tema** (DEC-UI-002): `tailwind.config.js` sin claves duplicadas; `display` usa **Montserrat** (alineado con fuentes cargadas en `index.css`).
3. **Primitivos obligatorios** (DEC-UI-003): botones, campos y feedback pasan por `components/ui/*`.
4. **Notificaciones** (DEC-UI-004 / UD1): canal único — `NotificationProvider` + `useNotifications` / `useToast`; stores no acoplados a React usan `registerAppNotificationSink` vía `lib/appNotifications.ts` (carrito).
5. **Iconos** (DEC-UI-005): **Heroicons** como set principal en navbar refactor; evitar emojis como UI.
6. **Marca** (DEC-UI-008): copy de navbar centralizado en `components/nav/navData.ts` (`BRAND_NAME`, `BRAND_TAGLINE`).

---

## 2. Tokens (Tailwind)

| Token | Uso |
|--------|-----|
| `primary-*` | Marca turquesa, CTAs secundarios, focos |
| `secondary-*` | Acento naranja, CTAs primarios de alto contraste |
| `accent-*` | Verde oscuro (promo bar, superficies oscuras) |
| `gray-*` | Neutros UI |
| `success|warning|error` | Estados semánticos |
| `shadow-soft|medium|strong` | Elevación |
| `z-nav`, `z-dropdown`, `z-modal`, `z-toast` | Apilamiento |

**CSS global:** se eliminó el override `.container { max-width: 1200px }` que pisaba Tailwind; usar `Container` o `max-w-7xl` (DEC-RESP-002).

---

## 3. Componentes exportados

Barrel: `frontend/src/components/ui/index.ts`.

Incluye: `Button`, `Input`, `Textarea`, `Select`, `Checkbox`, `Radio`, `Switch`, `Modal`, `Dialog`, `Drawer`, `Sheet`, `Tooltip`, `DropdownMenu`, `Badge`, `Card` (+ header/body/footer), `Skeleton` (+ `SkeletonText`), `Spinner`, `EmptyState`, `ErrorState`, `Tabs`, `Pagination`, `Table` (+ `THead`…), `Avatar`, `Container`, `Section`, `PageHeader`, `FormField`, notificaciones, layout legacy (`Navbar`, `Footer`, etc.).

---

## 4. Patrones Radix / shadcn (equivalente en este repo)

No se añadió Radix ni shadcn para no inflar dependencias: **@headlessui/react** (ya en el proyecto) cubre `Dialog`/`Modal`, `Drawer`/`Sheet`, `Menu` (`DropdownMenu`), `Tabs`. Estilo vía utilidades Tailwind + tokens (patrón “headless + tokens”, similar a shadcn sin copiar su árbol de archivos).

---

## 5. Migración incremental

Regla Boy Scout: al tocar una página, sustituir botones/inputs duplicados por primitivos y eliminar hex donde sea trivial.

**Pendiente de alto impacto:** `ProductsPage`, `ProductDetailPage`, `NewHomePage`, `DashboardLayout`, formularios en `components/forms/*` (ver `frontend-refactor-roadmap.md`).

---

## 6. Changelog interno

- Eliminado `react-hot-toast` del `package.json` (carrito migrado al sink).
- Eliminados `NotificationCard.tsx` y `useNotificationCard.tsx` (código muerto, sin imports).
- Corregido `accent` duplicado y `fontFamily` duplicado en Tailwind.
