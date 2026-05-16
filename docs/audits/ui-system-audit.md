# Auditoría global — sistema UI (frontend)

**Alcance:** `frontend/src` (React + TypeScript + Tailwind CSS 3.4).  
**Fecha:** 2026-05-11  
**Objetivo:** inventario de duplicación/inconsistencias y base para un **design system** reutilizable.  
**Nota:** no se implementaron cambios; este documento es solo diagnóstico y planificación.

---

## 1. Resumen ejecutivo

El frontend **no tiene una capa de primitivas UI** (Button, Input, Card, Modal, Table, EmptyState, etc.). Casi todo el UI está **inline en páginas** con clases Tailwind repetidas, más **CSS global** (`index.css`) que redefine utilidades y define botones/cards “a mano”.

Hallazgos críticos para coherencia y mantenimiento:

| Área | Severidad | Resumen |
|------|-----------|---------|
| **Tokens de color en Tailwind** | Alta | Clave `accent` duplicada en `tailwind.config.js` (la segunda definición **pisa** la primera). `fontFamily` también está duplicado en `extend`. |
| **Colores** | Alta | Conviven tokens (`primary-*`, `secondary-*`), hex arbitrarios (`bg-[#0d8e76]`, etc.) y clases legacy en `index.css` (`.bg-naranja`). |
| **Notificaciones / toasts** | Alta | Hay **tres** mecanismos: `NotificationProvider` + `NotificationToast`, `useNotificationCard` + `NotificationCard`, y `react-hot-toast` en `cartStore` **sin** `<Toaster />` montado en la app. Además, `useNotificationCard` se usa en checkout/Wompi **sin renderizar** `NotificationCardContainer` → las notificaciones de ese hook **no tienen superficie visible**. |
| **Navegación** | Media | Público: `Navbar` fijo + `Footer`. Autenticado: `DashboardLayout` (header + sidebar + emojis). Patrones, densidad y marca no están alineados. |
| **Páginas duplicadas / muertas** | Media | `HomePage` importado en rutas pero **no usado**; índice usa `NewHomePage`. Tres variantes de retorno Wompi en `pages/checkout` y `pages/payment`. |
| **Tipografía** | Media | `Inter` + `Montserrat` en CSS global; `tailwind.config` también declara `Poppins` para `font-display` pero **no se importa** en `index.css`. |
| **Dependencias UI** | Baja | `@headlessui/react` está en `package.json` pero **no hay usos** en `src` (candidata a uso futuro para modales/menús accesibles o a limpieza). |

---

## 2. Metodología

1. Mapeo de carpetas: `components/`, `pages/`, `layouts/`, `hooks/`, `stores/`, `routes/`.  
2. Búsqueda semántica y por patrón: `<button`, `<input`, overlays (`fixed inset`), spinners, toasts, vacíos, sombras, anchos máximos, hex en clases.  
3. Lectura de archivos de diseño: `tailwind.config.js`, `index.css`, layouts principales, sistema de notificaciones.  
4. Cruce con rutas en `AppRoutes.tsx` para detectar código muerto o rutas duplicadas.

---

## 3. Inventario de “componentes” actuales

### 3.1 Carpeta `components/ui` (lo más cercano a un kit)

| Archivo | Rol actual | Observación |
|---------|------------|-------------|
| `Navbar.tsx` | Navegación pública masiva | Muchos hex hardcodeados, mega-componente. |
| `Footer.tsx` | Pie global | Similar: layout + enlaces en un solo archivo. |
| `LoadingSpinner.tsx` | Loader SVG | **Bien**: props `size` / `color` (único primitivo claro). |
| `ErrorDisplay.tsx` | Pantalla de error | Botones con `bg-blue-600` (desalineado con marca). |
| `ErrorBoundary.tsx` | Límite de error | Usa `.btn-primary` global. |
| `NotificationContainer.tsx` + `NotificationToast.tsx` | Toasts globales (context) | Posición fija `top-6 right-6`. |
| `NotificationCard.tsx` | Variante de notificación | Usada vía `useNotificationCard` (estado local). |
| `ProductImage.tsx` | Imagen + placeholder `animate-pulse` | Patrón de skeleton **solo aquí** de forma explícita. |

