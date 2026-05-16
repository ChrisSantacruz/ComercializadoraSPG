# Auditoría de preparación para release local

**Fecha:** 2026-05-15  
**Alcance:** estabilidad local, env, integración FE↔BE, documentación de arranque — **sin** refactor grande ni nueva arquitectura.

---

## 1. Resumen ejecutivo

| Área | Estado | Notas |
|------|--------|-------|
| Build frontend (`npm run build`) | **OK** | Warnings ESLint `react-hooks/exhaustive-deps` en ~7 archivos; no rompen build |
| Sintaxis backend (`node --check server.js`) | **OK** | — |
| Arranque backend (`npm run dev` / `node server.js`) | **OK** (en máquina con Mongo y `.env`) | Puerto por defecto **5001**; logs estructurados |
| Alineación API URL | **Corregido** | Mismo origen FE/BE documentado en `.env.example` |
| Seguridad JWT en prod | **Endurecido** | Falta `JWT_SECRET` → proceso aborta si `NODE_ENV=production` |
| Health | **Mejorado** | `GET /api/health` incluye estado Mongo; `503` si no conectado |
| Logging sensible (upload / DB) | **Mejorado** | Menos `console.log` crítico en arranque de upload y conexión Mongo |

---

## 2. Variables de entorno documentadas

- **`backend/.env.example`:** actualizado con `JWT_REFRESH_SECRET`, rate limit, CORS, bootstrap admin, SendGrid, comentarios Wompi y notas de seguridad.
- **`frontend/.env.example`:** nuevo — `REACT_APP_API_URL`, `REACT_APP_WOMPI_PUBLIC_KEY`, `REACT_APP_ENV`.

---

## 3. Integración y contratos

- Cliente HTTP canónico `frontend/src/services/api.ts` + `config/env.ts` (`API_BASE`).
- **TanStack Query** (v5): defaults globales en `lib/query/queryClient.ts` — coherente con guías oficiales (`staleTime` / `gcTime` / `retry` / desactivar retries en tests cuando aplique).
- **React Router 7** + **React.lazy** + **Suspense** en `AppRoutes` — patrón válido frente a documentación de rutas diferidas.

---

## 4. Deuda REAL restante (priorizada)

| Prioridad | Ítem | Impacto |
|-----------|------|--------|
| P1 | Warnings Mongoose **índices duplicados** (`proveedorId`, `slug`, `numeroOrden`, `nombre`, etc.) | Ruido en logs; posible overhead en writes; limpiar definición en modelos |
| P1 | Si el `.env` local usa claves **Wompi producción**, los pagos locales apuntan a prod — usar sandbox explícito para QA local | Riesgo de cargos reales en pruebas |
| P2 | ESLint exhaustive-deps en componentes listados en salida de build | Posibles efectos stale en edge cases |
| P2 | `npm audit` reporta vulnerabilidades en dependencias (backend y frontend) | Evaluar con `npm audit fix` sin `--force` salvo revisión |
| P3 | Browserslist “desactualizado” (mensaje CRA) | `npx update-browserslist-db@latest` cuando convenga |
| — | Deuda funcional ya documentada en `docs/architecture/query-architecture.md` (p. ej. más páginas migradas a Query) | Mejora incremental, no bloqueó este checklist |

---

## 5. Bugs corregidos en esta intervención

Listados en `docs/testing/local-final-qa.md` sección 7 (puertos, JWT, health, logging, export Wompi).

---

## 6. Criterio de “listo para demo local”

1. MongoDB arriba; `GET /api/health` → `200` y `mongo.connected: true`.
2. Frontend con `REACT_APP_API_URL` igual al origen donde escucha el backend.
3. Wompi: sandbox en claves y URLs para flujos de pago de prueba.
4. `npm start` (FE) + `npm run dev` (BE) sin crash; navegación principal sin pantalla blanca tras bootstrap de auth.

---

## 7. Documentos generados

- `docs/testing/local-run-checklist.md`
- `docs/testing/local-final-qa.md`
- Este archivo: `docs/audits/local-release-readiness.md`
