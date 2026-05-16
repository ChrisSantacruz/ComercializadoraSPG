# Decisiones arquitectónicas y técnicas globales

**Estado:** documento vivo (planificación) — **no sustituye** implementación ni tickets  
**Última actualización:** 2026-05-14  
**Fuentes normativas:** `docs/audits/*.md`, `docs/roadmap/*.md`, `.cursor/rules/*.mdc`

---

## Cómo usar este documento

- Cada decisión tiene **ID**, **enunciado**, **rationale**, **impacto**, **prioridad** y **riesgos**.  
- **Prioridad:** P0 (bloqueante / seguridad o contrato roto), P1 (alto), P2 (medio), P3 (bajo / higiene).  
- Las filas marcadas como **«PENDIENTE: elegir»** deben resolverse en mesa técnica antes de implementar el refactor que las cite.

---

## 1. Decisiones frontend

### DEC-FE-001 — Un solo cliente HTTP por dominio (axios `api` como canónico)

| Campo | Contenido |
|-------|------------|
| **Rationale** | Hoy conviven `axios` + `fetch` directo (auth, registro, OAuth), lo que bypasea interceptores, tipos y manejo unificado de errores (`docs/audits/auth-audit.md`). |
| **Impacto** | Trazabilidad, seguridad (menos rutas que logueen credenciales), una sola política de headers y refresh. |
| **Prioridad** | P1 |
| **Riesgos** | Regresión en flujos que asumían `fetch`; hay que migrar página por página con pruebas manuales de auth/checkout. |

### DEC-FE-002 — Configuración de entorno centralizada

| Campo | Contenido |
|-------|------------|
| **Rationale** | `REACT_APP_API_URL` y Firebase dispersos con fallbacks `5000` vs `5001` generan incidentes silenciosos (`auth-audit`, `products-audit`). |
| **Impacto** | Menos bugs de entorno; onboarding más rápido. |
| **Prioridad** | P1 |
| **Riesgos** | Un solo archivo mal importado puede romper el build; documentar variables en README. |

### DEC-FE-003 — Límite de tamaño por componente

| Campo | Contenido |
|-------|------------|
| **Rationale** | `.cursor/rules/frontend-rules.mdc`: máximo **250 líneas** por componente; auditorías muestran páginas de 400–850 LOC. |
| **Impacto** | Revisiones más baratas, menos conflictos de merge, mejor testabilidad. |
| **Prioridad** | P2 |
| **Riesgos** | Particionar demasiado pronto sin diseño de hooks puede fragmentar el código; seguir patrón `page + sections + hooks` de los roadmaps. |

### DEC-FE-004 — Navegación declarativa para rutas públicas

| Campo | Contenido |
|-------|------------|
| **Rationale** | Uso de `<button onClick={navigate}>` rompe SEO, accesibilidad y UX de “abrir en pestaña” (`docs/audits/products-audit.md`). |
| **Impacto** | Mejor crawling, teclado y expectativas de usuario. |
| **Prioridad** | P2 |
| **Riesgos** | Estilos de `<Link>` deben alinearse al `Button` polimórfico (ver DEC-UI-003). |

### DEC-FE-005 — Estado de filtros y catálogo en la URL

| Campo | Contenido |
|-------|------------|
| **Rationale** | `ProductsPage` ignora `useSearchParams`; la home enlaza `?categoria=` sin efecto (`products-audit`, `home-audit`). |
| **Impacto** | Compartir enlaces, analytics, recuperación de sesión de navegación, base para SEO. |
| **Prioridad** | P1 |
| **Riesgos** | Sincronizar bidireccionalmente URL ↔ estado requiere disciplina para no crear loops de efectos. |

### DEC-FE-006 — Modularización por feature (carpetas `pages/<feature>/`)

| Campo | Contenido |
|-------|------------|
| **Rationale** | Roadmaps frontend/home/products proponen `sections/`, `hooks/`, subcomponentes. Alineado a `project-rules.mdc` (evitar archivos gigantes). |
| **Impacto** | Escalabilidad cuando crezca el equipo y el número de rutas. |
| **Prioridad** | P2 |
| **Riesgos** | Rutas de importación largas; acordar alias `@/` si aún no está unificado. |

### DEC-FE-007 — PENDIENTE: librería de datos remotos (React Query vs SWR vs Zustand cache)

| Campo | Contenido |
|-------|------------|
| **Rationale** | Categorías y listados se repiten sin cache (`products-audit` A4); home-audit D3 / products-audit D5. |
| **Impacto** | Menos requests, retry estándar, invalidación tras mutaciones. |
| **Prioridad** | P2 (tras contratos firmes) |
| **Riesgos** | Nueva dependencia y curva de aprendizaje; duplicar estado entre Zustand y Query si no hay convención (ver §11). |

**Opciones:** (A) TanStack Query, (B) SWR, (C) solo Zustand + TTL manual para pocos recursos. **Elegir una** y documentar en bitácora al final de este archivo.

---

## 2. Decisiones backend

### DEC-BE-001 — Controllers delgados; lógica en services

| Campo | Contenido |
|-------|------------|
| **Rationale** | `.cursor/rules/backend-rules.mdc`; estado actual: `authController`, `productController` monolíticos (`docs/audits/*`). |
| **Impacto** | Tests unitarios, reutilización entre rutas públicas y comerciante, menos duplicación. |
| **Prioridad** | P1 |
| **Riesgos** | Extracción apresurada puede crear “anemic domain”; mantener reglas de negocio explícitas en services nombrados por caso de uso. |

