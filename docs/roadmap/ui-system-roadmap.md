# Roadmap — Sistema UI / design system (estrategia global)

**Estado:** planificación · **Implementación:** no iniciada en este documento  
**Fuentes:** `docs/audits/ui-system-audit.md`, `docs/audits/home-audit.md`, `docs/audits/products-audit.md`, `docs/audits/auth-audit.md` (formularios y flujos)  
**Fecha de síntesis:** 2026-05-14

---

## 1. Objetivo

Construir un **sistema UI incremental** (tokens + primitivos + patrones) que reduzca duplicación, unifique **feedback al usuario**, alinee la marca con **UX/UI profesional**, y habilite **performance** (menos CSS ad hoc, menos repaints) sin un big-bang de rediseño.

---

## 2. Prioridades (orden operativo)

| Prioridad | Qué significa en este repo |
|-----------|----------------------------|
| 1 · Estabilidad percibida | Notificaciones siempre visibles; errores de checkout/pagos confiables; sin tres sistemas de toast competiendo. |
| 2 · Quick wins | Corregir `tailwind.config.js` (claves duplicadas `accent`, `fontFamily`); alinear fuentes cargadas vs declaradas; eliminar rutas/páginas muertas que confunden el sistema visual. |
| 3 · Reducción de deuda | Menos hex sueltos (`bg-[#...]`); menos utilidades redefinidas en `index.css`; consolidar loaders/spinners. |
| 4 · Reutilización | `Button`, `Card/Surface`, `Input`+`Field`, `Modal`, `EmptyState`, `Skeleton`, `ProductCard` variants (compartido Home + Products). |
| 5 · UX/UI | Jerarquía tipográfica documentada; iconografía consistente (Heroicons/Lucide — decisión); layouts `marketing` vs `app` alineados. |
| 6 · Performance | Imágenes vía `ProductImage` + `srcset`; menos animaciones simultáneas; hero con `svh` donde aplique (home-audit). |
| 7 · Escalabilidad | Estructura `design-system/` o `components/ui/` clara; regla Boy Scout; opcional Storybook o `/dev/ui`. |

---

## 3. Principios de diseño (gobernanza)

1. **Una fuente de verdad de tokens:** color, tipo, espacio, radio, sombra — Tailwind `theme.extend` + evitar duplicar utilidades en `index.css`.
2. **Semántica sobre valores crudos en componentes de negocio:** las páginas usan `bg-primary`, no `#0d8e76` (salvo transición documentada).
3. **Accesibilidad no negociable en primitivos:** foco visible, `label`+`id`, diálogos con focus trap (Headless UI ya en dependencias — adoptar o retirar).
4. **Migración por flujo de ingresos / riesgo:** checkout primero (ui-system-audit Fase C), luego auth, luego catálogo.
5. **Coordinación con audits de dominio:** `ProductCard` y `Container/Section` se diseñan una vez para Home y Products (home-audit F2 / products-audit F2).

---

## 4. Mapa de dolor → intervención

| Dolor (auditoría UI) | Intervención estratégica |
|----------------------|---------------------------|
| Tres sistemas de notificación + `Toaster` ausente | Un `NotificationService` + un viewport; migrar `cartStore` o montar `Toaster` explícitamente tras decisión. |
| `useNotificationCard` sin contenedor en checkout | Asegurar montaje o unificar en provider global. |
| Sin primitivos | Roadmap por fases A–D del ui-system-audit, integrado abajo. |
| Navbar/dashboard con hex y emojis dispares | Fase de navegación: tokens + set de iconos + copy de marca unificada. |
| Placeholder pages (Favorites, Addresses) | Completar flujo o esconder del nav hasta tener UI real — evita “sistema roto”. |

---

## 5. Fases propuestas (alineadas y expandidas desde ui-system-audit)

### U0 — Fundaciones y quick wins (bloqueante)

- Reparar duplicados en `tailwind.config.js`; validar paleta `primary`/`secondary`/`accent` única.
- Inventario `grep` de `bg-[#` y plan de reemplazo por tokens (no ejecutar aún — solo backlog priorizado).
- Fuentes: importar Poppins o quitarla del config; documentar escala tipográfica (`display`, `title`, `body`, `caption`).
- `index.css`: aislar “legacy” vs tokens; reducir redefiniciones de utilidades Tailwind.
- **Notificaciones:** decisión única — retirar duplicación (`NotificationCard` vs `NotificationToast` vs `react-hot-toast`).

**Entregable:** base estable para que cualquier nueva pantalla no empeore el sistema.

### U1 — Primitivos MVP (alto ROI)

