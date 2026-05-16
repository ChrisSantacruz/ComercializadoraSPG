# Auditoría técnica — Módulo `Auth`

> **Documento oficial de refactor.** Toda implementación sobre el módulo Auth debe alinearse con este documento. Si una decisión se desvía del plan aquí descrito, debe justificarse explícitamente.

- **Módulo auditado:** flujo completo de autenticación, autorización y gestión de sesión (backend + frontend)
- **Fecha:** 2026-05-11
- **Estado:** Auditoría completada · Implementación pendiente de confirmación
- **Alcance:** Backend (Node + Express + Mongoose + Passport + Firebase Admin) y Frontend (React + Zustand + Axios + Firebase Web SDK)

---

## 1. Resumen ejecutivo

El módulo Auth concentra **la mayor deuda crítica del proyecto**. Convive con **dos sistemas de OAuth** (Passport y Firebase), **dos idiomas mezclados en el contrato API** (es/en) que rompen features enteras, un **modelo de roles roto** (el rol `administrador` existe en código pero **no en el `enum` del modelo**) y un **backdoor de creación de admin con credenciales hardcodeadas** expuesto en producción.

Frentes principales:

1. **Seguridad:** `JWT_SECRET` con fallback hardcodeado, CORS efectivamente desactivado (`callback(null, true)` para cualquier origen), endpoint backdoor `/api/admin/create-super-admin` con clave secreta hardcodeada (`CREATE_ADMIN_SECRET_2025`), token JWT viajando en URL en el callback de OAuth, sin rate limit específico en login/forgot-password (e incluso con `skipSuccessfulRequests: true` que vuelve trivial el brute-force).
2. **Contratos API rotos:** `cambiar-password` y `reset-password` están **completamente inutilizables** por desalineación es/en entre frontend y backend. La verificación de email **no se enforza** en `iniciarSesion` (el campo `estado` por defecto es `'activo'`, y `verificado` nunca se chequea al loguear).
3. **Arquitectura:** controladores que mezclan acceso a BD, JWT, cookies y email; cero capa de servicios; JWT dividido entre `utils/jwt.js` y `middlewares/auth.js` (cada uno usa su propia función); dos rutas paralelas de OAuth (Passport vs Firebase) donde solo una se usa desde el frontend.
4. **Roles y permisos:** rol `administrador` referenciado en 6+ controladores y 8+ rutas, pero **no permitido por el `enum` del modelo `User`** → cualquier intento de guardar un admin lanza `ValidationError`. Frontend `User.rol` tipado solo como `'cliente' | 'comerciante'`, sin `null` ni `'administrador'`.
5. **Refresh tokens:** declarados (`generarTokenActualizacion`) pero **nunca implementados**. Access token vive 7 días sin rotación, sin revocación, sin blacklist.
6. **Mantenibilidad:** 14 endpoints expuestos bajo `/api/auth`, de los cuales **3 son legacy duplicados**; campos del modelo `User` (`recordarme`, `tokenRecordatorio`, `codigo2FA`, `fechaExpiracion2FA`) que **ningún código toca**.

El refactor se ejecutará en **7 fases** (0 a 6), priorizadas por **riesgo de seguridad** primero y arquitectura después. **Las fases 0 y 1 son bloqueantes para producción.**

---

## 2. Estado actual (hechos verificados)

### 2.1 Inventario de archivos

| Archivo | LOC | Estado |
|---|---|---|
| `backend/controllers/authController.js` | 857 | Vivo. Controlador-Dios. Mezcla BD + email + JWT + cookies + OAuth. |
| `backend/routes/authRoutes.js` | 121 | Vivo. 14 endpoints + 2 idiomas mezclados. |
| `backend/middlewares/auth.js` | 243 | Vivo. Duplica lógica JWT de `utils/jwt.js`. Incluye `verificarCompraParaReseña` fuera de su scope. |
| `backend/middlewares/validation.js` | 374 | Vivo. Solo cubre `validarRegistroUsuario` + `validarLoginUsuario` de los 14 endpoints. |
| `backend/utils/jwt.js` | 95 | Vivo. `generarTokenActualizacion` declarado y nunca importado. |
| `backend/config/passport.js` | 131 | Vivo pero efectivamente muerto: el frontend no lo invoca (usa Firebase). |
| `backend/config/firebaseAdmin.js` | 52 | Vivo. Permite "modo mock" peligroso si Firebase no se inicializa. |
| `backend/models/User.js` | 316 | Vivo. `rol` enum `['cliente', 'comerciante', null]` — sin `'administrador'`. Campos 2FA/recordarme muertos. |
| `backend/server.js` | 389 | Vivo. Contiene el endpoint backdoor `/api/admin/create-super-admin` y fallback hardcodeado de `JWT_SECRET`. |
| `frontend/src/stores/authStore.ts` | 178 | Vivo. Persiste token en `localStorage` sin chequeo de expiración. |
| `frontend/src/services/authService.ts` | 140 | Vivo. Contratos desalineados con backend (`changePassword`, `resetPassword`). |
| `frontend/src/services/api.ts` | 121 | Vivo. Interceptor con `console.log` de cada request/response (incluye datos sensibles). |
| `frontend/src/pages/auth/LoginPage.tsx` | 179 | Vivo. |
| `frontend/src/pages/auth/RegisterPage.tsx` | 376 | Vivo. **Usa `fetch` directo, no el cliente `api`**, bypassea interceptores. |
| `frontend/src/pages/auth/SelectRolePage.tsx` | 179 | Vivo. **Usa `fetch` directo.** |
| `frontend/src/pages/auth/CompleteMerchantProfilePage.tsx` | ~270 | Vivo. **Usa `fetch` directo + fallback de URL `:5000`** (otros usan `:5001`). |
| `frontend/src/pages/auth/VerifyEmailPage.tsx` | 202 | Vivo. Escribe directamente en `localStorage['auth-storage']` saltándose el store. |
| `frontend/src/pages/auth/OAuthCallback.tsx` | 88 | Vivo. Recibe token JWT por **query string** y lo persiste manualmente. |
| `frontend/src/components/auth/SocialLoginButtons.tsx` | 194 | Vivo. **Usa `fetch` directo.** Redirige a `/admin` (ruta que no existe en `AppRoutes`). |
| `frontend/src/config/firebase.ts` | 45 | Vivo. **`apiKey` de Firebase hardcodeado** (técnicamente público en Web SDK, pero merece variable de entorno). |