### DEC-BE-002 — Validación explícita en todos los endpoints mutables y sensibles

| Campo | Contenido |
|-------|------------|
| **Rationale** | `api-rules.mdc` (validar body, params, query); `auth-audit` señala casi todos los endpoints de auth sin validador salvo login/register. |
| **Impacto** | Menos 400 inconsistentes, menos superficie de abuso. |
| **Prioridad** | P1 |
| **Riesgos** | Validación demasiado estricta puede romper clientes legacy; coordinar con decisión de idioma de contrato (§4). |

### DEC-BE-003 — Un solo módulo de verificación JWT

| Campo | Contenido |
|-------|------------|
| **Rationale** | `jwt.verify` duplicado en middleware y helpers (`auth-audit` A4); pin de algoritmo HS256 recomendado. |
| **Impacto** | Comportamiento homogéneo de errores, auditoría de seguridad más simple. |
| **Prioridad** | P0–P1 |
| **Riesgos** | Cambiar mensajes de error puede alterar lo que el frontend interpreta; acordar códigos de error estables (§4, §12). |

### DEC-BE-004 — Logging estructurado con redacción

| Campo | Contenido |
|-------|------------|
| **Rationale** | `backend-rules.mdc` (“Logging claro”); hoy hay logs con passwords y tokens (`auth-audit`, `products-audit`). |
| **Impacto** | Cumplimiento, menos fugas en APM/logs agregados. |
| **Prioridad** | P0 |
| **Riesgos** | Coste de librería y configuración en entornos dev/prod. |

### DEC-BE-005 — Consolidar listados de productos del comerciante

| Campo | Contenido |
|-------|------------|
| **Rationale** | Dos endpoints con formatos distintos (`products-audit` A5, C10); decisión de roadmap BD6. |
| **Impacto** | Un solo contrato `{ datos, paginacion }` (o el estándar acordado en §4). |
| **Prioridad** | P1 |
| **Riesgos** | Romper `merchantService` si no hay ventana de deploy coordinada. |

### DEC-BE-006 — Corregir deuda estructural en helpers compartidos

| Campo | Contenido |
|-------|------------|
| **Rationale** | Doble `module.exports` en `helpers.js` (`products-audit` C7); riesgo de código muerto y exports “invisibles”. |
| **Impacto** | Comportamiento predecible de `successResponse` / paginación. |
| **Prioridad** | P0 |
| **Riesgos** | Algún import dinámico podría depender del orden actual; revisar grep antes del cambio. |

### DEC-BE-007 — PENDIENTE: versionado explícito del API

| Campo | Contenido |
|-------|------------|
| **Rationale** | `api-rules.mdc` menciona “versionado limpio”; hoy no hay `/v1` explícito en las auditorías. |
| **Impacto** | Evolución sin romper clientes externos futuros (apps móviles, integradores). |
| **Prioridad** | P3 hasta que exista segundo consumidor |
| **Riesgos** | Duplicar rutas o mantener capa de compatibilidad aumenta coste; **elegir** entre prefijo `/api/v1`, header `Accept-Version`, o “sin versión hasta nuevo aviso”. |

---

## 3. Decisiones UI / design system

### DEC-UI-001 — Tokens semánticos antes que hex en componentes de negocio

| Campo | Contenido |
|-------|------------|
| **Rationale** | `ui-system-roadmap.md`, `ui-rules.mdc`; auditoría UI: decenas de `bg-[#...]` y `accent` duplicado en Tailwind. |
| **Impacto** | Marca coherente, menos regresión visual al cambiar paleta. |
| **Prioridad** | P1 |
| **Riesgos** | Migración gradual puede dejar “dos marcas” temporalmente; medir con conteo de hex (roadmap UI). |

### DEC-UI-002 — Reparar fuente de verdad en Tailwind + CSS global

| Campo | Contenido |
|-------|------------|
| **Rationale** | Claves duplicadas (`accent`, `fontFamily`); `index.css` redefine utilidades Tailwind; Poppins configurada pero no cargada (`ui-system-audit.md`). |
| **Impacto** | Tipografía y color predecibles entre entornos. |
| **Prioridad** | P0–P1 |
| **Riesgos** | Cambios visuales amplios tras corregir duplicados; comunicar a diseño/producto. |

### DEC-UI-003 — Primitivos mínimos obligatorios para código nuevo

| Campo | Contenido |
|-------|------------|
| **Rationale** | No existen `Button`, `Input`, `Modal`, etc.; `frontend-rules` + `ui-system-roadmap` U1. |
| **Impacto** | Velocidad de feature y accesibilidad centralizada. |
| **Prioridad** | P1 |
| **Riesgos** | API de primitivos inestable al inicio; versionar internamente o marcar `@experimental` hasta primera release del kit. |

### DEC-UI-004 — PENDIENTE: sistema de notificaciones canónico (UD1)

| Campo | Contenido |
|-------|------------|
| **Rationale** | Tres mecanismos (`NotificationProvider`, `useNotificationCard`, `react-hot-toast` sin `<Toaster />`) — `ui-system-audit.md`. |
| **Impacto** | Checkout/carrito dejan de fallar en silencio. |
| **Prioridad** | P0 |
| **Riesgos** | Migración del `cartStore` y flujos Wompi; pruebas E2E manuales obligatorias. |

**Opciones:** (A) Un solo context + viewport, (B) librería única (sonner/react-hot-toast) montada una vez, (C) híbrido temporal documentado con fecha de fin. **Elegir una.**

