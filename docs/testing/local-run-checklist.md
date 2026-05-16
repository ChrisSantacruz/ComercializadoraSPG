# Checklist: arranque y uso local

Úsalo antes de una demo o release manual. **Prerrequisito:** Node.js ≥ 14 (recomendado 18+), MongoDB accesible en `MONGODB_URI`.

## 1. Backend

| Paso | Comando / acción | Esperado |
|------|-------------------|----------|
| Dependencias | `cd backend` → `npm install` | Sin errores fatales |
| Entorno | Copiar `backend/.env.example` → `backend/.env` y ajustar `JWT_SECRET`, `MONGODB_URI`, Wompi y email si pruebas verificación |
| API | `npm run dev` | Log `server_listen` con puerto **5001** por defecto |
| Health | `GET http://localhost:5001/api/health` | `200` con `mongo.connected: true` cuando la DB está arriba; `503` si Mongo no conectó aún o está caído |
| Raíz | `GET http://localhost:5001/` | JSON de bienvenida |

## 2. Frontend (CRA)

| Paso | Comando / acción | Esperado |
|------|-------------------|----------|
| Dependencias | `cd frontend` → `npm install` | Sin errores fatales |
| Entorno | Copiar `frontend/.env.example` → `frontend/.env.local` y confirmar `REACT_APP_API_URL=http://localhost:5001` |
| Desarrollo | `npm start` | App en `http://localhost:3000`, sin pantalla blanca tras bootstrap de auth |
| Producción local | `npm run build` luego `npx serve -s build` (opcional) | Build exitoso; revisar warnings ESLint en consola si los hay |

## 3. Alineación obligatoria

- Mismo host/puerto en **backend `PORT`** y **`REACT_APP_API_URL`** (por defecto ambos en **5001** para evitar el fallo histórico 5000/5001).
- Wompi: `REACT_APP_WOMPI_PUBLIC_KEY` (sandbox) alineada con el uso de claves de prueba en backend.

## 4. Rutas y providers (regresión rápida)

- Navegación: rutas en `AppRoutes` (lazy + `Suspense` + `RouteChunkFallback`).
- Datos: `QueryProvider` en `App.tsx`; auth en `AuthProvider`; toasts en `NotificationProvider`.
- Errores de chunk: `ProductionShell` / boundaries según implementación actual.

## 5. Comandos ejecutados en validación (2026-05-15)

- `backend`: `npm install`; `node --check server.js`.
- `frontend`: `npm install`; `npm run build` (éxito; warnings `react-hooks/exhaustive-deps` en algunos archivos, no bloquean el build).