### 2.2 Endpoints expuestos en `/api/auth`

| Método | Ruta | Idioma | Validación | Auth | Estado |
|---|---|---|---|---|---|
| POST | `/register` | EN | ✅ `validarRegistroUsuario` | público | OK |
| POST | `/login` | EN | ✅ `validarLoginUsuario` | público | OK |
| GET | `/me` | EN | — | `protect` | OK |
| PUT | `/password` | EN | ❌ | `protect` | **ROTO** (es/en mismatch) |
| POST | `/forgot-password` | EN | ❌ | público | OK pero leak |
| PUT | `/reset-password/:token` | EN | ❌ | público | **ROTO** (lee `token` de `req.body`, no de params) |
| POST | `/verify-email` | EN | ❌ | público | Legacy duplicado |
| POST | `/verificar-codigo` | ES | ❌ | público | OK |
| POST | `/reenviar-codigo` | ES | ❌ | público | OK pero leak + sin rate limit |
| POST | `/resend-verification` | EN | ❌ | público | Legacy duplicado |
| POST | `/logout` | EN | — | `protect` | Solo limpia cookie (cookie no se usa) |
| GET | `/google` + `/google/callback` | — | — | público | **Dead path** (frontend no lo invoca) |
| GET | `/facebook` + `/facebook/callback` | — | — | público | **Dead path** + email falso `facebook_${id}@temp.com` |
| GET | `/failure` | — | — | público | Dead path |
| POST | `/firebase-login` | EN | ❌ | público | OK, pero acepta token mock si Firebase no init |
| POST | `/seleccionar-rol` | ES | ❌ | público (!) | **Sin auth real**: cualquiera con `userId` puede asignar rol |

### 2.3 Veredicto general

> Patrón clásico de "agregar features sin auditar". Cada flujo nuevo (Firebase OAuth, selección de rol, código de 6 dígitos) **se sumó al anterior sin eliminar el viejo**. El módulo creció en superficie de ataque mientras perdía integridad.

---

## 3. Checklist de problemas detectados

### 3.1 Severidad CRÍTICA (vulnerabilidad activa o feature rota en producción)

- [ ] **C1** — **`JWT_SECRET` con fallback hardcodeado** en `server.js:17-19`. Si la variable de entorno no se carga, **se firma con `'mi_secreto_jwt_comercializadora_2024'`** en producción. Un atacante que sospeche el fallback puede falsificar tokens.
- [ ] **C2** — **Endpoint backdoor `/api/admin/create-super-admin`** en `server.js:243-352`. Protegido solo por clave hardcodeada `'CREATE_ADMIN_SECRET_2025'`. Imprime en consola `email`, `password` y `loginUrl` del admin recién creado. Expone credenciales por defecto `chris@chrisadmin.com / Pipeman06`.
- [ ] **C3** — **CORS efectivamente desactivado** en `server.js:107-112`: cuando el origen no está en la whitelist, el handler ejecuta `callback(null, true)` con un `console.log` y permite la petición. Comentario en código: _"en producción, ser permisivo pero logear"_. CORS deja de ser una defensa.
- [ ] **C4** — **Sistema de roles inconsistente y roto**:
  - `User.rol` enum: `['cliente', 'comerciante', null]`.
  - 6+ controladores chequean `req.usuario.rol === 'administrador'`.
  - 8+ rutas usan `authorize('administrador')`.
  - El backdoor de C2 intenta guardar `rol: 'administrador'` → **Mongoose lanza `ValidationError`**. Toda la funcionalidad de admin está muerta y nadie lo notó.
- [ ] **C5** — **Verificación de email no enforzada en login**. `User.estado` default es `'activo'`. `iniciarSesion` bloquea `estado === 'inactivo'`, pero el registro nunca pone al usuario en `'inactivo'`; solo marca `verificado: false`. **Cualquiera puede registrarse con un email ajeno y loguearse sin verificar**.
- [ ] **C6** — **Endpoint `PUT /api/auth/password` (cambio de contraseña) completamente roto**. Frontend (`authService.changePassword`) envía `{ currentPassword, newPassword }`; backend (`cambiarPassword`) espera `{ passwordActual, nuevaPassword }`. Resultado: error 400 garantizado, feature inutilizable.
- [ ] **C7** — **Endpoint `PUT /api/auth/reset-password/:token` (restablecer contraseña) completamente roto**. La ruta declara `:token` como parámetro pero el controlador lee `const { token, nuevaPassword } = req.body`. Frontend envía `:token` en URL + `{ newPassword }` en body. Ambos campos llegan `undefined` al controlador → 400 garantizado.
- [ ] **C8** — **Token JWT viaja en query string en el callback OAuth** (`authController.js:583, 617`): `res.redirect(${frontendURL}/auth/callback?token=${token}&user=${...})`. Queda en historial del browser, headers `Referer`, logs de proxies/CDN. **Riesgo de exfiltración trivial**.
- [ ] **C9** — **Firma de `generarTokenAcceso` mal invocada en OAuth/seleccionar-rol** (`authController.js:722, 819`): se llama con 3 argumentos `(_id, email, rol)` pero la función solo acepta `(usuarioId, rol)`. Resultado: **el JWT de usuarios OAuth lleva el email en el campo `rol`**, no el rol real. Si alguien decodifica el JWT cliente-side para autorización (UI), las decisiones se basan en datos basura.
- [ ] **C10** — **Sin rate limiting específico en endpoints sensibles**. El rate limiter global tiene `skipSuccessfulRequests: true`, lo que **anula la protección contra brute-force de login** (un atacante que adivina credenciales no consume cuota). No hay límites separados para `/login`, `/forgot-password`, `/reenviar-codigo`, `/firebase-login`.
- [ ] **C11** — **Política de contraseñas débil**. Backend exige solo `minlength: 6`. Sin requisito de mayúsculas/números/símbolos. El "indicador de fortaleza" del `RegisterPage` es solo cosmético — no bloquea contraseñas débiles.
- [ ] **C12** — **Enumeración de emails / usuarios**:
  - `solicitarRecuperacionPassword` retorna 200 cuando el email no existe pero **retorna 500** si el email existe y falla el envío → distinguible.
  - `reenviarCodigoVerificacion` retorna **404** si el email no existe → confirma existencia.
  - `reenviarVerificacion` retorna 404 si el email no existe.