### DEC-UI-005 — PENDIENTE: librería de iconos (UD2)

| Campo | Contenido |
|-------|------------|
| **Rationale** | Emojis como UI principal violan `ui-rules.mdc` y home/products audits; Heroicons ya en dependencias (`ui-system-audit.md`). |
| **Impacto** | Percepción “SaaS premium”, accesibilidad. |
| **Prioridad** | P2 |
| **Riesgos** | Mezclar dos sets infla bundle; **elegir** Heroicons vs Lucide vs mixto acotado. |

### DEC-UI-006 — PENDIENTE: Storybook, Chromatic o `/dev/ui` (UD3)

| Campo | Contenido |
|-------|------------|
| **Rationale** | Sin regresión visual automatizada; `ui-system-roadmap` U5. |
| **Impacto** | Confianza en refactors UI. |
| **Prioridad** | P3 |
| **Riesgos** | Coste de CI y mantenimiento; **elegir** herramienta o posponer con checklist manual obligatorio hasta P2. |

### DEC-UI-007 — PENDIENTE: theming (UD4)

| Campo | Contenido |
|-------|------------|
| **Rationale** | Solo Tailwind vs CSS variables para dark mode / white-label futuro. |
| **Impacto** | Coste de refactor si se pospone mal. |
| **Prioridad** | P3 |
| **Riesgos** | CSS variables añaden complejidad; **decidir** “solo Tailwind hasta 2027” o “variables para color desde U0”. |

### DEC-UI-008 — Marca única en copy y assets

| Campo | Contenido |
|-------|------------|
| **Rationale** | “AndinoExpress” vs marca real en home/nav (`home-audit`, `ui-system-audit`). |
| **Impacto** | Confianza del usuario y consistencia legal. |
| **Prioridad** | P2 |
| **Riesgos** | Cambios en dominios, emails y textos legales; coordinar con marketing. |

---

## 4. Estándares API

### DEC-API-001 — Formato estándar de respuesta JSON

| Campo | Contenido |
|-------|------------|
| **Rationale** | `api-rules.mdc` define `{ success, message, data, error? }`. |
| **Impacto** | Cliente puede parsear de forma uniforme; reduce bifurcaciones `Array.isArray(res) ? res : res.datos`. |
| **Prioridad** | P1 |
| **Riesgos** | Endpoints legacy que devuelven arrays crudos deben migrarse con compatibilidad temporal. |

### DEC-API-002 — PENDIENTE: un solo idioma para paths y nombres de campos del contrato (BD1 / auth D3)

| Campo | Contenido |
|-------|------------|
| **Rationale** | Mezcla es/en rompió cambio/reset password (`auth-audit`); alinea con `backend-refactor-roadmap` BD1. |
| **Impacto** | Elimina clase entera de bugs de integración. |
| **Prioridad** | P0 |
| **Riesgos** | Romper clientes si existen fuera del repo; **elegir** EN canónico (recomendado en audit) vs ES completo. |

### DEC-API-003 — Códigos HTTP semánticos

| Campo | Contenido |
|-------|------------|
| **Rationale** | `backend-rules.mdc`; anti-patrón `errorResponse` mal compuesto generaba status incoherentes (`auth-audit` C15). |
| **Impacto** | Interceptores y monitoring fiables. |
| **Prioridad** | P1 |
| **Riesgos** | Cambiar 404→200 por anti-enumeración debe documentarse (§12). |

### DEC-API-004 — Paginación: nombres y forma únicos

| Campo | Contenido |
|-------|------------|
| **Rationale** | `limitePorPagina` vs `elementosPorPagina` (`products-audit` C5); `api-rules` pide paginación explícita. |
| **Impacto** | Tipos TS y UI de paginación alineados. |
| **Prioridad** | P1 |
| **Riesgos** | Cambio breaking; usar release coordinado o dual-read en una versión. |

### DEC-API-005 — Query params: sin alias no documentados

| Campo | Contenido |
|-------|------------|
| **Rationale** | `q` vs `busqueda`, `precioMin` vs `minPrecio` (`products-audit` A7). |
| **Impacto** | Documentación OpenAPI/Swagger futura y menos sorpresas entre servicios. |
| **Prioridad** | P2 |
| **Riesgos** | Deprecación gradual vs big-bang; preferir una tabla “canónico → legacy (deprecated)” en README API. |

### DEC-API-006 — Errores: no filtrar stack al cliente en producción

| Campo | Contenido |
|-------|------------|
| **Rationale** | `api-rules.mdc` (“no filtrar stack traces al frontend”) equilibrado con no exponer datos sensibles. |
| **Impacto** | Seguridad vs debugabilidad; stack solo en logs servidor. |
| **Prioridad** | P1 |
| **Riesgos** | DX en desarrollo: mantener detalle completo solo con `NODE_ENV=development`. |

---

## 5. Estrategia Auth

### DEC-AUTH-001 — Seguridad P0 antes de features nuevas en auth

| Campo | Contenido |
|-------|------------|
| **Rationale** | `auth-audit` fases 0–1 bloqueantes: JWT fallback, backdoor admin, CORS permisivo, mock Firebase, rate limit, logs. |
| **Impacto** | Reducción de riesgo legal y de cuenta comprometida. |
| **Prioridad** | P0 |
| **Riesgos** | Despliegue puede bloquear devs sin `.env` correcto; documentar fail-fast. |

### DEC-AUTH-002 — PENDIENTE: almacenamiento de sesión (D1 / BD4)

