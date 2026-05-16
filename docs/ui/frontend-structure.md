# Estructura objetivo del frontend

## Estado actual (post-cambio)

```
frontend/src/
  components/
    nav/           # trozos del Navbar público (promo, desktop, categorías, móvil, búsqueda)
    ui/            # design system + barrel index.ts
    forms/
    ...
  layouts/
  pages/
  hooks/
  lib/             # cn.ts, appNotifications.ts
  stores/
  services/
  routes/
```

## Objetivo (DEC-FE-006 y roadmaps)

```
frontend/src/
  features/
    cart/
    checkout/
    catalog/
    ...
    each: components/, hooks/, api.ts optional
  pages/
    <feature>/
      FeaturePage.tsx      # solo composición (<250 líneas)
      sections/            # secciones visuales
      hooks/
```

La carpeta `features/` no se creó aún en masa para evitar un big-bang; las nuevas piezas van en `components/nav` y `components/ui` hasta que un módulo (p. ej. catálogo) se migre completo.

## Convenciones de nombres

- Componentes: `PascalCase.tsx`
- Hooks: `useThing.ts`
- Un componente por archivo salvo compound exportado desde el mismo archivo (`Card.tsx` exporta subpartes).

## Datos y UI

- Fetching y parseo: preferir hooks dedicados (`useHomeData`, `useProducts`) — pendiente según `frontend-refactor-roadmap.md`.
- Sin `fetch` paralelo en auth: alinear con `authService` + `api` (auth-audit).

## Calidad

- Sin `console.log` en código nuevo; sin `TODO`/`FIXME` en archivos tocados.
- `npm run build` obligatorio antes de merge de cambios UI amplios.