- [ ] **C13** — **Mock de Firebase Admin SDK aceptable en runtime** (`authController.js:654-661`): si `auth` es null (Firebase no inicializó), el controlador **acepta cualquier `idToken` sin verificar** y crea un usuario mock con `email` y `nombre` que vienen del body. Si Firebase falla en producción por config inválida, el sistema acepta logins forjados.
- [ ] **C14** — **`seleccionar-rol` sin autenticación** (`authRoutes.js:119`): cualquiera con un `userId` ajeno puede llamar al endpoint, asignar rol y disparar verificación. Debería requerir token de "registro temporal" o estar `protect`-ed.
- [ ] **C15** — **`obtenerPerfilActual` y otros 6+ handlers en `authController.js` envuelven mal `errorResponse`**: `res.status(404).json(errorResponse(res, 'Usuario no encontrado', 400))`. `errorResponse` **ya hace `res.status().json()` y retorna el objeto `res`**. Volver a llamar `.json()` sobre eso provoca `TypeError` o respuesta inconsistente. Pattern repetido en `verificarEmail`, `restablecerPassword`, `cambiarPassword`, `reenviarVerificacion`.

### 3.2 Severidad ALTA (arquitectura y deuda estructural)

- [ ] **A1** — **Bilingüismo en el contrato API**. Rutas, controladores, validadores y stores mezclan `register/registro`, `password/contraseña`, `verify/verificar`, `currentPassword/passwordActual`, `newPassword/nuevaPassword`. Es **la causa raíz de C6 y C7**. Inevitable que vuelva a romper features futuros.
- [ ] **A2** — **Dos sistemas paralelos de OAuth**:
  - `passport-google-oauth20` + `passport-facebook` (en `config/passport.js`, rutas `/google`, `/facebook`).
  - Firebase Admin SDK (`/firebase-login`).
  El frontend solo usa Firebase. Passport queda como código vivo que nadie ejerce → superficie de ataque + deuda.
- [ ] **A3** — **Refresh tokens declarados pero no implementados**. `generarTokenActualizacion` existe en `utils/jwt.js:29-34` y **no lo importa nadie**. Access token TTL = 7 días, sin rotación, sin revocación, sin blacklist. Logout solo limpia cookie.
- [ ] **A4** — **JWT lógico fragmentado**:
  - `utils/jwt.js` exporta `verificarToken` envolviendo `jwt.verify`.
  - `middlewares/auth.js:26` llama directamente a `jwt.verify(...)` sin importar el helper.
  - `middlewares/auth.js:212` (`autenticacionOpcional`) idem.
  Tres lugares verifican JWT con sus propios manejos de error.
- [ ] **A5** — **Sin capa de servicios**. `authController.js` (857 LOC) mezcla acceso a BD, generación de tokens, envío de email, set de cookies, redirects, lógica de roles. Viola directamente `backend-rules.mdc` (_"Controllers ligeros · Lógica en services · Validaciones separadas"_).
- [ ] **A6** — **Validación incompleta**. `validation.js` solo expone `validarRegistroUsuario` y `validarLoginUsuario`. Los otros 12 endpoints aceptan body crudo (`forgot-password`, `reset-password`, `verify-email`, `verificar-codigo`, `reenviar-codigo`, `password`, `seleccionar-rol`, `firebase-login`, etc.).
- [ ] **A7** — **Estrategia de almacenamiento de sesión ambigua**:
  - Backend setea cookie httpOnly `token` con `sameSite: 'strict'`.
  - Frontend nunca lee la cookie (no puede, es httpOnly) y envía `Authorization: Bearer ${localStorage['auth-storage'].state.token}`.
  - Resultado: la cookie es ruido. Y `localStorage` queda expuesto a XSS sin protección.
- [ ] **A8** — **3 rutas para verificar email + 2 para reenviar**: `/verify-email`, `/verificar-codigo`, `/resend-verification`, `/reenviar-codigo`. Solo `/verificar-codigo` + `/reenviar-codigo` son usados por el frontend actual. El resto son legacy convivido.
- [ ] **A9** — **Frontend tipa `User.rol` como `'cliente' | 'comerciante'`** (`types/index.ts:32`), pero:
  - Backend permite `null` (post-OAuth, pre-selección de rol).
  - `SocialLoginButtons.tsx:77` chequea `rol === 'administrador'` (string que el tipo no admite, TS lo deja pasar por la falta de strict).
  - `ProtectedRoute.requiredRole` no acepta `'administrador'`. No hay rutas admin en `AppRoutes.tsx`.
