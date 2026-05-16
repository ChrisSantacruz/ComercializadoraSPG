# Auditoría final — polish visual y responsive (frontend)

**Fecha:** 2026-05-15  
**Alcance:** solo UI responsive, spacing, densidad y feedback (toasts/modales); sin backend ni refactors arquitectónicos.  
**Referencias leídas:** `docs/ui/*`, muestreo de `docs/audits/*`, `docs/testing/*`, `docs/performance/*`, `docs/roadmap/decisions.md`.

---

## Context7 (Tailwind / shadcn / React)

- **Tailwind** (`/websites/tailwindcss`): breakpoints mobile-first (`sm`…`2xl`), grids y variantes responsivas.
- **shadcn** (`/websites/ui_shadcn`): patrón Dialog en desktop + Drawer en móvil, sheets con `max-h` y scroll interno.
- **React** (`/websites/react_dev`): composición con `children` para shells y tarjetas.

## MCP adicional

- **Magic MCP:** invocado (`21st_magic_component_refiner`) para toasts; el servicio respondió error de carga (no se aplicó salida externa).
- **shadcn MCP:** no aparece como servidor MCP en este workspace; se usó Context7 para documentación shadcn/ui.

---

## Cambios aplicados (resumen)

### Layout público

- `PublicLayout`: `pt-32` fijo sustituido por padding **responsive** alineado a alturas reales del header (promo solo `md+`) + `env(safe-area-inset-top)`; contenedor fijo con `z-nav` y safe-area superior.
- `index.css`: `overflow-x: clip` en `html`/`body`; `@keyframes toast-progress` para barra de dismiss.

### Panel de cuenta (`DashboardLayout`)

- **Sidebar oculto en móvil** (`lg:hidden` / `hidden lg:block`); navegación móvil en **Drawer** Headless (izquierda).
- **Iconografía Heroicons** coherente (sin emojis en nav); marca **`BRAND_NAME`** desde `navData` (reemplazo de copy legacy).
- Header compacto sticky, densidad y `min-w-0` para evitar desbordes de texto.

### Toasts (`NotificationContainer` + `NotificationToast`)

- **Cola única** mantenida; contenedor con `pointer-events-none` e hijos `pointer-events-auto`.
- **Móvil:** anclaje inferior con márgenes y **safe-area**; **desktop:** esquina superior derecha.
- Toast **más denso**: tipografía `text-sm`/`text-xs`, iconos compactos, sombra `shadow-soft`, sin gradientes llamativos.
- **Barra de progreso** corregida con animación `scaleX` + `transform-origin: left` (antes la lógica de ancho era incoherente).

### Modales y drawers

- `Modal`: `max-h` con `dvh` + scroll interno para evitar modales que excedan el viewport en móvil.
- `Drawer`: padding `p-4 sm:p-6` + safe-area; `Sheet`: padding mobile reducido.

### Checkout y catálogo

- Barra fija inferior checkout: **`z-dropdown`**, **safe-area inferior**, padding inferior explícito; página con más `pb` en viewport pequeño.
- `ProductsPage`: panel de filtros con padding mobile menor y `max-h` sticky más estable (`dvh`/fallback).

### Otros

- `NetworkStatusBanner`: `z-[55]` para quedar **por debajo** de toasts (`z-toast`).
- `NavbarMobileMenu`: **scroll** acotado (`max-height` + `overscroll-contain`).
- `SupportChat`: FAB con safe-area, hover menos agresivo, panel con ancho máximo fluido en móvil.

---

## Riesgos / seguimiento

- Toasts en móvil comparten la zona inferior con **bars fijas** (carrito, checkout, chat); si hay solapamiento en casos extremos, valorar `bottom` dinámico o una sola “capa” de chrome inferior por ruta.
- **Bundle:** `NotificationToast` importa Heroicons **solid**; si el tamaño del bundle importa, valorar `@heroicons/react/24/outline` o iconos compartidos.

---

## Verificación

- `npm run build` en `frontend/` — **OK** (warnings ESLint preexistentes en otros archivos).

---

## Pantallas prioritarias tocadas directamente

Navbar (vía layout público), menú móvil, checkout, carrito (sin cambio estructural en esta pasada), catálogo/filtros, dashboard shell, sistema de toasts, modales/drawer base, chat de soporte (FAB/panel).
