# Plan maestro de refactor — arquitectura consistente

**Estado:** planificación únicamente (sin implementación en este documento).  
**Fuentes normativas:** `docs/audits/*.md`, `docs/roadmap/*.md`, `docs/roadmap/decisions.md`, `.cursor/rules/*.mdc`.  
**Última actualización:** 2026-05-14.

---

## 1. Objetivo

Convertir el proyecto en una **arquitectura consistente** (contratos API únicos, capa de servicios backend, cliente HTTP y feedback UI unificados, tipos alineados al dominio, seguridad auth cerrada) **antes** de seguir creando features, cumpliendo las reglas obligatorias del encargo: sin código innecesario, sin librerías sin justificar, sin romper contratos sin documentar migración, sin mocks silenciosos ni fallbacks falsos, sin hardcodes operativos dispersos, sin duplicación masiva de lógica/UI, sin `fetch` directo donde exista cliente axios, componentes bajo 250 LOC donde aplique la regla del proyecto, sin estilos inline repetidos como sustituto de primitivos, y sin crear nuevos problemas al corregir otros (entregas verticales mergeables).

---

## 2. Principios de ejecución (alineación con reglas)

| Regla / fuente | Implicación operativa |
|----------------|------------------------|
| `project-rules.mdc` | Analizar riesgos antes de codificar; evitar archivos gigantes y duplicación. |
| `backend-rules.mdc` | Controllers delgados; lógica en `services/`; validación explícita. |
| `api-rules.mdc` | Respuesta JSON estándar; validar body, params y query; paginación explícita. |
| `database-rules.mdc` | Consultas lean; índices donde el catálogo y relacionados lo exijan. |
| `frontend-rules.mdc` | Máx. 250 LOC por componente; separar lógica y presentación; responsive/mobile first. |
| `ui-rules.mdc` | SaaS premium; animaciones y gradientes contenidos; contraste y legibilidad. |
| `decisions.md` | Las filas **PENDIENTE** deben cerrarse en mesa técnica antes de implementar lo que bloquean. |

---

## 3. Clasificación global P0–P3

| Nivel | Definición | Temas representativos |
|-------|------------|------------------------|
| **P0** | Bloquea confianza en producción, seguridad, integridad de datos o feedback crítico invisible. | Auth: JWT fallback, backdoor admin, CORS permisivo, mock Firebase en prod, token en URL, enumeración, `generarTokenAcceso` mal invocado, verificación email no enforceada, `seleccionar-rol` sin auth real. Products: endpoints fantasma en cliente o contrato sort/paginación roto, `helpers.js` doble `module.exports`, ObjectIds falsos en `ProductForm`, tipos TS “mentirosos” (`imagenes`, `especificaciones`). UI: tres sistemas de notificación y feedback roto en checkout/Wompi. Tailwind: claves duplicadas que pisan tokens (`accent`, `fontFamily`). |
| **P1** | Alto impacto en mantenibilidad, contratos y UX; no siempre día-1 security pero sí calidad de plataforma. | Cliente HTTP único (`api` axios), `config/env` central, URL state en `/productos`, consolidar listado comerciante, servicios backend, validación en endpoints sensibles, `ProductCard` único + `ProductImage`, debounce búsqueda, cache de categorías (tras decisión de stack), errores por sección (`allSettled`), logging estructurado con redacción. |
| **P2** | Deuda estructural y UX/UI/SEO que escala coste del equipo. | Modularización Home/Products, `React.lazy`, política de iconos, naming backend mixto, Storybook/`/dev/ui`, SEO head + JSON-LD, slug URLs, reducción gradientes/animaciones, `svh` hero, refactor Navbar/dashboard. |
| **P3** | Higiene, herramientas opcionales, versionado API público futuro. | Limpieza CSS huérfano, scripts JWT documentados, API `/v1` explícito cuando exista segundo consumidor, theming avanzado. |

---

## 4. Qué rompe cada dimensión (mapa de impacto)