- [ ] **A10** — **Dos caminos de registro desde frontend**: `authStore.register` (que usa `authService.register` con `axios`) y `RegisterPage.tsx:115` (que usa `fetch` directo). El primero no se invoca jamás desde `RegisterPage`. Lo mismo con `SelectRolePage`, `CompleteMerchantProfilePage`, `SocialLoginButtons` (todos `fetch` directo, sin pasar por `api.ts` ni interceptores).
- [ ] **A11** — **`fechaUltimoLogin` actualizada con `usuario.save()`**, lo que dispara el middleware `pre('save')` completo (re-hash de password, `fechaActualizacion`, todo el ciclo). Debería ser `findByIdAndUpdate`.
- [ ] **A12** — **Auth state persistido sin TTL**. `authStore` guarda en `localStorage` `{ user, token, isAuthenticated }` sin chequear expiración del JWT. La UI cree estar autenticada hasta que la primera petición falle con 401, momento en el que `api.ts:54-58` fuerza `window.location.href = '/login'` (pierde estado).
- [ ] **A13** — **Mezcla de `<Link>` y `useNavigate` y `window.location` en flujos de auth** (`api.ts:58` redirige con `window.location.href = '/login'`, full reload). Anti-patrón React.
- [ ] **A14** — **Modelo `User` con 4 campos muertos**: `recordarme`, `tokenRecordatorio`, `fechaExpiracionRecordatorio`, `codigo2FA`, `fechaExpiracion2FA`. Nadie los lee, nadie los escribe. Ruido en el schema.
- [ ] **A15** — **OAuth Facebook crea email sintético** `facebook_${profile.id}@temp.com` (passport.js:106). Estos usuarios nunca podrán hacer forgot-password ni recibir notificaciones reales. Mejor pedir email después o bloquear la estrategia hasta tener permisos `email`.

### 3.3 Severidad MEDIA (limpieza importante, no bloqueante)

- [ ] **M1** — **`console.log` masivos con datos sensibles**:
  - `api.ts:14-16, 41-44` loguea cada request/response (incluye body).
  - `authController.js:249-310` loguea email, nombre y operaciones de verificación.
  - `server.js:154-163` loguea body completo de cualquier `/auth/*` o `/wompi/*` request → **passwords en plano en los logs**.
- [ ] **M2** — **`verificarCompraParaReseña` definido en `middlewares/auth.js`** (líneas 168-197). No es lógica de auth, es de reviews. Pertenece a `middlewares/review.js` o al controller.
- [ ] **M3** — **`verificarPropiedad` usa `require(\`../models/${modeloNombre}\`)`** dinámicamente. Sin validación. Si se pasa un string inválido, el error es críptico.
- [ ] **M4** — **`autenticacionOpcional` traga errores con `console.log`** (`auth.js:220`). No distingue "token ausente" de "token corrupto/firma inválida".
- [ ] **M5** — **Sin algoritmo pinneado en `jwt.verify`**. Aunque `jsonwebtoken` por defecto valida HS256 con secreto string, conviene pinear explícitamente `{ algorithms: ['HS256'] }` para prevenir algorithm confusion.
- [ ] **M6** — **`apiKey` de Firebase + IDs hardcodeados** en `frontend/src/config/firebase.ts:9-15`. Aunque la API key del Web SDK es pública por diseño, debería estar en variables de entorno para poder rotar/segmentar por entorno.
- [ ] **M7** — **Bcrypt salt rounds = 12** (`User.js:252`). Razonable hoy pero sin estrategia documentada de upgrade. Sin "pepper". Sin hash-versioning para futuras migraciones.
- [ ] **M8** — **`obtenerPerfilActual` retorna campos de comerciante a clientes** (`metodosPago`, `estadisticasComerciante`, etc.). Sobreexposición innecesaria.
- [ ] **M9** — **Fallback de `REACT_APP_API_URL` inconsistente**: `http://localhost:5001` en `api.ts`, `SocialLoginButtons.tsx`, `RegisterPage.tsx`, `SelectRolePage.tsx`, `NotificationCenter.tsx` vs `http://localhost:5000` en `CompleteMerchantProfilePage.tsx`, `imageUtils.ts`, `imageTest.ts`, `debugUtils.ts`.
- [ ] **M10** — **CookieParser + cookies httpOnly sin CSRF token**. Si en el futuro alguien decide leer auth desde cookie, queda vulnerable a CSRF. Decisión: o cookie + CSRF, o solo Bearer y eliminar la cookie.
- [ ] **M11** — **No hay logger estructurado**. Todo es `console.log/error/warn`. `backend-rules.mdc` exige _"Logging claro"_.
- [ ] **M12** — **Sin auditoría de eventos de seguridad**. Logins fallidos, cambios de rol, resets de password, creación de admins → no se persisten.
- [ ] **M13** — **`successResponse` y `errorResponse` con firmas inconsistentes** en helpers vs el uso real en controllers. `errorResponse(res, mensaje, codigo)` retorna `res`, pero algunos handlers la envuelven en otro `.json()` (ver C15).
- [ ] **M14** — **`reenviarCodigoVerificacion` sin rate limit propio**. Permite spam de emails.
- [ ] **M15** — **Sin protección contra contraseñas comunes / brechas**. No se valida contra una lista (HaveIBeenPwned, top-10k, etc.).
- [ ] **M16** — **`firebaseLogin` autoenlaza cuentas por email** (`authController.js:674-679`). Si un usuario local existe con `chris@correo.com`, un atacante que controle un Google con el mismo email **toma posesión** de la cuenta local sin verificación adicional.

### 3.4 Severidad BAJA (limpieza)

- [ ] **B1** — Imports muertos: `passport` en `authController.js:12` declarado pero no utilizado dentro del módulo.
- [ ] **B2** — Comentarios redundantes que narran obvios (`// Buscar usuario`, `// Generar token`, `// Establecer cookie`).
- [ ] **B3** — Emojis en logs y subjects de email (`🎉`, `🔐`, `📧`, `❌`). Bajo `ui-rules`/`backend-rules` no debería ser un sello del sistema.
- [ ] **B4** — `VerifyEmailPage.tsx:32-38` escribe directo en `localStorage['auth-storage']` saltándose el store (rompe el contrato de Zustand persist).
- [ ] **B5** — `SocialLoginButtons.tsx:77` redirige a `/admin` que no existe en `AppRoutes.tsx`. Si llegara a haber un admin OAuth, el navigate caería en 404.
- [ ] **B6** — Variables `setUser`/`setToken` en `authStore` agregadas solo para OAuth flow. Encajan mal con el resto del API.
- [ ] **B7** — `iniciarSesion` retorna `configuracion` completa del usuario en la respuesta de login (sobreexposición).
- [ ] **B8** — Comentario `// TODO` y bloques `// IMPORTANTE: ELIMINAR DESPUÉS DE USAR` en `server.js:240-241`.
- [ ] **B9** — `generate-jwt-secret.bat/.sh` en raíz del backend: scripts útiles pero no documentados en README.
- [ ] **B10** — Nombre `verificarToken` se repite como middleware y como helper en `utils/jwt.js`. Renombrar uno (sugerencia: middleware `requireAuth`, helper `verifyJwt`).

