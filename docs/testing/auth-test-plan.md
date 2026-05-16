# Plan de pruebas — Autenticación y sesión

**Versión:** 2026-05-14  
**Alcance:** flujos end-to-end tras refactor de auth (frontend + backend).  
**Referencias:** `docs/audits/auth-audit.md`, Context7 (Firebase Auth, React Router, Axios interceptors).

---

## 1. Resumen de arquitectura validada

| Tema | Implementación |
|------|----------------|
| Fuente única de sesión | Zustand `authStore` + persist parcial (`token`, `refreshToken`, `user`, `isAuthenticated`) |
| Bootstrap | `AuthProvider` + `persist.onFinishHydration` → `bootstrapSession` (`GET /users/profile`) |
| HTTP canónico | Solo `axios` (`api.ts`); sin `fetch` en páginas de auth |
| OAuth Passport (Google/Facebook callback servidor) | Redirect `?code=` opaco → `POST /api/auth/oauth/exchange` (sin JWT en query) |
| OAuth Firebase (popup) | `POST /api/auth/firebase-login` → JSON; rol pendiente con `pendingToken` (JWT `rol_pending`) |
| Refresh | `POST /api/auth/refresh` + cola en interceptor ante `401` + `codigo: TOKEN_EXPIRED` |
| Pérdida de sesión SPA | Evento `app:auth-session-lost` → `clearLocalSession` + `navigate('/login')` (sin `window.location`) |

---

## 2. Flujos exactos (orden real)

### F1 — Registro email/contraseña (cliente o comerciante)

1. `POST /api/auth/register` con `nombre`, `email`, `password`, `rol`, `nombreEmpresa?`  
2. Redirección a `/verificar-email?email=…`  
3. Usuario introduce código → `POST /api/auth/verificar-codigo`  
4. Respuesta incluye `token`, `refreshToken`, `usuario` → `setSession` en store  
5. Redirección a `/`

### F2 — Login email/contraseña

1. `POST /api/auth/login`  
2. Backend exige `verificado === true` (403 si no)  
3. Respuesta: `token`, `refreshToken`, `usuario`  
4. Store actualizado; rutas protegidas disponibles tras `bootstrapPhase === 'ready'`

### F3 — Google / Facebook (Firebase Web → backend)

1. Popup Firebase → `idToken`  
2. `POST /api/auth/firebase-login`  
3. **A)** Usuario con rol → `token` + `refreshToken` → `setSession` → navegación según rol  
4. **B)** Sin rol → `pendingToken` + `usuario` → `/select-role` con `state`  
5. Cliente: `POST /api/auth/seleccionar-rol` con header `Authorization: Bearer <pendingToken>`  
6. Comerciante: `/complete-merchant-profile` → mismo endpoint con datos empresa → `/verificar-email?email=…` (código por email)

### F4 — OAuth Passport (ruta `/api/auth/google` si está configurada)

1. Callback servidor crea documento `OAuthHandoff` y redirige a `/auth/callback?code=…`  
2. Frontend `POST /api/auth/oauth/exchange` `{ code }`  
3. `setSession` y `navigate('/')`

### F5 — Refresh de access token

1. Access JWT expira → primera petición protegida recibe `401` + `codigo: TOKEN_EXPIRED`  
2. Interceptor llama `POST /api/auth/refresh` con `refreshToken` desde persist  
3. `applyTokenPair` en store; se reintenta la petición original  
4. Si refresh falla → evento `app:auth-session-lost`

### F6 — Logout

1. `POST /api/auth/logout` (con Bearer si hay sesión)  
2. `clearLocalSession` en store (limpia persist)

---

## 3. Matriz de pruebas manuales (obligatoria pre-deploy)

| ID | Caso | Pasos | Resultado esperado |
|----|------|-------|---------------------|
| T1 | Login OK | Credenciales válidas + email verificado | Home o ruta previa; sin flash de login |
| T2 | Login sin verificar | Usuario `verificado: false` | Mensaje 403 claro; no sesión |
| T3 | Login credenciales malas | Password incorrecto | 401 genérico; no enumeración de email |
| T4 | Registro + verificación | Flujo F1 | Código válido crea sesión con refresh |
| T5 | Reenvío código | `POST /auth/reenviar-codigo` email inexistente | 200 genérico (anti-enumeración) |
| T6 | Google nuevo usuario | Flujo F3-B | Select role con `pendingToken` |
| T7 | Selección rol cliente | Sin header pending | 401 |
| T8 | Selección rol cliente | Header correcto | Sesión + redirect `/` |
| T9 | Comerciante | Completar perfil + email | Llega a verificar email |
| T10 | Merchant routes | Usuario `cliente` abre `/merchant` | Redirect `/` |
| T11 | OAuth exchange código usado dos veces | Mismo `code` 2 veces | Segundo 400 |
| T12 | OAuth exchange expirado | Esperar >3 min (TTL handoff) | 400 |
| T13 | Refresh | Forzar access expirado (JWT corto en entorno de prueba) | Request transparente |
| T14 | Logout | Botón logout | Perfil no accesible; `/login` |
| T15 | Cambio contraseña | `currentPassword` / `newPassword` | 200 (contrato EN alineado) |
| T16 | Reset contraseña | Token en path + body `newPassword` | 200 |

---

## 4. Edge cases documentados

| Edge | Comportamiento |
|------|----------------|
| Doble refresh concurrente | Cola en interceptor; un solo `POST /refresh` |
| `bootstrapPhase` pending | Toda la app muestra spinner hasta primer `bootstrapSession` |
| Usuario `rol: null` en UI legacy | Perfil muestra "Sin rol"; `RoleBasedRedirect` manda a login si no hay rol |
| Firebase mock | Solo si `NODE_ENV !== 'production'` y Admin SDK ausente; producción → 503 |
| `JWT_REFRESH_SECRET` ausente | Refresh firma con `JWT_SECRET` (dev); en producción conviene secret dedicado |
| Handoff OAuth TTL | 3 minutos; callback lento debe reintentar login |
| Merchant `sitioWeb` vacío o sin `http` | No se envía campo (evita validación Mongoose) |

---

## 5. Pruebas automáticas ejecutadas en esta iteración

- `npm run build` (frontend CRA) — **OK** (warnings ESLint preexistentes en otros módulos).  
- `node -e "require('./controllers/authController')"` (backend) — **OK**.

No hay suite E2E en repo; las pruebas T1–T16 son **manuales** hasta añadir Playwright/Cypress.

---

## 6. Referencias Context7 (prácticas aplicadas)

- **Firebase:** popup vs redirect; manejo de `getRedirectResult`; `signInWithCredential` para credenciales.  
- **React Router:** guards con `Navigate`, preservación de `state`/`location` para post-login.  
- **Axios:** interceptor 401, cola `isRefreshing`, reintento de request; evitar bucles excluyendo `/auth/refresh` y login.

---

## 7. Deuda / seguimiento

- Rotación de refresh con almacenamiento en BD (revocación por dispositivo) — fase posterior (`auth-audit` Fase 3).  
- Cookie httpOnly + CSRF para refresh — decisión `DEC-AUTH-002` pendiente.  
- Tests E2E para flujos F3–F4.