| Dimensión | Qué la rompe hoy (síntesis desde auditorías) |
|-------------|-----------------------------------------------|
| **Producción** | Secretos y backdoors en runtime; CORS permisivo; logs con credenciales; mock Firebase si admin SDK no init; errores HTTP mal compuestos (`errorResponse` doble); datos huérfanos por categorías inventadas; posible `ValidationError` al persistir `administrador`. |
| **Auth** | Contrato es/en roto (cambio/reset password); JWT con email en campo `rol` en OAuth/seleccionar-rol; token en querystring; refresh no implementado; cookie httpOnly ignorada por el cliente; `fetch` paralelo sin interceptores; `seleccionar-rol` abusable; verificación no bloquea login. |
| **Checkout** | Notificaciones: `useNotificationCard` sin contenedor visible en flujos Wompi/checkout; `react-hot-toast` en `cartStore` sin `<Toaster />` montado; feedback silencioso o duplicado. |
| **SEO** | SPA sin `<title>`/meta dinámicos; sin JSON-LD; URLs por `_id`; home enlaza `?categoria=` sin efecto en catálogo; `button`+`navigate` en lugar de `<a>`; búsqueda no en URL. |
| **Mobile** | Hero `vh` vs barra iOS; CTA fuera de fold; debounce ausente (tormenta de requests); grid catálogo con filtros perdidos en tablet (`md`); LCP por `loading="lazy"` en todo el fold; jank por hover scale en grids densos. |
| **Performance** | Sin code-splitting de rutas; imágenes sin `srcset` pese a util existente; queries secuenciales en detalle producto; categorías refetch por navegación; incremento de vistas no invocado (KPI/sorts inútiles). |

---

## 5. Carriles y orden recomendado

Orden **no negociable** para reducir regresiones:

1. **Carril A — Seguridad y contrato Auth (P0)**  
   Alineado a `auth-audit` fases 0–1 y `backend-refactor-roadmap` B0–B1, `decisions.md` DEC-AUTH-001, DEC-API-002, DEC-ERR-004.

2. **Carril B — Contratos Products + helpers (P0–P1)**  
   Alineado a `products-audit` fase 0 y `backend-refactor-roadmap` B2; `decisions.md` DEC-DATA-005, DEC-API-004, DEC-FORM-004.

3. **Carril C — Feedback UI unificado (P0)**  
   Alineado a `ui-system-audit`, `ui-system-roadmap` U0, `decisions.md` DEC-UI-004.

4. **Carril D — Fundaciones UI tokens (P0–P1)**  
   Tailwind duplicados + plan hex → tokens; `decisions.md` DEC-UI-001–002.

5. **Carril E — Kit mínimo + ProductCard (P1)**  
   Compartido Home + Products (`home-audit` F2, `products-audit` F2, `frontend-refactor-roadmap` F2).

6. **Carril F — Modularización páginas y URL state (P1–P2)**  
   `ProductsPage` + hooks; Home en secciones; `decisions.md` DEC-FE-005.

7. **Carril G — Performance y SEO (P2)**  
   Tras contratos firmes y rutas enlazables; `frontend-refactor-roadmap` F5, `products-audit` F6–F7.

Cada carril debe producir **entregas mergeables** sin dejar flujos públicos rotos (regla ya en auditorías Home/Products).

---

## 6. Decisiones pendientes (bloquean implementación)

Registrar cierre en `docs/roadmap/decisions.md` § bitácora. Resumen de IDs críticos:

- **API:** idioma único de paths/campos (DEC-API-002 / auth D3 / BD1).  
- **Auth:** almacenamiento de sesión (DEC-AUTH-002 / D1); OAuth único (DEC-AUTH-003 / D2); rol admin existe o no (DEC-AUTH-004 / D4); linking OAuth (DEC-AUTH-007 / D6); política passwords (DEC-AUTH-008 / D7).  
- **Products:** endpoint comerciante canónico (BD6); endpoints semánticos vs eliminar del cliente (BD5); política stock visible (D3 products); URLs slug (BD7 / D7 products).  
- **Datos remotos:** React Query vs SWR vs Zustand cache (DEC-FE-007).  
- **UI:** notificaciones canónicas (DEC-UI-004 / UD1); iconos (DEC-UI-005 / UD2).  
- **Home:** stats reales vs eliminar sección (home-audit D1 / UD5).

---

## 7. Métricas de seguimiento (orientativas)