| Campo | Contenido |
|-------|------------|
| **Rationale** | Cookie httpOnly hoy no usada por el cliente; token en `localStorage` expone a XSS; refresh pendiente (`auth-audit` A3, A7). |
| **Impacto** | Postura de seguridad de toda la app. |
| **Prioridad** | P0 |
| **Riesgos** | Cookie + refresh exige CSRF strategy; **elegir** opción A (access en memoria + refresh httpOnly + CSRF) vs B (localStorage con mitigaciones CSP/strict). |

### DEC-AUTH-003 — PENDIENTE: proveedor OAuth único (D2 / BD3)

| Campo | Contenido |
|-------|------------|
| **Rationale** | Passport (rutas muertas) vs Firebase usado por el frontend (`auth-audit` A2). |
| **Impacto** | Menos superficie de ataque y dependencias. |
| **Prioridad** | P1 |
| **Riesgos** | Migrar usuarios vinculados a estrategia eliminada; **elegir** Firebase (recomendado en audit) vs Passport. |

### DEC-AUTH-004 — PENDIENTE: rol administrador (D4 / BD2)

| Campo | Contenido |
|-------|------------|
| **Rationale** | Enum de `User` sin `administrador` pero rutas y código lo asumen (`auth-audit` C4). |
| **Impacto** | Autorización coherente o eliminación de código muerto. |
| **Prioridad** | P0 |
| **Riesgos** | **Elegir** A (añadir rol + rutas admin) vs B (eliminar rol y checks). |

### DEC-AUTH-005 — OAuth callback: prohibido persistir JWT en query string

| Campo | Contenido |
|-------|------------|
| **Rationale** | Token en URL → logs, Referer, historial (`auth-audit` C8). |
| **Impacto** | Reduce exfiltración trivial. |
| **Prioridad** | P0 |
| **Riesgos** | Requiere acuerdo backend+frontend (cookie de un solo uso, intercambio por código, etc.). |

### DEC-AUTH-006 — Verificación de email obligatoria o modelo de estado explícito

| Campo | Contenido |
|-------|------------|
| **Rationale** | Login sin chequear `verificado` (`auth-audit` C5). |
| **Impacto** | Integridad de cuentas y mitigación de suplantación. |
| **Prioridad** | P0 |
| **Riesgos** | Usuarios existentes no verificados quedan bloqueados; plan de migración y re-envío. |

### DEC-AUTH-007 — PENDIENTE: linking cuenta OAuth ↔ local (D6)

| Campo | Contenido |
|-------|------------|
| **Rationale** | Auto-link por email = takeover (`auth-audit` M16). |
| **Impacto** | Seguridad de cuentas con email compartido entre proveedores. |
| **Prioridad** | P1 |
| **Riesgos** | UX más pesada (flujo explícito de vinculación); **elegir** opción recomendada en audit (no auto-link). |

### DEC-AUTH-008 — PENDIENTE: política de contraseñas (D7)

| Campo | Contenido |
|-------|------------|
| **Rationale** | Mínimo 6 y composición débil; desalineación UI cosmética vs backend (`auth-audit` C11, D7). |
| **Impacto** | Seguridad y mensajes coherentes. |
| **Prioridad** | P1 |
| **Riesgos** | Usuarios con passwords existentes débiles; reset forzado o validación solo en cambio. **Elegir** política (longitud + complejidad vs NIST). |

### DEC-AUTH-009 — Auditoría de eventos de seguridad

| Campo | Contenido |
|-------|------------|
| **Rationale** | `auth-audit` propone `AuthEvent` (login fallido, cambio rol, etc.). |
| **Impacto** | Cumplimiento operativo, detección de abuso. |
| **Prioridad** | P2 |
| **Riesgos** | Volumen de escrituras; retención y PII en logs. |

---

## 6. Estrategia performance

### DEC-PERF-001 — Imágenes: componente único + `srcset` / Cloudinary

| Campo | Contenido |
|-------|------------|
| **Rationale** | `ProductImage` y `buildResponsiveSrcSet` existen pero no se usan (`products-audit`, `home-audit`). |
| **Impacto** | LCP/CLS mejores en catálogo y home. |
| **Prioridad** | P1 |
| **Riesgos** | URLs transformadas duplicadas en modelo+helper+frontend hasta decidir capa única (products D9). |

### DEC-PERF-002 — Code splitting de rutas (`React.lazy` + `Suspense`)

| Campo | Contenido |
|-------|------------|
| **Rationale** | `home-audit` B5; `frontend-refactor-roadmap` F5. |
| **Impacto** | Bundle inicial −30–50% orientativo. |
| **Prioridad** | P2 |
| **Riesgos** | Waterfalls si cada chunk dispara secuencias mal planeadas; medir con Lighthouse. |

### DEC-PERF-003 — Lista y búsqueda: debounce y menos refetch

| Campo | Contenido |
|-------|------------|
| **Rationale** | Cada tecla dispara fetch en catálogo (`products-audit` A12, M10). |
| **Impacto** | Menos carga en API y mejor UX móvil. |
| **Prioridad** | P1 |
| **Riesgos** | Retraso perceptible si debounce >400ms; usar 250–350ms y cancelación (AbortController). |

### DEC-PERF-004 — Hero y viewport: unidades `svh` donde aplique

| Campo | Contenido |
|-------|------------|
| **Rationale** | iOS Safari + `min-h-[80vh]` causa jank (`home-audit` M2). |
| **Impacto** | Menos layout shift en móvil. |
| **Prioridad** | P2 |
| **Riesgos** | Soporte legacy de navegadores; proporcionar fallback documentado. |