No existen: `Button`, `TextField`, `Select`, `Card`, `Modal`, `Badge`, `Table`, `PageHeader`, `EmptyState`, `Skeleton`.

### 3.2 Otros componentes por dominio

- **`components/forms/`**: `AddressForm`, `ProductForm`, `ReviewForm`, `DeliveryConfirmationForm` — formularios grandes con inputs repetidos.  
- **`components/auth/`**: `SocialLoginButtons`.  
- **`components/payment/`**: `WompiPayment`.  
- **`components/charts/`**, **`dashboard/`**, **`profile/`**, **`support/`**: widgets y features acoplados a negocio.

### 3.3 Páginas (alto acoplamiento UI + lógica)

Archivos muy grandes (cientos o miles de líneas) con layout, cards, listas y modales inline: por ejemplo `CheckoutPage.tsx`, `ProfilePage.tsx`, `MerchantDashboard.tsx`, `ProductsPage.tsx`, `ProductDetailPage.tsx`, `MerchantOrders.tsx`, etc.

---

## 4. Duplicados y oportunidades de extracción

### 4.1 Botones

- **Estimación:** decenas de `<button>` con clases Tailwind distintas en casi todas las páginas listadas en el grep de `<button` (auth, merchant, cart, checkout, orders, products, profile, etc.).  
- **Conviven:**  
  - Clases utilitarias largas (`px-4 py-2 rounded-md bg-…`).  
  - Clase global `.btn-primary` / `.btn-secondary` en `index.css` (colores fijos en hex).  
- **Oportunidad:** un `<Button variant="primary|secondary|ghost|danger" size="sm|md|lg" />` que mapee a tokens semánticos (`primary`, `secondary`, `destructive`), estados `disabled`/`loading`, y `asChild` opcional si se adopta un patrón tipo Radix/Slot más adelante.

### 4.2 Cards / contenedores

- Patrones repetidos: `bg-white rounded-lg shadow-md border border-gray-200 p-6` (y variantes `shadow-sm`, `shadow-lg`, `rounded-xl`).  
- Clase global `.card` en `index.css` **poco usada** frente a Tailwind inline.  
- **Oportunidad:** `<Card>`, `<CardHeader>`, `<CardBody>`, `<CardFooter>` o un solo `Surface` con props `elevation`, `padding`.

### 4.3 Inputs, selects, textareas

- Inputs dispersos en: auth, checkout, forms, merchant, orders, profile, navbar (búsqueda), support.  
- Estilos de borde/radio repetidos (`border-gray-300 rounded-lg`, etc.).  
- **Oportunidad:** `TextField`, `TextArea`, `Select` (nativo o Headless Listbox), `Checkbox`, `Label`, `FieldError` integrados con `react-hook-form` ya presente.

### 4.4 Modales / overlays

- No hay uso de `@headlessui/react` en el código.  
- Overlays tipo `fixed inset-0` aparecen en al menos: `MerchantOrders`, `WompiPayment`, `DeliveryConfirmationForm`, `ReviewForm` (grep de `fixed inset`).  
- Implementaciones **ad hoc** (riesgo: foco, `aria-*`, scroll lock, Escape).  
- **Oportunidad:** `Modal` / `Dialog` único (idealmente Headless UI o similar) + `ConfirmDialog`.

### 4.5 Tablas / listas densas

- No hay `<table>` HTML en el proyecto; las “tablas” son **listas con grid/flex** (pedidos, productos, etc.).  
- **Oportunidad:** `DataTable` genérico (sort, empty, loading row) **o** `StackedList` + `Row` para mobile-first, según el patrón real de datos.

### 4.6 Layouts repetidos

