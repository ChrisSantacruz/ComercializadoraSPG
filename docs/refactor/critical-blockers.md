# Bloqueadores críticos — antes de nuevas features

**Estado:** planificación.  
**Última actualización:** 2026-05-14.  
**Criterio:** ítem que hace **imposible recomendar** seguir acumulando features sin incrementar deuda de seguridad, datos o feedback monetario.

---

## 1. Lista ordenada (ejecutar en este orden lógico)

1. **P0 — Seguridad servidor inmediata**  
   Quitar o sustituir: fallback `JWT_SECRET`, endpoint `create-super-admin` en runtime, CORS “permitir todo”, logging de bodies en rutas auth/pago, mock Firebase en producción.  
   *Fuente:* `auth-audit` fase 0; `decisions.md` DEC-AUTH-001, DEC-BE-004.

2. **P0 — Feedback visible en checkout y carrito**  
   Unificar sistema de notificaciones O montar explícitamente el viewport que falta; resolver `react-hot-toast` sin `<Toaster />` vs migrar a canal único.  
   *Fuente:* `ui-system-audit` §6.2; `decisions.md` DEC-UI-004.

3. **P0 — Contrato API idioma único (auth + convención global)**  
   Sin cerrar esto, cualquier endpoint nuevo duplica riesgo es/en. Bloquea cambio/reset password ya rotos.  
   *Fuente:* `auth-audit` C6–C7, A1; `decisions.md` DEC-API-002.

4. **P0 — Integridad: eliminar fallbacks falsos en datos de referencia**  
   ObjectIds de categorías inventados en `ProductForm`; stats hardcodeadas si no hay fuente real.  
   *Fuente:* `products-audit` C8; `home-audit` C3; `decisions.md` DEC-FORM-004.

5. **P0 — Helpers compartidos: un solo `module.exports` en `helpers.js`**  
   Evita exports fantasmas y divergencia `successResponse`/paginación.  
   *Fuente:* `products-audit` C7; `decisions.md` DEC-BE-006.

6. **P0 — Sesión y tokens: JWT en URL y firma `generarTokenAcceso` incorrecta en OAuth**  
   Exfiltración y rol basura en payload.  
   *Fuente:* `auth-audit` C8–C9.

7. **P0 — Autorización y modelo: decisión explícita sobre rol `administrador`**  
   Enum Mongoose vs `authorize('administrador')` en rutas.  
   *Fuente:* `auth-audit` C4; `decisions.md` DEC-AUTH-004.

8. **P0 — Verificación de email: modelo coherente con login**  
   Hoy se puede usar cuenta no verificada según audit.  
   *Fuente:* `auth-audit` C5; `decisions.md` DEC-AUTH-006.

9. **P0 — Cliente producto: endpoints fantasma o implementación real**  
   Ocho rutas en `productService` sin backend → confusión y 404 si alguien las usa; alinear con BD5.  
   *Fuente:* `products-audit` C1; `decisions.md` DEC-DATA-005.

10. **P0 — Enumeración y `seleccionar-rol` abierto**  
    Ajuste de respuestas + token de transición.  
    *Fuente:* `auth-audit` C12, C14; `decisions.md` DEC-ERR-004.

---

## 2. Bloqueadores “P0 de tokens UI” (paralelizables con backend si hay dos devs)

- **Tailwind `accent` / `fontFamily` duplicados** — comportamiento de color/tipo impredecible.  
  *Fuente:* `ui-system-audit` §5.1; `decisions.md` DEC-UI-002.

---

## 3. No son bloqueadores inmediatos pero bloquean “arquitectura limpia”

| Ítem | Prioridad | Nota |
|------|-----------|------|
| Capa `services/` en backend | P1 | `backend-rules.mdc` |
| `fetch` → `api` axios en auth y notificaciones | P1 | grep actual en repo |
| `useSearchParams` en `/productos` | P1 | links desde home |
| `ProductCard` unificado | P1 | cinco implementaciones inline |
| Refresh tokens + política almacenamiento | P1–P0 según postura seguridad | `decisions.md` DEC-AUTH-002 |

---

## 4. Verificación rápida repo (2026-05-14)

- **Stores:** solo `authStore.ts` y `cartStore.ts` en `frontend/src/stores/` — no hay duplicado de store de carrito; el bloqueo es **duplicación de fetching** de categorías sin política de cache.  
- **Rutas Wompi montadas:** `AppRoutes` usa solo `WompiReturnPageFixed` para `payment/wompi/return`, `wompi-return`, `order-confirmation`. Otros archivos Wompi son deuda de consolidación.  
- **`fetch` en `src`:** presente en auth (varias páginas), `NotificationCenter`, utils — refuerza bloqueador #3 y unificación HTTP.

---

## 5. Criterio de “desbloqueo” para features nuevas

Se considera razonable retomar **features netas** cuando:

- Se cerraron los ítems **1–2** (seguridad mínima + feedback checkout).  
- Se cerró **3** (idioma contrato) **o** cada feature nueva incluye contrato explícito en OpenAPI/README y tests de contrato.  
- No quedan **P0** abiertos en `docs/roadmap/decisions.md` matriz § sin decisión registrada para el área tocada.

---

## 6. Referencias

- `docs/refactor/master-refactor-plan.md`  
- `docs/refactor/risk-map.md`  
- `docs/refactor/dependency-map.md`  
- `docs/roadmap/decisions.md`  
- Auditorías completas en `docs/audits/`