### DEC-PERF-005 — Backend: consultas lean, índices, paralelización medida

| Campo | Contenido |
|-------|------------|
| **Rationale** | `database-rules.mdc`, `backend-rules.mdc`; detalle producto hace queries secuenciales (`products-audit` A17, A18). |
| **Impacto** | p95 de lectura mejor; coste Mongo reducido. |
| **Prioridad** | P1 |
| **Riesgos** | `Promise.all` sin límites puede saturar conexiones; acotar concurrencia en agregaciones pesadas. |

### DEC-PERF-006 — PENDIENTE: endpoints semánticos y cache HTTP (BD5)

| Campo | Contenido |
|-------|------------|
| **Rationale** | Home abusa `getProducts`; stats públicas podrían cachearse 1h (`home-audit`, `backend-refactor` B6). |
| **Impacto** | Menos carga y mejor TTFB en secciones estáticas. |
| **Prioridad** | P2 |
| **Riesgos** | Datos stale; definir `Cache-Control` por recurso. |

---

## 7. Convenciones de naming

### DEC-NAM-001 — Archivos y carpetas en frontend: PascalCase para componentes, camelCase para hooks

| Campo | Contenido |
|-------|------------|
| **Rationale** | Convención habitual en React + coherencia con código existente; `project-rules` pide nombres descriptivos. |
| **Impacto** | Imports predecibles. |
| **Prioridad** | P3 |
| **Riesgos** | Mezcla actual `NewHomePage` / `WompiReturnPageFixed`; renombrar en hitos dedicados. |

### DEC-NAM-002 — Backend: preferir un idioma para símbolos de código

| Campo | Contenido |
|-------|------------|
| **Rationale** | Mezcla `obtenerProductos` / `getProductById` (`products-audit` B10). |
| **Impacto** | Grepeo y onboarding. |
| **Prioridad** | P2 |
| **Riesgos** | Refactor masivo; aplicar “archivos tocados migran a convención” o epic dedicado. |

### DEC-NAM-003 — API REST: recursos en plural y kebab-case en URLs

| Campo | Contenido |
|-------|------------|
| **Rationale** | `api-rules.mdc` (RESTful, nombres consistentes). |
| **Impacto** | URLs legibles y alineadas a documentación futura. |
| **Prioridad** | P2 |
| **Riesgos** | Rutas legacy en español mezcladas (`/reenviar-codigo`); **plan de deprecación** alineado a DEC-API-002. |

### DEC-NAM-004 — Tipos TypeScript alineados al contrato real (no “tipos mentirosos”)

| Campo | Contenido |
|-------|------------|
| **Rationale** | `imagenes`, `especificaciones`, estadísticas (`products-audit` C3–C6). |
| **Impacto** | TypeScript vuelve a ser herramienta de seguridad de tipos. |
| **Prioridad** | P0 |
| **Riesgos** | Muchos `any` a corregir; hacerlo al cerrar contrato backend. |

---

## 8. Reglas de componentes

### DEC-COMP-001 — Máximo 250 líneas por archivo de componente

| Campo | Contenido |
|-------|------------|
| **Rationale** | `frontend-rules.mdc`. |
| **Impacto** | Mantenibilidad. |
| **Prioridad** | P2 |
| **Riesgos** | Ver DEC-FE-003. |

### DEC-COMP-002 — Separar presentación y orquestación (hooks dedicados)

| Campo | Contenido |
|-------|------------|
| **Rationale** | `frontend-rules.mdc` (“Separar lógica y presentación”). |
| **Impacto** | Pruebas y reutilización de `useHomeData`, `useProducts`, etc. |
| **Prioridad** | P2 |
| **Riesgos** | Over-hooking: mantener hooks con un propósito claro. |

### DEC-COMP-003 — `ProductCard` único con variants

| Campo | Contenido |
|-------|------------|
| **Rationale** | Cinco implementaciones inline (`products-audit` A1); home comparte necesidad (`home-audit`). |
| **Impacto** | Un solo lugar para LCP, badges, accesibilidad de enlaces. |
| **Prioridad** | P1 |
| **Riesgos** | Props explosion; usar `variant` + composición limitada. |

### DEC-COMP-004 — Evitar props innecesarias y componentes “Dios”

| Campo | Contenido |
|-------|------------|
| **Rationale** | `frontend-rules.mdc`; `Navbar` masivo (`ui-system-audit`). |
| **Impacto** | Claridad de responsabilidades. |
| **Prioridad** | P2 |
| **Riesgos** | Refactor de Navbar puede ser sensible; hacer por subcomponentes (`UserMenu`, etc.). |

### DEC-COMP-005 — Primitivos UI para cualquier interacción repetida (≥3 copias)

| Campo | Contenido |
|-------|------------|
| **Rationale** | Regla práctica derivada de duplicación masiva de botones/cards (`ui-system-audit`). |
| **Impacto** | Evita divergencia visual/ARIA. |
| **Prioridad** | P2 |
| **Riesgos** | Abstracción prematura si solo hay 2 copias; la regla es orientativa. |

---

## 9. Reglas responsive

### DEC-RESP-001 — Mobile first en nuevos layouts

| Campo | Contenido |
|-------|------------|
| **Rationale** | `frontend-rules.mdc` (“Responsive first / Mobile first”). |
| **Impacto** | Mejor UX en el tráfico mayoritario móvil. |
| **Prioridad** | P2 |
| **Riesgos** | Desktop “sub-aprovechado” si no se planean breakpoints `md/lg/xl`. |