Implementar y documentar variantes mínimas:

- `Button` (+ `loading`, `disabled`, `asChild`/polimorfismo si se adopta).
- `Input`, `TextArea`, `Select`, `Checkbox`, `Label`, `FormField` (integración `react-hook-form`).
- `Card` / `Surface`, `Badge`, `Spinner`, `Skeleton*`, `EmptyState`.
- `Modal` + `ConfirmModal` (Headless UI recomendado por dependencia existente).

**Entregable:** nuevas features sin nuevos “cocktails” de Tailwind de 12 líneas por botón.

### U2 — Patrones de layout y contenido

- `ContentContainer` / `Section` / `PageHeader` (y breadcrumbs cuando el componente exista del lado producto).
- Opcional: `Stack`, `Cluster` ligeros — solo si reducen ruido; evitar sobre-abstracción.

**Entregable:** consistencia entre `PublicLayout` y `DashboardLayout`.

### U3 — Migración por flujos (iterativo)

Orden sugerido (ui-system-audit §10 Fase C), ajustado por riesgo:

1. **Checkout + Wompi** — feedback roto, modales, botones primarios coherentes.
2. **Auth** — formularios homogéneos; alineado con auth-audit frontend (sin `fetch` paralelo).
3. **Catálogo + detalle** — `ProductCard`, filtros, skeletons.
4. **Carrito** — empty states y líneas de ítem.
5. **Merchant** — listas densas, estados de pedido con `Badge`.
6. **Profile** — forms largos seccionados.
7. **Marketing** — Home/About: reducción de gradientes y animaciones (home-audit F5 en paralelo conceptual).

### U4 — Navegación y marca

- Extraer `UserMenu`, `CartBadge`, drawer móvil si aplica.
- Unificar naming (“AndinoExpress” vs marca oficial) con diseño/marketing en el mismo hito.
- Dashboard: sustituir emojis como iconografía principal por icon set acordado.

### U5 — Calidad visual y herramientas

- Checklist WCAG por plantillas críticas (auth, checkout, catálogo).
- Storybook, Chromatic, o página `dev` interna para regresión visual — decisión de equipo.

### U6 — Limpieza

- Fusionar páginas Wompi duplicadas cuando el flujo de pago esté estabilizado.
- Eliminar `@headlessui/react` si no se adopta en modales; o formalizar su uso como estándar.

---

## 6. Coordinación con otros roadmaps

| Tema | Responsable principal |
|------|------------------------|
| Contratos API, errores consistentes | `backend-refactor-roadmap.md` |
| `useSearchParams`, hooks de datos, SEO head | `frontend-refactor-roadmap.md` |
| `ProductCard` + `ProductImage` | Este documento **y** frontend roadmap (compartido) |

---

## 7. Decisiones explícitas (mesa de diseño / producto)

| ID | Pregunta | Opciones | Bloquea |
|----|----------|----------|---------|
| UD1 | Sistema de notificaciones canónico | Provider único vs toast library | U0 |
| UD2 | Librería de iconos | Heroicons vs Lucide vs mixto | U4, home F5 |
| UD3 | Storybook vs `/dev/ui` | Sí / no / fase 2 | U5 |
| UD4 | Theming futuro | Solo Tailwind vs CSS variables | U0 |
| UD5 | Stats en marketing | Datos reales vs eliminar sección | home F1 |

---

## 8. Métricas de seguimiento

- Conteo de `bg-[#` en `frontend/src` (debe decrecer release a release).
- Número de implementaciones distintas de botón primario (objetivo: 1 primitivo).
- % de páginas de alto tráfico migradas a primitivos (peso: checkout > auth > catálogo).
- Tiempo hasta primer feedback visible en checkout (latencia percibida).
- Issues de accesibilidad abiertos vs cerrados (teclado, contraste, roles en tabs).

---

## 9. Riesgos

| Riesgo | Mitigación |
|--------|------------|
| “Reskin” sin arreglar flujos rotos | Ordenar checkout/notificaciones antes de marketing visual. |
| Design system desconectado del código real | Acoplado a `ProductCard` y `Button` en el mismo sprint inicial. |
| Regresión sin tests visuales | Checklist por flujo hasta contar con herramienta. |

---

## 10. Documentos relacionados

- `docs/roadmap/frontend-refactor-roadmap.md`
- `docs/roadmap/backend-refactor-roadmap.md`
- `docs/audits/ui-system-audit.md` — inventario detallado y fases A–D originales

---

## 11. Bitácora

| Fecha | Cambio |
|-------|--------|
| 2026-05-14 | Creación del roadmap a partir de las cuatro auditorías. |