---

## 4. Mapa de duplicación

| Concepto | Apariciones actuales | Debería ser |
|---|---|---|
| Verificación de JWT | `utils/jwt.js#verificarToken` + `middlewares/auth.js#verificarToken` (inline `jwt.verify`) + `middlewares/auth.js#autenticacionOpcional` (inline) | 1 helper, usado por 1 middleware en 2 modos (`required` / `optional`) |
| OAuth Google/Facebook | `config/passport.js` (Passport strategies) + `controllers/authController.js#firebaseLogin` (Firebase Admin) | 1 estrategia (recomendado: Firebase) |
| Verificación de email | `verify-email` + `verificar-codigo` + `resend-verification` + `reenviar-codigo` | `POST /auth/verify` + `POST /auth/verify/resend` |
| URLs base del frontend | 8+ archivos con `process.env.REACT_APP_API_URL \|\| 'http://localhost:50XX'` (5000 vs 5001) | 1 módulo `config/env.ts` |
| Fetch directo de auth | `fetch` en `RegisterPage`, `SelectRolePage`, `CompleteMerchantProfilePage`, `SocialLoginButtons`, `VerifyEmailPage` | Todo a través de `api` axios + interceptores |
| Persistencia de sesión | `authStore` (Zustand persist en `localStorage`) + `VerifyEmailPage` (escritura manual) + `OAuthCallback` (escritura manual) + cookie httpOnly del backend (no leída) | 1 estrategia única |
| Asignación de rol | `register` (body con `rol`) + `seleccionar-rol` (post-OAuth) | 1 endpoint con 2 caminos validados |
| Rate limiting | Solo global con `skipSuccessfulRequests: true` | Global + específico por endpoint sensible |

---

## 5. Roadmap por fases

> **Regla de oro:** cada fase debe poder mergearse y desplegarse sin dejar auth roto. **Las fases 0 y 1 son bloqueantes para producción.**

### Fase 0 — Detener la hemorragia de seguridad
> **Riesgo:** bajo (cambios quirúrgicos) · **Esfuerzo:** bajo · **Bloquea:** todas las demás

Cambios mínimos y aislados, sin refactor. Solo cerrar vectores activos.

- [ ] Eliminar fallback hardcodeado de `JWT_SECRET` en `server.js:17-19`. Si falta la env var → `process.exit(1)` con mensaje claro.
- [ ] Eliminar el endpoint `/api/admin/create-super-admin` (`server.js:243-352`). Migrar a script `backend/scripts/create-admin.js` ejecutable solo desde CLI con `MONGODB_URI` + prompt interactivo.
- [ ] Endurecer CORS (`server.js:91-122`): en producción, `callback(new Error('CORS not allowed'), false)` para orígenes no whitelisted (no `callback(null, true)`).
- [ ] Pinear algoritmo en todas las llamadas `jwt.verify(..., { algorithms: ['HS256'] })`.
- [ ] Rate limiter específico para `/api/auth/login`, `/api/auth/register`, `/api/auth/forgot-password`, `/api/auth/reenviar-codigo`, `/api/auth/firebase-login`. Quitar `skipSuccessfulRequests: true` del limiter global o crear uno separado para auth sin esa opción.
- [ ] Eliminar el "mock mode" de Firebase en producción (`authController.js:654-661`). Si `auth` es null y `NODE_ENV === 'production'` → 503.
- [ ] Eliminar el middleware de logging que imprime body completo de `/auth/*` en `server.js:152-164` (filtra passwords y tokens en plano).
- [ ] Quitar `console.log` de body/headers en `api.ts:14-44`.

**Entregable:** sin vectores triviales de explotación. Sin credenciales de admin hardcodeadas. CORS funcional. Brute-force costoso.

---

### Fase 1 — Fix de contratos rotos
> **Riesgo:** medio (toca frontend + backend) · **Esfuerzo:** medio · **Bloquea:** Fase 2

Cerrar las features que **no funcionan en producción hoy** sin refactor profundo.

- [ ] **Decidir idioma único del contrato API** (ver §7 D3). Una vez decidido, alinear:
  - Cambio de password: ambos lados con `currentPassword` / `newPassword` (o `passwordActual` / `nuevaPassword`).
  - Reset password: leer `token` de `req.params.token` (no de body), `newPassword` (o `nuevaPassword`) de body.
- [ ] Reescribir `obtenerPerfilActual` y los otros 5 handlers que envuelven mal `errorResponse` (C15). Patrón único: `return errorResponse(res, 'msg', code);` sin `res.status().json(...)` adicional.
- [ ] Bloquear login con `verificado === false` en `iniciarSesion`, o cambiar el default de `User.estado` a `'inactivo'` y activarlo solo en verify.
- [ ] Corregir firma de `generarTokenAcceso` en `firebaseLogin` y `seleccionarRol` → `(usuario._id, usuario.rol)` (eliminar `email` extra).
- [ ] Decidir destino del rol `administrador` (ver §7 D4):
  - **Opción A:** agregar `'administrador'` al `enum` del modelo, actualizar tipo TS del frontend, agregar rutas `/admin` y `requiredRole` admin en `ProtectedRoute`.
  - **Opción B:** eliminar todos los checks `rol === 'administrador'` y `authorize('administrador')` del backend (escenario: no hay admin).