### DEC-RESP-002 — Contenedor máximo único (`ContentContainer` / `max-w-7xl` documentado)

| Campo | Contenido |
|-------|------------|
| **Rationale** | Conflicto `.container` en CSS vs Tailwind (`home-audit` A6). |
| **Impacto** | Alineación visual entre home, catálogo y marketing. |
| **Prioridad** | P1 |
| **Riesgos** | Cambio global afecta densidad; revisar dashboards. |

### DEC-RESP-003 — Filtros del catálogo accesibles en tablet

| Campo | Contenido |
|-------|------------|
| **Rationale** | Sidebar oculto sin alternativa en rango `md` (`products-audit` M8). |
| **Impacto** | Recuperación de usabilidad en 768–1024px. |
| **Prioridad** | P1 |
| **Riesgos** | Drawer adicional en tablet incrementa complejidad de estado. |

### DEC-RESP-004 — Layout público: compensar navbar fijo (`pt` / hero) de forma explícita

| Campo | Contenido |
|-------|------------|
| **Rationale** | Colisión `PublicLayout` `pt-32` vs hero `80vh` (`home-audit` M1). |
| **Impacto** | Menos contenido cortado bajo barra fija. |
| **Prioridad** | P2 |
| **Riesgos** | Ajustes distintos por página; preferir token de “offset de header” en layout. |

---

## 10. Reglas de animaciones

### DEC-ANIM-001 — Animaciones sutiles; prohibido “show” de efectos concurrentes

| Campo | Contenido |
|-------|------------|
| **Rationale** | `ui-rules.mdc`, `frontend-rules.mdc` (evitar gradients/animaciones exageradas); home tenía 8+ animaciones simultáneas (`home-audit` M4). |
| **Impacto** | Percepción premium, menos jank CPU/GPU. |
| **Prioridad** | P2 |
| **Riesgos** | Marketing puede pedir “más show”; negociar con métricas de performance. |

### DEC-ANIM-002 — Máximo de gradientes por página (referencia: 2 en home/catálogo post-refactor)

| Campo | Contenido |
|-------|------------|
| **Rationale** | `home-audit` F5, `products-audit` M1; alineado a `ui-rules` (evitar saturación). |
| **Impacto** | Consistencia visual y legibilidad. |
| **Prioridad** | P2 |
| **Riesgos** | Subjetivo; documentar excepciones por landing temporal con aprobación explícita. |

### DEC-ANIM-003 — Hover: preferir translate/opacity leves; evitar scale agresivo en grids densos

| Campo | Contenido |
|-------|------------|
| **Rationale** | `hover:-translate-y-2` + `scale-110` en cada card causa jank (`products-audit` M3). |
| **Impacto** | Scroll más fluido en catálogo. |
| **Prioridad** | P2 |
| **Riesgos** | Perder “wow” superficial; compensar con fotografía y tipografía. |

### DEC-ANIM-004 — Eliminar keyframes CSS huérfanos al eliminar la última pantalla que los usa

| Campo | Contenido |
|-------|------------|
| **Rationale** | `home-audit` B3, F6 — animaciones solo para NewHomePage. |
| **Impacto** | CSS bundle más limpio. |
| **Prioridad** | P3 |
| **Riesgos** | Algún import dinámico podría referenciar clase legacy; grep antes de borrar. |

---

## 11. Estrategia de estado global

### DEC-STATE-001 — Zustand para estado de cliente autenticado y carrito (dominio actual)

| Campo | Contenido |
|-------|------------|
| **Rationale** | Ya existe `authStore`, `cartStore` en auditorías; `frontend-rules` pide estado organizado. |
| **Impacto** | Menos boilerplate que Redux para el tamaño actual del proyecto. |
| **Prioridad** | P2 |
| **Riesgos** | Persistencia parcial en auth sin TTL (`auth-audit` A12); alinear con DEC-AUTH-002. |

### DEC-STATE-002 — No duplicar estado servidor en Zustand sin política de invalidación

| Campo | Contenido |
|-------|------------|
| **Rationale** | Riesgo de doble fuente de verdad si se introduce Query/SWR sin convención (§1 DEC-FE-007). |
| **Impacto** | Datos frescos tras crear/editar producto o perfil. |
| **Prioridad** | P1 |
| **Riesgos** | Complejidad; patrón recomendado: “servidor en Query, UI ephemeral en Zustand”. |

### DEC-STATE-003 — Estado de UI transversal (modales, drawers) local o context acotado

| Campo | Contenido |
|-------|------------|
| **Rationale** | Evitar “global store” para cada modal; `ui-system` sugiere primitivos `Modal`. |
| **Impacto** | Menos renders globales innecesarios. |
| **Prioridad** | P3 |
| **Riesgos** | Prop drilling; usar context por subárbol (checkout) cuando duela el drilling. |

### DEC-STATE-004 — Categorías: store o cache de primer nivel tras DEC-FE-007 resuelto

| Campo | Contenido |
|-------|------------|
| **Rationale** | Tres–cuatro fetches idénticos al navegar (`products-audit` A4). |
| **Impacto** | Menos latencia y trabajo en backend. |
| **Prioridad** | P1 |
| **Riesgos** | Stale categories; TTL o invalidación al admin de categorías. |

---

## 12. Estrategia de manejo de errores

### DEC-ERR-001 — Errores de red: distinguir vacío vs error vs “sin resultados”

