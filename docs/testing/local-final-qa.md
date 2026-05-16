# QA local final — matriz y notas

**Objetivo:** comprobar flujo ecommerce punta a punta en **localhost** con backend real, frontend CRA y Wompi **sandbox**.

**Referencias de stack (Context7 — documentación vigente consultada en esta preparación):**

- **TanStack Query v5:** `QueryClient` con `defaultOptions` (`staleTime`, `gcTime`, `retry`), y pruebas con `retry: false` en tests donde aplique.
- **React:** límites de error con `getDerivedStateFromError` / `componentDidCatch`; `Suspense` + `lazy` con `fallback` explícito.
- **React Router (v7):** rutas con carga diferida (`lazy` / imports dinámicos) y `fallback` mientras cargan módulos.

Estas prácticas están alineadas con lo ya implementado en `frontend/src/lib/query/queryClient.ts`, `AppRoutes.tsx` (lazy + `Suspense`) y el shell de producción.

---

## 1. Auth

| Caso | Pasos | Criterio de éxito |
|------|--------|-------------------|
| Registro | Crear cuenta cliente/comerciante | Respuesta coherente; si email está activo, flujo de código según backend |
| Login | Credenciales válidas | Sesión en Zustand + llamadas API con Bearer |
| Verificar email | Código 6 dígitos | Requiere `EMAIL_*` o SendGrid en backend |
| Olvidé contraseña | Solicitar reset | Email o mensaje genérico (anti-enumeración) |
| Reset | Token en URL | Nueva contraseña aceptada |
| Refresh | Expiración access simulada | Interceptor `api.ts` renueva con `/auth/refresh` si hay refresh token |
| Logout | Cerrar sesión | Estado local limpio; llamada logout best-effort |
| Sesión expirada | Sin refresh válido | Evento `AUTH_SESSION_LOST`, redirección a login fuera de rutas públicas de auth |

---

## 2. Ecommerce (tienda)

| Caso | Criterio de éxito |
|------|-------------------|
| Home | Carga con Query; sin spinners infinitos |
| Categorías / filtros / búsqueda | Parámetros alineados con API; vacíos honestos + retry donde exista `ErrorState` |
| PDP | Detalle y stock coherentes con backend |
| Carrito | Cantidades; persistencia + invalidación según hooks de carrito |
| Checkout | Dirección, totales, transición a Wompi |
| Wompi sandbox | Aprobado / rechazado / pendiente; retorno a `/payment/wompi/return` |
| Refresh en checkout/return | Sin estado inventado; re-sync de orden cuando aplique |
| Doble submit | Botones deshabilitados donde ya esté implementado |

---

## 3. Perfil y pedidos (cliente)

| Caso | Criterio de éxito |
|------|-------------------|
| Editar perfil y avatar | Respuesta API reflejada en UI |
| Lista y detalle de pedidos | Estados visibles; error de red con feedback |

---

## 4. Merchant

| Caso | Criterio de éxito |
|------|-------------------|
| Dashboard / analytics | Datos reales desde API (sin rellenar con ceros falsos en gráficos migrados) |
| Órdenes / productos | Listados y acciones acordes al contrato actual |

---

## 5. Condiciones adversas (manual)

Ejecutar en Chrome DevTools: **Slow 3G**, **Offline**, **Disable cache**, recarga agresiva, navegación rápida, atrás/adelante.

| Condición | Qué observar |
|-----------|----------------|
| API caída | Mensajes de error/retry; no silencio total |
| Offline | `NetworkStatusBanner` si está activo; Query `networkMode: online` sin colas infinitas |
| Categorías vacías / imágenes rotas | Fallback de imagen (`imageUtils`) y estados vacíos claros |

---

## 6. Accesibilidad y UX de carga (referencia)

- **Accesibilidad:** foco visible en formularios críticos; diálogos con escape/registro en Headless UI donde aplique; contrastes revisados en vistas principales (sin auditoría formal en este documento).
- **Loading:** `Suspense` con `RouteChunkFallback`; listas con skeletons donde estén cableados (home/catálogo/merchant según archivos existentes).

---

## 7. Bugs encontrados y corregidos en esta pasada (2026-05-15)

| Bug | Corrección |
|-----|------------|
| Desalineación de puerto backend (5000 por defecto) vs frontend (`config/env.ts` y utilidades en 5001 / 5000 mezclados) | `PORT` por defecto **5001** en `server.js`; utilidades frontend y ejemplo de imagen de prueba a **5001**; `.env.example` unificado |
| JWT con fallback débil en código | Producción **exige** `JWT_SECRET`; en desarrollo placeholder explícito + log `jwt_dev_fallback` |
| `/api/health` no reflejaba DB | Respuesta incluye `mongo` y `503` si no hay conexión |
| `console.log` en upload / Mongo | Migrado a `logger` estructurado en `upload.js` y `config/database.js` |
| ESLint `import/no-anonymous-default-export` en `wompiService` | Export con instancia nombrada |

---

## 8. Cómandos de verificación automática realizados

- `frontend`: `npm run build` — **OK** (warnings hooks en archivos listados en consola de build).
- `backend`: `node --check server.js` — **OK**.

---

## Cuentas y secretos de prueba

- **Mongo:** URI local en `.env.example`.
- **Wompi sandbox:** claves públicas/privadas de ejemplo en `backend/.env.example` y clave pública en `frontend/.env.example` (reemplazar por las de tu cuenta si son distintas).
- **JWT:** nunca usar el placeholder de dev en producción; rotar secretos al desplegar.