- [ ] Igualar respuestas para evitar enumeración:
  - `reenviarCodigoVerificacion` y `reenviarVerificacion`: si email no existe, retornar 200 igual que `solicitarRecuperacionPassword`.
  - `solicitarRecuperacionPassword`: si falla envío de email, registrarlo en logs pero retornar 200 al cliente.
- [ ] Proteger `seleccionar-rol`: crear token temporal `tipo: 'rol_pending'` que se emite en `firebaseLogin` cuando `requiereSeleccionRol = true`. Validar ese token en `seleccionar-rol` (no aceptar `userId` arbitrario).
- [ ] Sacar el token del query string en el OAuth callback. Opciones:
  - Setear cookie httpOnly desde el redirect del backend + frontend hace `GET /auth/me` al landing.
  - Usar `code` de un solo uso intercambiable por token vía `POST /auth/oauth/exchange`.

**Entregable:** las features de auth funcionan de punta a punta. Sin tokens en URLs. Sin enumeración fácil. Sin endpoints sin protección.

---

### Fase 2 — Unificación de capa y arquitectura
> **Riesgo:** medio · **Esfuerzo:** alto · **Bloquea:** Fase 3

Refactor estructural alineado con `backend-rules.mdc`.

- [ ] **Capa de servicios**. Mover lógica de `authController.js` a:
  - `services/auth/loginService.js` (login + estados + último login)
  - `services/auth/registerService.js` (registro local + generación de código + envío de email)
  - `services/auth/passwordService.js` (forgot / reset / change)
  - `services/auth/verificationService.js` (verify + resend, código de 6 dígitos)
  - `services/auth/oauthService.js` (Firebase login + linking + seleccionar-rol)
  - `services/auth/tokenService.js` (issue access + refresh, store, rotate, revoke)
  Controllers reducidos a `req → service → res` (≤ 30 LOC por handler).
- [ ] **Unificar JWT**: `middlewares/auth.js` importa `verifyJwt` de `utils/jwt.js`. Una sola función verifica.
- [ ] **Renombrar middleware**: `verificarToken` (middleware) → `requireAuth`. `verificarRol` → `requireRole`. `autenticacionOpcional` → `optionalAuth`. Mantener aliases `protect`, `authorize` por compatibilidad temporal.
- [ ] **Sacar `verificarCompraParaReseña` de `middlewares/auth.js`** a `middlewares/review.js`.
- [ ] **Validación universal** con `express-validator`: crear `validarForgotPassword`, `validarResetPassword`, `validarCambiarPassword`, `validarVerificarCodigo`, `validarReenviarCodigo`, `validarFirebaseLogin`, `validarSeleccionarRol`. Cada endpoint con su validador.
- [ ] **Decidir entre Passport o Firebase** (ver §7 D2). Eliminar el sistema descartado por completo (rutas, estrategias, dependencias del `package.json`).
- [ ] **Frontend: un solo cliente HTTP**. Eliminar todos los `fetch(API_BASE_URL + ...)` directos en `RegisterPage`, `SelectRolePage`, `CompleteMerchantProfilePage`, `SocialLoginButtons`, `VerifyEmailPage`. Todo pasa por `services/authService.ts` → `api` axios.
- [ ] **Centralizar `API_BASE_URL`** en `frontend/src/config/env.ts`. Eliminar los 8+ fallbacks dispersos (5000 vs 5001).
- [ ] **Tipar `User.rol` correctamente** en `frontend/src/types/index.ts`: `'cliente' | 'comerciante' | 'administrador' | null`. Adaptar `ProtectedRoute` y `RoleBasedRedirect`.
- [ ] **Política de contraseñas fuerte** en backend (`validarRegistroUsuario` + nueva `validarPassword`): min 8 chars, debe contener al menos una mayúscula, un número y un símbolo. Mismo validador para reset/change. Eliminar el indicador cosmético del frontend o conectarlo al mismo régimen.

**Entregable:** controllers de auth ≤ 60 LOC c/u. Una sola fuente de verdad para JWT. Validación en cada endpoint. Frontend sin `fetch` huérfanos. Política de password consistente.

---

### Fase 3 — Modelo de tokens (refresh + revocación)
> **Riesgo:** alto (toca flujo de sesión completo) · **Esfuerzo:** alto · **Bloquea:** Fase 5 (logout real)

- [ ] Reducir TTL de access token: `15m` (en lugar de `7d`).
- [ ] Implementar refresh tokens:
  - Generar refresh token (JWT firmado con `JWT_REFRESH_SECRET` separado, TTL 7-30 días).
  - Almacenar hash del refresh token + `userId` + `deviceId` + `userAgent` + `ip` + `expiresAt` en colección `RefreshToken`.
  - Endpoint `POST /api/auth/refresh` que valida, rota (emite uno nuevo, invalida el anterior) y responde con nuevo access.
  - Endpoint `POST /api/auth/logout` invalida el refresh token actual del usuario.
  - Endpoint `POST /api/auth/logout-all` invalida todos los refresh tokens del usuario.
- [ ] **Decidir storage del refresh token** (ver §7 D1):
  - **Opción A (recomendada):** cookie httpOnly + `SameSite=Lax` + `Secure` en prod, con CSRF token doble-submit para mutaciones.
  - **Opción B:** localStorage (status quo, vulnerable a XSS).
- [ ] Interceptor de axios en frontend: cuando una request retorna 401 con `error: 'TOKEN_EXPIRED'`, intentar `/auth/refresh` automáticamente y reintentar la request original.
- [ ] Eliminar el `window.location.href = '/login'` del interceptor 401. Reemplazar por: `authStore.logout()` + `navigate('/login')` (sin reload).
- [ ] Endpoint `GET /api/auth/sessions` que liste sesiones activas del usuario (UI futura).

**Entregable:** sesiones revocables. Logout real. Resistencia a robo de access token (TTL corto). Sesiones por dispositivo.

---

### Fase 4 — Roles, permisos y guards
> **Riesgo:** medio · **Esfuerzo:** medio · **Bloquea:** rutas de admin