| Campo | Contenido |
|-------|------------|
| **Rationale** | Home traga errores en `Promise.all` (`home-audit` C4); catálogo empty state genérico (`products-audit` M12). |
| **Impacto** | Usuario puede reintentar; soporte recibe menos tickets confusos. |
| **Prioridad** | P1 |
| **Riesgos** | Copy y traducciones a mantener. |

### DEC-ERR-002 — `Promise.allSettled` (o equivalente) para datos multi-bloque en páginas compuestas

| Campo | Contenido |
|-------|------------|
| **Rationale** | `home-audit` Fase 1; evita que una API caída vacíe todo el landing. |
| **Impacto** | Resiliencia parcial por sección. |
| **Prioridad** | P1 |
| **Riesgos** | UI más compleja (por sección); definir patrón de error boundary por sección. |

### DEC-ERR-003 — Interceptor HTTP: no usar `window.location` como única recuperación de 401

| Campo | Contenido |
|-------|------------|
| **Rationale** | Pierde estado SPA y rompe flujos (`auth-audit` A13); sustituir por logout + navegación programática cuando exista refresh (roadmaps). |
| **Impacto** | UX coherente con React Router. |
| **Prioridad** | P1 |
| **Riesgos** | Sin refresh token, aún habrá redirect; documentar transición en dos fases. |

### DEC-ERR-004 — Anti-enumeración en recuperación y reenvío de códigos

| Campo | Contenido |
|-------|------------|
| **Rationale** | Diferencias 404/500 filtran existencia de email (`auth-audit` C12); alinear respuestas en Fase 1 auth. |
| **Impacto** | Privacidad de usuarios. |
| **Prioridad** | P0 |
| **Riesgos** | Debugging más difícil para soporte; correlacionar con `requestId` interno en logs. |

### DEC-ERR-005 — Formato API estándar + capa de mapeo en cliente

| Campo | Contenido |
|-------|------------|
| **Rationale** | `api-rules` + eliminación de parsing defensivo disperso (`products-audit` A4). |
| **Impacto** | Mensajes de error homogéneos en toasts y formularios. |
| **Prioridad** | P1 |
| **Riesgos** | Migración gradual de endpoints no estándar. |

---

## 13. Estrategia de loading / skeletons

### DEC-LOAD-001 — Sustituir spinners fullscreen en listas por skeletons de layout

| Campo | Contenido |
|-------|------------|
| **Rationale** | CLS alto en catálogo (`products-audit` M4); `frontend-rules` exige loading elegante. |
| **Impacto** | Percepción de velocidad y estabilidad visual. |
| **Prioridad** | P1 |
| **Riesgos** | Diseñar skeleton que coincida con grid real para no “saltar” al hidratar. |

### DEC-LOAD-002 — Spinner único (`LoadingSpinner`) para acciones puntuales e inline

| Campo | Contenido |
|-------|------------|
| **Rationale** | `ui-system-audit` valora `LoadingSpinner`; hay `animate-spin` disperso. |
| **Impacto** | Coherencia visual. |
| **Prioridad** | P2 |
| **Riesgos** | No usar spinner grande para operaciones >2s sin mensaje; combinar con copy. |

### DEC-LOAD-003 — Botones con estado `loading` y `disabled` en primitivo `Button`

| Campo | Contenido |
|-------|------------|
| **Rationale** | `ui-system-roadmap` U1; evita doble submit en pagos y forms. |
| **Impacto** | Menos condiciones de carrera en checkout. |
| **Prioridad** | P1 |
| **Riesgos** | Debe integrarse con librería de forms (§15). |

### DEC-LOAD-004 — Imágenes: skeleton en `ProductImage` como estándar

| Campo | Contenido |
|-------|------------|
| **Rationale** | Componente ya existe, no usado (`products-audit` A2). |
| **Impacto** | Mejor CLS en cards. |
| **Prioridad** | P1 |
| **Riesgos** | Ver DEC-PERF-001 por doble transformación de URL. |

---

## 14. Estrategia de fetch / cache

### DEC-DATA-001 — Debounce en búsqueda de catálogo (300ms referencia)

| Campo | Contenido |
|-------|------------|
| **Rationale** | `products-audit` A12, M10; alinea con DEC-PERF-003. |
| **Impacto** | Menos carga y mejor UX. |
| **Prioridad** | P1 |
| **Riesgos** | Cancelación de requests obsoletos obligatoria para evitar condiciones de carrera. |

### DEC-DATA-002 — Cache de lectura para taxonomías (categorías) y datos de home “casi estáticos”

| Campo | Contenido |
|-------|------------|
| **Rationale** | Múltiples `getActiveCategories` (`products-audit` A4); stats públicas podrían ser HTTP cache (`home-audit` D1). |
| **Impacto** | Reducción de RPS. |
| **Prioridad** | P1 |
| **Riesgos** | Datos desactualizados; documentar TTL y eventos de invalidación. |

### DEC-DATA-003 — PENDIENTE: política de revalidación tras mutación (CRUD producto, perfil)

| Campo | Contenido |
|-------|------------|
| **Rationale** | Sin convención, Query y Zustand pueden desincronizar (`DEC-STATE-002`). |
| **Impacto** | Coherencia post-acción. |
| **Prioridad** | P1 tras elegir stack de datos |
| **Riesgos** | **Elegir** entre invalidación explícita, optimistic update con rollback, o refetch simple. |

### DEC-DATA-004 — AbortController / cancelación en navegación rápida entre rutas

