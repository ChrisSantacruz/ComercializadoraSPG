# Mapa de riesgos — refactor

**Estado:** planificación.  
**Última actualización:** 2026-05-14.  
**Leyenda probabilidad/impacto:** Bajo / Medio / Alto (cualitativo, según auditorías).

---

## 1. Riesgos de seguridad y cumplimiento

| ID | Riesgo | Probabilidad | Impacto | Mitigación (documental) |
|----|--------|--------------|---------|-------------------------|
| RS-01 | `JWT_SECRET` con fallback predecible si falta env | Medio | Alto | Fail-fast al arranque (auth-audit F0). |
| RS-02 | Endpoint backdoor super-admin con secreto hardcodeado | Bajo si repo privado; Alto si expuesto | Crítico | Eliminar de runtime; script CLI aislado (auth-audit). |
| RS-03 | CORS permite cualquier origen con log | Alto en despliegue mal configurado | Alto | Lista blanca estricta en prod (auth-audit). |
| RS-04 | Firebase Admin en “mock” acepta tokens sin verificar | Medio si init falla | Crítico | 503 en prod si `auth` null (auth-audit). |
| RS-05 | JWT en querystring OAuth | Medio | Alto | Cookie one-time / intercambio código (auth-audit F1). |
| RS-06 | `seleccionar-rol` sin autenticación fuerte | Medio | Alto | Token transición `rol_pending` (auth-audit). |
| RS-07 | Auto-link OAuth por email (takeover) | Medio | Alto | DEC-AUTH-007 / auth-audit M16. |
| RS-08 | Logs con body de `/auth` y passwords | Medio | Alto | Redacción + logger estructurado (DEC-BE-004). |
| RS-09 | Rate limit global con `skipSuccessfulRequests` | Alto | Alto | Limiter dedicado login (auth-audit C10). |

---

## 2. Riesgos de integridad de datos y contrato

| ID | Riesgo | Impacto | Mitigación |
|----|--------|---------|------------|
| RD-01 | ObjectIds de categoría inventados en fallback de formulario | Productos huérfanos / no listados | Eliminar fallback; error UI (products-audit C8, DEC-FORM-004). |
| RD-02 | `especificaciones` array vs form Record | Pérdida silenciosa al editar | Contrato único + migración tipos (products-audit C4). |
| RD-03 | Doble `module.exports` en helpers | Export “invisible” / bugs latentes | Unificar exports (products-audit C7, DEC-BE-006). |
| RD-04 | Tres formatos de lista productos | Drift entre pantallas | Unificar `{ datos, paginacion }` (products-audit C10, DEC-BE-005). |

---

## 3. Riesgos de producto y confianza del usuario

| ID | Riesgo | Impacto | Mitigación |
|----|--------|---------|------------|
| RP-01 | Stats de marketing hardcodeadas | Información falsa / legal | API stats o quitar (home-audit C3, D1). |
| RP-02 | Badge “OFERTA” por tag sin precio promocional real | Engaño percibido | Modelo `precioOferta` / `promocion` o copy honesto (products-audit A9). |
| RP-03 | Marca contradictoria (AndinoExpress vs SPG) | Confianza | DEC-UI-008 / home-audit C2. |
| RP-04 | `FavoritesPage` / `AddressesPage` placeholder | Frustración dashboard | Completar o ocultar del nav (ui-system-audit). |

---

## 4. Riesgos operativos y de regresión en refactor

| ID | Riesgo | Impacto | Mitigación |
|----|--------|---------|------------|
| RO-01 | Cambiar contrato API sin ventana coordinada FE+BE | Outages parciales | Dual-read temporal o feature flag mínimo documentado (backend-refactor §4). |
| RO-02 | Big-bang UI en home/catálogo | Regresión visual | Fases mergeables (home/products audits). |
| RO-03 | Introducir React Query sin convención con Zustand | Doble fuente de verdad | DEC-STATE-002, DEC-FE-007 cerrados antes. |
| RO-04 | Tocar checkout antes de unificar notificaciones | Pagos “silenciosos” o dobles mensajes | Carril C antes de re-skin checkout (ui-system-roadmap). |

---

## 5. Riesgos de performance y coste

| ID | Riesgo | Impacto | Mitigación |
|----|--------|---------|------------|
| RF-01 | Búsqueda sin debounce | Carga API + UX móvil | DEC-PERF-003, AbortController (DEC-DATA-004). |
| RF-02 | Detalle producto queries secuenciales | p95 alto | `Promise.all` acotado en service (products-audit A17, DEC-PERF-005). |
| RF-03 | Imágenes full-res en cards | LCP malo | `ProductImage` + `buildResponsiveSrcSet` (DEC-PERF-001). |
| RF-04 | Categorías refetch por navegación | RPS innecesario | Cache / store taxonomías (DEC-STATE-004). |

---

## 6. Riesgos legales / SEO

| ID | Riesgo | Impacto | Mitigación |
|----|--------|---------|------------|
| RL-01 | Catálogo invisible a crawlers (SPA sin meta) | Adquisición | Helmet/JSON-LD + sitemap (products-audit M18, F6). |
| RL-02 | URLs solo por Mongo `_id` | CTR en SERP pobre | Slug + redirect 301 (products-audit A16, D7). |

---

## 7. Matriz resumida impacto vs esfuerzo (estratégica)

Tomada de `auth-audit` §8 y sintetizada con roadmaps: **Auth Fase 0** = bajo esfuerzo / crítico impacto seguridad; **Auth Fase 3** refresh = alto esfuerzo / alto impacto; **Products F0** = medio esfuerzo / desbloquea tipos y sorts; **UI notificaciones** = bajo–medio esfuerzo / alto impacto percepción checkout.

---

## 8. Referencias

- `docs/audits/auth-audit.md` (C1–C15, M1–M16)  
- `docs/audits/products-audit.md` (C1–C11, A11–A20, M5–M18)  
- `docs/audits/ui-system-audit.md` (notificaciones, tokens)  
- `docs/roadmap/decisions.md` (matriz P0–P3 agregada)