- [ ] Modelo de roles formalizado en `backend/constants/roles.js`: `ROLES = { CLIENTE: 'cliente', COMERCIANTE: 'comerciante', ADMINISTRADOR: 'administrador' }`. Importar desde controllers (eliminar magic strings).
- [ ] Actualizar `User.rol` enum: `[ROLES.CLIENTE, ROLES.COMERCIANTE, ROLES.ADMINISTRADOR, null]`.
- [ ] Documentar matriz rol → endpoints permitidos en este mismo doc o en `backend-rules.mdc`.
- [ ] Frontend: agregar `ProtectedAdminRoute` y rutas `/admin/*` en `AppRoutes.tsx`. Tipar `requiredRole?: 'cliente' | 'comerciante' | 'administrador'`.
- [ ] **Decidir si introducir permisos granulares** (ver §7 D4). Si no: dejar role-based simple. Si sí: agregar tabla `Permission` y middleware `requirePermission('producto:eliminar')`.
- [ ] Helpers de UI: `useUser()`, `useRole()`, `useIsRole(role)` en el store para evitar `user?.rol === '...'` repetido en componentes.

**Entregable:** sistema de roles consistente entre BD, backend, frontend y UI. Admin existe o no existe (decisión binaria), pero coherente.

---

### Fase 5 — Verificación, recuperación y endurecimiento
> **Riesgo:** medio · **Esfuerzo:** medio

- [ ] **Consolidar verificación**: un solo `POST /api/auth/verify` (acepta email + código). Un solo `POST /api/auth/verify/resend`. Eliminar `/verify-email` y `/resend-verification` legacy.
- [ ] Rate limit estricto por email en `/verify/resend` y `/forgot-password` (max 3/hora por email + 10/hora por IP).
- [ ] Cambiar token de recuperación de JWT firmado a string aleatorio criptográfico (`crypto.randomBytes(32).toString('hex')`) almacenado **hasheado** en `User.tokenRecuperacion`. JWT en email es exfiltrable y no necesita criptografía simétrica.
- [ ] Mismo cambio para `tokenVerificacion` (si se sigue usando el flujo legacy de token).
- [ ] **Decidir 2FA / "Recuérdame"** (ver §7 D5):
  - **Opción A:** implementar 2FA TOTP (Google Authenticator) usando los campos del modelo que hoy están muertos.
  - **Opción B:** eliminar los campos del modelo (`recordarme`, `tokenRecordatorio`, `codigo2FA`, `fechaExpiracion2FA`) hasta tener decisión real de producto.
- [ ] **Linking de cuentas seguro** en `firebaseLogin`: si existe un usuario local con el mismo email, **NO autoenlazar**. Exigir que el usuario haga login local primero y vincule desde su perfil con confirmación. (Cierra M16.)
- [ ] Política de password en backend y frontend sincronizada (resultado de Fase 2 + validación contra listas comunes opcional con `zxcvbn`).
- [ ] Auditoría de eventos de seguridad: crear modelo `AuthEvent` (login OK, login fallido, password reset solicitado, password cambiado, rol cambiado, sesión revocada). Registrar `userId`, `ip`, `userAgent`, `timestamp`, `meta`.

**Entregable:** flujos de verificación y recuperación a prueba de balas. Tokens no exfiltrables. Linking explícito. Trazabilidad de eventos.

---

### Fase 6 — Limpieza final
> **Riesgo:** nulo · **Esfuerzo:** bajo

- [ ] Eliminar el sistema OAuth descartado en Fase 2 (Passport o Firebase, según D2). Actualizar `package.json`.
- [ ] Eliminar `BadwarePage`-style leftovers: el path `/admin` colgado en `SocialLoginButtons.tsx` si Opción 4-B (no hay admin) ganó.
- [ ] Sustituir `console.*` por un logger único (`pino` o `winston`) con redacción automática de campos `password`, `token`, `idToken`, `Authorization`.
- [ ] Mover `apiKey` de Firebase del archivo `firebase.ts` a variables de entorno `REACT_APP_FIREBASE_*`.
- [ ] Eliminar campos muertos del modelo `User` si la decisión D5 fue "no 2FA".
- [ ] Documentar el módulo Auth en `backend/CONFIGURACION_OAUTH.md` actualizado + nueva sección "Flujo de auth completo" en el README.
- [ ] Remover `generate-jwt-secret.bat`/`.sh` o documentarlos en el README de backend.
- [ ] Re-leer `backend-rules.mdc` y validar que cada regla se cumple sobre el módulo.

**Entregable:** módulo Auth limpio, documentado y alineado con las reglas del proyecto.

---

## 6. Métricas objetivo

| Métrica | Antes | Objetivo |
|---|---|---|
| Endpoints en `/api/auth` | 14 (3 legacy + 2 dead OAuth) | 9 |
| Idiomas en el contrato API | 2 (es+en mezclados) | 1 |
| Endpoints con validador dedicado | 2 / 14 | 9 / 9 |
| LOC del controller principal | 857 | ≤ 250 |
| Sistemas de OAuth activos | 2 (Passport + Firebase) | 1 |
| Fuentes de truth para verificación JWT | 3 | 1 |
| Access token TTL | 7 días | 15 minutos |
| Refresh tokens | no existen | rotables + revocables |
| Token en URL/localStorage | sí | cookie httpOnly + CSRF (decisión D1) |
| Rate limit en login | global con `skipSuccessfulRequests: true` | dedicado, sin skip |
| Min password length | 6 | 8 + complejidad |
| Rol `administrador` funcional | roto (enum) | OK (o eliminado por completo) |
| Campos muertos en `User` | 5 (2FA + recordarme) | 0 |
| `fetch` directos en frontend de auth | 5 archivos | 0 |
| Auditoría de eventos de seguridad | no existe | tabla `AuthEvent` + endpoints |
| Loguear passwords/tokens en consola | sí (server.js, api.ts, authController.js) | nunca |

---

## 7. Decisiones pendientes (bloquean implementación)

> Cada decisión debe resolverse **antes** de iniciar la fase que la requiere.