- Repetición de: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`, grids `md:grid-cols-2 lg:grid-cols-3`, secciones con título + subtítulo + CTA.  
- **Oportunidad:** `PageShell`, `Section`, `PageHeader`, `ContentContainer` (max-width + padding consistente).

### 4.7 Archivos / rutas duplicadas o muertas (deuda UI + deuda de producto)

| Item | Ubicación | Problema |
|------|-----------|----------|
| `HomePage` vs `NewHomePage` | `pages/` + `AppRoutes.tsx` | `HomePage` **importado y no usado** en la ruta `/` (código muerto; dos implementaciones de home). |
| Wompi return | `checkout/WompiReturnPage.tsx`, `checkout/WompiReturnPageFixed.tsx`, `payment/WompiReturnPage.tsx` | Tres implementaciones; rutas públicas usan solo `WompiReturnPageFixed`. Riesgo de divergencia y confusión para quien mantenga UI de pagos. |

### 4.8 Páginas placeholder

- `AddressesPage.tsx` y `FavoritesPage.tsx`: solo título + `container` — **inconsistentes** con el resto del dashboard y con expectativas de usuario.

---

## 5. Inconsistencias de diseño (tokens y estilo)

### 5.1 Tailwind `theme.extend`

- **`colors.accent` definido dos veces** — la segunda entrada (escala índigo) **reemplaza** la primera (verde oscuro corporativo). Cualquier `accent-*` en componentes puede no ser el color esperado.  
- **`fontFamily` duplicado** en `extend` — la segunda entrada redefine el bloque; hay riesgo de configuración confusa (`montserrat`/`inter` vs `sans`/`display`).

### 5.2 `index.css`

- Importa **Montserrat + Inter**; no importa **Poppins** aunque `font-display` la referencia.  
- **Reimplementa utilidades** que ya existen en Tailwind (`.text-3xl`, `.mb-8`, `.py-8`, `.px-4`, `.font-bold`, `.text-center`) → riesgo de **doble fuente de verdad** y sorpresas al migrar.  
- **Hero / gradientes** (`hero-gradient` con morados/rosas) **no alineados** con la paleta SPG (verde/naranja) — sensación de “otro producto” en marketing sections.  
- Clases legacy `.bg-verde-oscuro` / `.text-naranja` duplican lo que deberían ser tokens Tailwind únicos.

### 5.3 Colores en uso

- Tokens: `primary-*`, `secondary-*`, `gray-*`, `success-*`, `error-*`, etc.  
- Hex en clase: muchos `bg-[#0d8e76]`, `bg-[#1c3a35]`, `text-[#f2902f]` (p. ej. `Navbar`, `DashboardLayout`, `ProfilePage`, páginas de pago).  
- **Inconsistencia semántica:** botones de acción positiva en `ErrorDisplay` con **azul** (`blue-600`), no con `primary`/`secondary` de marca.

### 5.4 Tipografía

- Cuerpo: `Inter` (html + `font-sans`).  
- Títulos: `Montserrat` vía regla global `h1–h6`.  
- `font-display` / Poppins: **configurado pero no cargado**.  
- Tamaños de heading: mezcla de `text-xl`, `text-2xl`, `text-3xl`, `text-4xl` sin escala documentada.

### 5.5 Espaciado y radios

- Muchas combinaciones de `p-4`, `p-6`, `p-8`, `gap-4`, `gap-6`, `gap-8` sin convención por tipo de pantalla.  
- `rounded-md` vs `rounded-lg` vs `rounded-xl` vs `rounded-2xl` en superficies similares.

### 5.6 Sombras y elevación

- Uso mixto de `shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-soft` (token custom) sin jerarquía documentada.

---

## 6. Feedback al usuario (loaders, toasts, vacíos, skeletons)

### 6.1 Loaders

- **`LoadingSpinner`**: único componente dedicado; **bien**.  
- Además: `animate-spin` inline en varias páginas, `loading-dots` en CSS global, `animate-pulse` / `animate-pulse-glow` en home y otros.  
- **Oportunidad:** `Spinner` (alias del actual), `PageLoader` (centrado full viewport), `InlineLoader` para botones.

### 6.2 Toasts / notificaciones

| Mecanismo | Dónde | Problema |
|-----------|--------|----------|
| `NotificationProvider` + `NotificationToast` | `App.tsx` envuelve rutas | API `useNotifications()` — usada en carrito (parcial), productos, home, forms, etc. |
| `useNotificationCard` + `NotificationCard` | Hook local | Duplica lógica de colas/duración; en **Checkout** y **WompiReturnPageFixed** se llama `showSuccess/showError` **pero no se monta** `NotificationCardContainer` → UX rota o silenciosa. |
| `react-hot-toast` | `stores/cartStore.ts` | **No hay** `<Toaster />` en `App`/`index` — los `toast.success/error` probablemente **no se muestran**. |

**Oportunidad:** un solo **NotificationService** (context o store) + un solo componente visual montado una vez, con cola, posición y accesibilidad unificadas. Retirar o cablear `react-hot-toast` de forma consciente.

### 6.3 Estados vacíos

- Copy y layout distintos: a veces solo `text-gray-500`, a veces ícono + título + botón (cart, orders, merchant).  
- **Oportunidad:** `<EmptyState icon title description action />` con slots.

### 6.4 Skeletons

- No hay librería ni componente `Skeleton`; hay `animate-pulse` puntual (`ProductImage`, `TopProductsWidget`, etc.).  
- **Oportunidad:** `Skeleton` + `SkeletonText` + `SkeletonCard` para listas y detalle de producto.

---

## 7. Navegación y shells

| Contexto | Implementación | Inconsistencias |
|----------|----------------|-----------------|
| Público | `PublicLayout`: Navbar fijo + `pt-32` + Footer + `SupportChat` | Una sola barra rica; categorías, búsqueda, móvil. |
| Autenticado | `DashboardLayout`: header + sidebar + `Footer` | Sidebar con **emojis** como iconografía; links distintos (`/profile` vs “Mi Perfil”); “AndinoExpress” en branding. |
| 404 | Inline en `AppRoutes` | Usa `.btn-primary` global. |

**Oportunidad:** `AppShell` con variantes `marketing` | `app`, slots para `primaryNav`, `secondaryNav`, `userMenu`, y **icon set** consistente (Heroicons ya en dependencias).

---

## 8. Propuesta de design system (nivel conceptual)

### 8.1 Principios

1. **Una fuente de verdad** para color, tipo, espacio, radio y sombra (Tailwind theme + CSS variables si hace falta para temas).  
2. **Primitivos antes que páginas:** ningún color de marca en páginas; solo tokens semánticos (`bg-primary`, `text-muted`, `border-subtle`).  
3. **Composición:** layouts pequeños (`Stack`, `Cluster`, `Grid`) opcionales; evitar “design system” de 80 wrappers abstractos.  
4. **Accesibilidad:** foco visible, labels, diálogos con Headless UI (ya instalado) o equivalente.

### 8.2 Estructura de carpetas sugerida (futuro)

```text
src/
  design-system/           # o ui/
    tokens/                # documentación + re-exports si aplica
    primitives/
      Button.tsx
      Input.tsx
      TextArea.tsx
      Select.tsx
      Card.tsx
      Modal.tsx
      Badge.tsx
      Spinner.tsx
      Skeleton.tsx
      EmptyState.tsx
    patterns/
      PageHeader.tsx
      ContentContainer.tsx
      DataList.tsx
    feedback/
      ToastViewport.tsx    # único montaje
```

Las páginas actuales migran **gradualmente** importando primitivos; no hace falta big-bang.

---

## 9. Componentes base necesarios (MVP del kit)

**Fase 0 — tokens (bloqueante)**  
- Corregir `tailwind.config.js` (claves duplicadas, `accent` único, `fontFamily` consolidado).  
- Eliminar o aislar utilidades duplicadas en `index.css`; alinear `hero-*` con marca o moverlos a “legacy”.  
- Decidir: **solo Tailwind** o **CSS variables** (`--color-primary`) para theming futuro.

**Fase 1 — primitivos**  
- `Button`, `IconButton`, `LinkButton`  
- `Input`, `TextArea`, `Select`, `Checkbox`, `Label`, `FormField` (error/helper)  
- `Card` / `Surface`  
- `Badge` / `Tag` (estados de pedido, stock, rol)  
- `Modal` + `ConfirmModal`  
- `Spinner`, `Skeleton*`  
- `EmptyState`  
- `Toast` + **un solo** `ToastProvider` / viewport

**Fase 2 — patrones de layout**  
- `ContentContainer` (max-width + padding)  
- `PageHeader` (título, breadcrumbs opcional, acciones)  
- `Tabs` (si se unifica perfil/merchant con pestañas)  
- `DataList` / `DataTable` según patrón real

**Fase 3 — navegación**  
- Unificar iconografía (Heroicons), roles y labels entre `Navbar` y `DashboardLayout`  
- Opcional: extraer `UserMenu`, `CartBadge`, `MobileNavDrawer`

---

## 10. Roadmap de implementación (sin código aún)

### Fase A — Fundaciones (1–2 semanas según equipo)

- [ ] Arreglar configuración Tailwind (`accent`, `fontFamily`, validar que `primary`/`secondary` reflejen marca).  
- [ ] Inventario de hex en `grep "bg-\\[#"` y plan de reemplazo por tokens.  
- [ ] Documentar escala tipográfica (roles: `display`, `title`, `body`, `caption`).  
- [ ] Cargar fuentes alineadas con tokens (quitar Poppins no usada o importarla).  
- [ ] Unificar sistema de notificaciones y **eliminar duplicación** (`useNotificationCard` vs `NotificationProvider`); montar un solo viewport.  
- [ ] Decidir sobre `react-hot-toast`: integrar `<Toaster />` o migrar `cartStore` al sistema unificado.

### Fase B — Primitivos + Storybook opcional (2–3 semanas)

- [ ] Implementar `Button`, `Input`, `Card`, `Badge`, `Spinner`, `EmptyState`, `Modal` con variantes documentadas.  
- [ ] (Opcional) Storybook o página interna `/dev/ui` para regresión visual.

### Fase C — Migración por flujos de alto impacto (iterativo)

Orden sugerido por **tráfico y deuda detectada**:

1. **Checkout + pagos** — corregir feedback roto, alinear botones y errores.  
2. **Auth** — formularios similares (`Login`, `Register`, `VerifyEmail`).  
3. **Catálogo** — `ProductsPage`, `ProductDetailPage`, cards de producto.  
4. **Carrito** — empty state + líneas de ítem.  
5. **Merchant** — tablas/listas, filtros, modales de envío.  
6. **Profile** — formularios largos; dividir archivo si aplica.  
7. **Marketing** — `NewHomePage`, `AboutUsPage` (alinear hero con tokens).

### Fase D — Limpieza

- [ ] Eliminar o fusionar `HomePage` / rutas Wompi no usadas.  
- [ ] Completar o archivar `AddressesPage` / `FavoritesPage`.  
- [ ] Revisar uso de `@headlessui/react` (adoptar en `Modal` o quitar dependencia).

---

## 11. Riesgos y dependencias

- **Migración incremental:** sin congelar features, conviene regla “todo archivo tocado debe usar primitivos nuevos” (Boy Scout).  
- **Regresión visual:** no hay tests visuales detectados; conviene checklist manual por flujo o Storybook/Chromatic después.  
- **Branding:** convivencia “AndinoExpress” vs “Comercializadora SPG” en UI y docs — alinear nombres y logos en el mismo paso que el design system.

---

## 12. Referencias rápidas de archivos revisados

- Tokens / global: `frontend/tailwind.config.js`, `frontend/src/index.css`  
- Rutas y layouts: `frontend/src/routes/AppRoutes.tsx`, `frontend/src/layouts/PublicLayout.tsx`, `frontend/src/layouts/DashboardLayout.tsx`  
- Feedback: `frontend/src/components/ui/NotificationContainer.tsx`, `NotificationToast.tsx`, `NotificationCard.tsx`, `frontend/src/hooks/useNotificationCard.tsx`, `frontend/src/stores/cartStore.ts`  
- Loader: `frontend/src/components/ui/LoadingSpinner.tsx`  
- Ejemplo páginas pesadas: `frontend/src/pages/checkout/CheckoutPage.tsx`, `frontend/src/pages/profile/ProfilePage.tsx`, `frontend/src/pages/merchant/MerchantDashboard.tsx`

---

*Fin del documento de auditoría.*