Tomadas de auditorías y roadmaps: reducción de LOC en páginas clave, `fetch(` en `src` → 0 en flujos auth/notifications, endpoints fantasma → 0 o implementados, implementaciones de tarjeta producto → 1, `%` rutas con head SEO, LCP orientativo &lt; 2.5 s en home/listado, logs sin campos sensibles.

---

## 8. Referencias

- `docs/audits/auth-audit.md`, `home-audit.md`, `products-audit.md`, `ui-system-audit.md`  
- `docs/roadmap/backend-refactor-roadmap.md`, `frontend-refactor-roadmap.md`, `ui-system-roadmap.md`  
- `docs/roadmap/decisions.md`  
- `.cursor/rules/*.mdc`

---

## 9. Apéndice A — Inventario consolidado de detección (punto 1 del encargo)

Referencias detalladas por ítem: `docs/audits/*.md`. Aquí solo se agrupa por categoría.

| Categoría | Hallazgos principales | Prioridad típica |
|-----------|----------------------|------------------|
| **Código muerto** | `HomePage` importado en rutas sin `<Route>`; métodos en `productService` sin uso; rutas Passport OAuth no ejercidas por FE; posible primer bloque de `module.exports` en `helpers.js`; páginas Wompi duplicadas (`WompiReturnPage` vs `Fixed` vs `payment/`). | P1–P3 |
| **Endpoints inexistentes** | Ocho rutas en `productService` sin registro backend (404) — tabla en products-audit C1. | P0 |
| **Stores duplicados** | No hay dos stores Zustand del mismo dominio: solo `authStore` y `cartStore`. **Duplicación real:** estado de servidor (categorías) repetido en state local de varias páginas sin cache compartido. | P1 |
| **Lógica duplicada** | Filtros/sort/paginación en `productController`, `obtenerMisProductos`, `gestionarProductos`; verificación JWT en 3 sitios; transformación URL imagen en modelo + helpers + frontend. | P0–P1 |
| **Helpers duplicados / triplicados** | `getImageUrl` / `transformarUrlImagen` / frontend `imageUtils`; `getCategoryName` en 4 archivos. | P1 |
| **Componentes duplicados** | Cinco `ProductCard` inline; hero/stats/features repetidos Home/About; overlays `fixed inset` ad hoc. | P1–P2 |
| **Auth inconsistente** | es/en en rutas y bodies; `fetch` vs axios; cookie httpOnly vs Bearer en `localStorage`; Passport vs Firebase; rol admin roto vs rutas. | P0 |
| **Flows rotos** | Cambio y reset password; `?categoria=` sin efecto en catálogo; CTA “Contáctanos” vacío (home); `SocialLoginButtons` → `/admin` inexistente; OAuth token en URL. | P0–P1 |
| **Imports circulares** | No inventariados en auditorías; riesgo en módulos grandes — ver `dependency-map.md` §6. | P3 (higiene) |
| **Estados falsos** | Stats marketing; badge OFERTA por tag; “éxito” de UI sin toast visible; loading global que oculta error parcial en `Promise.all` home. | P0–P1 |
| **Mocks silenciosos** | Firebase Admin null → aceptar login mock (auth-audit C13). | P0 |
| **Naming inconsistente** | `NewHomePage`, `WompiReturnPageFixed`; mezcla `obtenerProductos` / `getProductById`; aliases query `q` vs `busqueda`. | P2 |
| **Inconsistencias UI** | Tres sistemas de notificación; hex sueltos vs tokens; `ErrorDisplay` con azul fuera de marca; emojis vs iconos; AndinoExpress vs marca. | P0–P2 |
| **Responsive** | Hero vs `pt-32`; tablet sin filtros en catálogo; `vh` vs Safari; CTA fuera de fold móvil. | P1–P2 |
| **Accesibilidad** | `button`+`navigate` en catálogo/home; tabs detalle sin roles ARIA; emojis como única señal; contraste no auditado. | P1–P2 |

---

## 10. Bitácora

| Fecha | Cambio |
|-------|--------|
| 2026-05-14 | Creación del plan maestro a partir de lectura completa de audits, roadmaps, decisions y rules. |
| 2026-05-14 | Apéndice A: inventario consolidado de detección (punto 1). |