- [ ] **D1 — Storage del token de sesión**
  - **Opción A (recomendada):** access token en memoria (Zustand sin persist) + refresh token en cookie httpOnly + CSRF. Más seguro contra XSS.
  - **Opción B:** ambos en `localStorage`. Status quo. Vulnerable a XSS pero sin trabajo extra.
  - **Bloquea:** Fase 1 (eliminación de token en URL) y Fase 3 completa.

- [ ] **D2 — Estrategia única de OAuth**
  - **Opción A (recomendada):** mantener Firebase, eliminar Passport. El frontend ya lo usa, simplifica deployment.
  - **Opción B:** mantener Passport, eliminar Firebase. Más control, una dependencia menos en runtime.
  - **Bloquea:** Fase 2 (refactor a services).

- [ ] **D3 — Idioma del contrato API**
  - **Opción A (recomendada):** inglés en routes y campos (`/register`, `/login`, `currentPassword`, `newPassword`). Mensajes al usuario en español. Convención REST estándar.
  - **Opción B:** español completo (`/registro`, `/iniciar-sesion`, `passwordActual`, `nuevaPassword`).
  - **Bloquea:** Fase 1 (fix de C6/C7).

- [ ] **D4 — Rol `administrador`: existe o no**
  - **Opción A:** agregar `'administrador'` al enum, crear rutas `/api/admin/*` y `/admin` en frontend, panel admin real.
  - **Opción B:** eliminar todas las referencias a `'administrador'` (controllers, rutas, frontend). El proyecto no tiene admin.
  - **Subdecisión (solo si A):** ¿permisos granulares (tabla `Permission`) o solo role-based?
  - **Bloquea:** Fase 1 (C4) y Fase 4 completa.

- [ ] **D5 — 2FA / "Recuérdame"**
  - **Opción A:** implementar TOTP (Google Authenticator) usando los campos muertos del modelo.
  - **Opción B (recomendada para esta etapa):** eliminar campos muertos. Documentar como roadmap futuro.
  - **Bloquea:** Fase 5 (parte) y Fase 6.

- [ ] **D6 — Linking de cuentas OAuth ↔ local con mismo email**
  - **Opción A (recomendada):** rechazar el OAuth si ya existe usuario local con ese email. Pedir login local + vincular desde perfil.
  - **Opción B:** mantener auto-link actual (riesgo de takeover M16).
  - **Bloquea:** Fase 5 (linking seguro).

- [ ] **D7 — Política de contraseñas**
  - **Opción A (recomendada):** min 8 + 1 mayúscula + 1 número + 1 símbolo (sin lista de comunes).
  - **Opción B:** la anterior + chequeo contra lista común (`zxcvbn` o HIBP API).
  - **Opción C:** min 12 sin requisitos de composición (recomendación NIST 2017+).
  - **Bloquea:** Fase 2 (validación).

---

## 8. Matriz de impacto vs esfuerzo

| Fase | Impacto en seguridad | Impacto en UX | Esfuerzo | Riesgo de regresión |
|---|---|---|---|---|
| Fase 0 — Hemorragia | 🔴 Crítico | ⚪ Nulo | 🟢 Bajo | 🟢 Bajo |
| Fase 1 — Contratos rotos | 🔴 Alto | 🟢 Alto (arregla features muertas) | 🟡 Medio | 🟡 Medio |
| Fase 2 — Arquitectura | 🟡 Medio | ⚪ Nulo (interno) | 🔴 Alto | 🟡 Medio |
| Fase 3 — Tokens/refresh | 🔴 Alto | 🟡 Medio (logout real, sesiones por device) | 🔴 Alto | 🔴 Alto |
| Fase 4 — Roles | 🟡 Medio | 🟡 Medio | 🟡 Medio | 🟡 Medio |
| Fase 5 — Verify/Recovery | 🟡 Alto | 🟡 Medio | 🟡 Medio | 🟡 Medio |
| Fase 6 — Limpieza | 🟢 Bajo | ⚪ Nulo | 🟢 Bajo | 🟢 Bajo |

---

## 9. Referencias

- Reglas del proyecto: `.cursor/rules/project-rules.mdc`, `.cursor/rules/backend-rules.mdc`, `.cursor/rules/api-rules.mdc`, `.cursor/rules/database-rules.mdc`
- Auditoría hermana: `docs/audits/home-audit.md`
- Archivos auditados (backend):
  - `backend/server.js`
  - `backend/controllers/authController.js`
  - `backend/routes/authRoutes.js`
  - `backend/middlewares/auth.js`
  - `backend/middlewares/validation.js`
  - `backend/middlewares/errorHandler.js`
  - `backend/utils/jwt.js`
  - `backend/utils/email.js`
  - `backend/utils/helpers.js`
  - `backend/config/passport.js`
  - `backend/config/firebaseAdmin.js`
  - `backend/models/User.js`
- Archivos auditados (frontend):
  - `frontend/src/services/api.ts`
  - `frontend/src/services/authService.ts`
  - `frontend/src/stores/authStore.ts`
  - `frontend/src/config/firebase.ts`
  - `frontend/src/types/index.ts`
  - `frontend/src/routes/AppRoutes.tsx`
  - `frontend/src/pages/auth/LoginPage.tsx`
  - `frontend/src/pages/auth/RegisterPage.tsx`
  - `frontend/src/pages/auth/VerifyEmailPage.tsx`
  - `frontend/src/pages/auth/SelectRolePage.tsx`
  - `frontend/src/pages/auth/CompleteMerchantProfilePage.tsx`
  - `frontend/src/pages/auth/OAuthCallback.tsx`
  - `frontend/src/components/auth/SocialLoginButtons.tsx`

---

## 10. Bitácora de cambios del documento

| Fecha | Cambio | Autor |
|---|---|---|
| 2026-05-11 | Auditoría inicial · 7 fases definidas · 7 decisiones pendientes · 15 críticos / 15 altos / 16 medios / 10 bajos | — |
