# Auditoría resultados — Core premium (iteración 2026-05-15)

**Estado:** parcial (carril **Auth + documentación E2E** cerrado en código; resto backlog explícito).  
**Build:** `frontend` — `npm run build` **OK** (warnings ESLint preexistentes en otros módulos).

---

## 1. Context7 / Magic MCP

- **Context7:** no se invocó herramienta MCP desde este agente (descriptor de servidor no presente en el workspace de archivos MCP disponible para la sesión). Criterios técnicos se aplicaron desde `decisions.md`, `design-system.md` y patrones ya documentados en `docs/testing/auth-test-plan.md` (React Router, Axios interceptors, Firebase popup).  
- **Magic MCP (21st.dev):** no disponible en la sesión; refinamiento visual se basó en **tokens semánticos** (`primary-*`, `secondary-*`, `error-*`, `success-*`, `warning-*`), **Headless UI vía primitivos existentes** y **AuthLayoutShell** ya alineado al sistema.

---

## 2. Cambios implementados (resumen)

### Auth UX

- **Rutas faltantes corregidas:** existía enlace a `/forgot-password` sin ruta; se añadieron `ForgotPasswordPage`, `ResetPasswordPage` y rutas `forgot-password`, `restablecer-password` (query `token` como en email), `reset-password/:token`.  
- **RegisterPage:** migración a `AuthLayoutShell`, `react-hook-form` + `yup` + `@hookform/resolvers`, primitivos `FormField` / `Input` / `Select` / `Button`, toggles de contraseña con **Heroicons** (eliminados emojis), feedback de servidor vía `setError('root')` + store.  
- **VerifyEmailPage:** mismo shell que login/registro; eliminados hex arbitrarios y emojis; entradas con primitivos; **toasts canónicos** `showSuccess` / `showError` con firma `(title, message)`; navegación inmediata tras verificación OK.  
- **LoginPage:** banner de éxito tras reset vía `?notice=reset` + strip de query (evita estado perdido en remount).  
- **AuthLayoutShell:** marca lateral usa `BRAND_NAME` desde `navData.ts` (**DEC-UI-008**).

### Contratos

- Reset password: coherente con backend actual (`req.params.token` + `newPassword` en body) ya soportado en `authService` / `restablecerPassword`.  
- Email de recuperación apunta a `FRONTEND_URL/restablecer-password?token=...` — la nueva página lee el token del **query string**.

---

## 3. Edge cases corregidos o mitigados

| Antes | Después |
|-------|---------|
| `/forgot-password` → efectivamente **404** | Página funcional + mensaje anti-enumeración |
| Registro UI inconsistente (hex blue, emojis, sin shell) | Misma jerarquía visual que login |
| Verify email mezclaba `bg-[#…]`, emojis, `Button` inconsistente | Tokens semánticos + canal único de toasts |
| Tras reset, usuario sin feedback claro | Banner en login tras `notice=reset` |
| Marca duplicada literal en shell | `BRAND_NAME` centralizado |

---

## 4. Archivos tocados

- `frontend/src/pages/auth/ForgotPasswordPage.tsx` *(nuevo)*  
- `frontend/src/pages/auth/ResetPasswordPage.tsx` *(nuevo)*  
- `frontend/src/pages/auth/RegisterPage.tsx`  
- `frontend/src/pages/auth/VerifyEmailPage.tsx`  
- `frontend/src/pages/auth/LoginPage.tsx`  
- `frontend/src/components/auth/AuthLayoutShell.tsx`  
- `frontend/src/routes/AppRoutes.tsx`  
- `docs/testing/core-premium-e2e.md` *(nuevo)*  
- `docs/audits/core-premium-results.md` *(nuevo)*  

---

## 5. Deuda real (no cerrada en esta iteración)

1. **Perfil / merchant / métricas:** auditoría puntual de endpoints, NaN, optimistic updates — sin cambios en esta entrega.  
2. **ProductDetailPage / carrito / checkout multi-step:** siguen como en código previo; `core-premium-e2e.md` los deja como checklist.  
3. **Dashboards:** MerchantDashboard imports sin usar (charts) — warning ESLint ya existía; rediseño enterprise pendiente.  
4. **Backend:** CORS, rate limits, refresh en BD, `auth-audit` fases 0–6 — fuera del diff actual.  
5. **PublicLayout + auth:** auth sigue bajo `PublicLayout` (navbar + footer); para “fullscreen auth” habría que extraer rutas a layout dedicado (**DEC-RESP-004** / producto).  
6. **Un solo patrón loading global:** bootstrap sigue con `LoadingSpinner` fullscreen (aceptable según auth-test-plan); otras páginas pendientes de skeletons (**DEC-LOAD-001**).  
7. **E2E automatizado:** sigue siendo manual hasta Playwright/Cypress.

---

## 6. Riesgos residuales

- **Toasts + navegación:** tras verificar email, navegación inmediata a `/` puede hacer que el usuario no lea el toast; mitigación futura: retraso corto o banner en home.  
- **JWT en enlace de reset:** el token sigue siendo JWT en URL del correo (riesgo histórico en `auth-audit`); mitigación ideal: código de un solo uso intercambiado por sesión temporal (**DEC-AUTH-005**).  
- **Yup + TypeScript:** `yupResolver` casteado a `Resolver<RegisterFormValues>` para evitar desajuste de tipos generados; si se endurece el esquema, revisar tipos inferidos.

---

## 7. Próximos pasos sugeridos (orden)

1. Extraer rutas auth a layout sin navbar o con `PublicLayout` variant “authMinimal”.  
2. `ProductDetailPage` + carrito: galería, drawers, optimistic cart (**DEC-STATE** / carrito).  
3. Checkout: pasos + verificación server-side en success (**DEC-FORM-006**).  
4. Merchant dashboard: datos reales + quitar imports muertos.  
5. Playwright: flujos A1–A15 mínimos.