| Campo | Contenido |
|-------|------------|
| **Rationale** | Evita setState sobre componente desmontado en SPA rápidas. |
| **Impacto** | Menos warnings y bugs esporádicos. |
| **Prioridad** | P2 |
| **Riesgos** | axios v1 cancel API vs v0; unificar helper `withAbort(signal)`. |

### DEC-DATA-005 — No confiar en endpoints no montados en backend

| Campo | Contenido |
|-------|------------|
| **Rationale** | Ocho métodos en `productService` apuntan a 404 (`products-audit` C1). |
| **Impacto** | Elimina confusión y falsas expectativas; fuerza decisión BD5. |
| **Prioridad** | P0 |
| **Riesgos** | Algún código muerto que “parecía” feature; grep antes de borrar exports. |

---

## 15. Estrategia de formularios

### DEC-FORM-001 — `react-hook-form` como estándar para formularios no triviales

| Campo | Contenido |
|-------|------------|
| **Rationale** | `ui-system-roadmap` U1 ya asume integración; uso extendido en forms grandes (`ui-system-audit`). |
| **Impacto** | Menos re-renders, validación local coherente. |
| **Prioridad** | P2 |
| **Riesgos** | Forms legacy sin RHF migran solo al tocarse (Boy Scout). |

### DEC-FORM-002 — Primitivos `Field` unificados (label, error, helper) + `aria-describedby`

| Campo | Contenido |
|-------|------------|
| **Rationale** | Accesibilidad no negociable en primitivos (`ui-system-roadmap`); hoy inputs dispersos. |
| **Impacto** | WCAG, mejor UX de error. |
| **Prioridad** | P1 |
| **Riesgos** | Integración con RHF `Controller`/`register` debe documentarse con 2–3 ejemplos canónicos. |

### DEC-FORM-003 — Validación: esquema único compartido cliente/servidor cuando sea posible

| Campo | Contenido |
|-------|------------|
| **Rationale** | Desalineación auth rompió flows (`auth-audit`); producto `especificaciones` array vs record (`products-audit` C4). |
| **Impacto** | Menos drift; ideal Zod/Yup en front + mirror en express-validator (decisión de librería pendiente). |
| **Prioridad** | P2 |
| **Riesgos** | Duplicación si no hay monorepo compartido; mitigar con tests de contrato. |

### DEC-FORM-004 — Nunca inventar datos de referencia en fallback (ObjectIds falsos)

| Campo | Contenido |
|-------|------------|
| **Rationale** | `ProductForm` con categorías inventadas (`products-audit` C8). |
| **Impacto** | Integridad de datos en Mongo. |
| **Prioridad** | P0 |
| **Riesgos** | UX dura si la API falla; mostrar error y retry es preferible a datos falsos. |

### DEC-FORM-005 — Wizard / secciones para forms >250 líneas o >10 campos visibles

| Campo | Contenido |
|-------|------------|
| **Rationale** | `ProfilePage` y merchant forms masivos (`ui-system-audit`); cumplir `frontend-rules`. |
| **Impacto** | Mejor completitud de flujos largos. |
| **Prioridad** | P2 |
| **Riesgos** | Estado parcial entre pasos; persistir draft en paso largo (opcional, producto). |

### DEC-FORM-006 — Política de submit idempotente en pagos

| Campo | Contenido |
|-------|------------|
| **Rationale** | Checkout/Wompi son flujos de alto riesgo (`ui-system` migración prioritaria). |
| **Impacto** | Menos doble cargo / doble orden. |
| **Prioridad** | P0 |
| **Riesgos** | Requiere claves idempotency en backend; coordinar con reglas de API de pagos (fuera de alcance detallado aquí). |

---

## Matriz rápida: prioridad agregada

| Prioridad | Temas |
|-----------|--------|
| **P0** | Seguridad auth, secretos, CORS, mock Firebase, JWT en URL, contraseñas/logs, contrato idioma campos, doble export helpers, linking OAuth, enumeración, ObjectIds falsos, notificaciones invisibles checkout, duplicados críticos Tailwind |
| **P1** | Cliente HTTP único, env central, paginación/sort contrato, URL state catálogo, services backend, validación amplia, ProductCard único, errores resilientes, skeletons, debounce, cache categorías, Field primitives |
| **P2** | Query/SWR, modularización, SEO cliente, icon set, animaciones/gradientes, Storybook, naming backend, forms RHF ampliado |
| **P3** | Versionado API público, theming avanzado, limpieza animaciones CSS huérfanas |

---

## Bitácora de decisiones cerradas

| Fecha | ID | Decisión tomada | Notas |
|-------|-----|-----------------|-------|
| 2026-05-15 | DEC-FE-007 | **TanStack Query v5** (`@tanstack/react-query`) | Provider en `App.tsx`, keys en `lib/query/queryKeys.ts`, hooks por feature. Zustand solo auth/carrito con sync cache. Ver `docs/architecture/query-architecture.md`. |
| — | — | — | Registrar aquí cada resolución de ítems **PENDIENTE** (BE-007, UI-004–007, API-002, AUTH-002–004, PERF-006, DATA-003 parcial vía invalidación Query). |

---

## Referencias cruzadas

- Auditorías: `docs/audits/auth-audit.md`, `home-audit.md`, `products-audit.md`, `ui-system-audit.md`
- Roadmaps: `docs/roadmap/frontend-refactor-roadmap.md`, `backend-refactor-roadmap.md`, `ui-system-roadmap.md`
- Reglas: `.cursor/rules/project-rules.mdc`, `api-rules.mdc`, `backend-rules.mdc`, `frontend-rules.mdc`, `ui-rules.mdc`, `database-rules.mdc`
