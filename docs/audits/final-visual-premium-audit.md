# Auditoría visual premium — staging

**Fecha:** 2026-05-15  
**Alcance:** frontend responsive + polish; ajustes mínimos backend (CORS); documentación Wompi sandbox; sin nueva arquitectura.

## Resumen ejecutivo

Se corrigieron **layouts móviles** críticos (pedidos, checkout, PDP), **navbar** más compacta (altura unificada `h-14`, blur suave, tagline solo en `lg+`), **CORS** para cabecera `Idempotency-Key` en órdenes, **imágenes** sin `src` vacío (`ProductImage`, pedidos, avatar en selección de rol), **PDP** sin métricas de ingresos privados y con **especificaciones tipo tabla** + **tabs subrayadas**, página **Sobre nosotros** reescrita (sin emojis ni estadísticas infladas), **checkout** con iconos Heroicons en lugar de emoji y pasos más densos. **Perfil** y **reseñas (merchant)**: sin emojis en UI, avatar/banner solo si hay URL no vacía (tras `trim()`), assets de reseña sin `src` vacío.

## Context7 / MCP

- Patrones consultados en sesión: composición responsive, tabs/dialogs Headless UI, layout ecommerce (en iteraciones previas del repo + esta pasada).
- **Magic MCP / shadcn MCP:** no confiables como dependencia (carga / no presentes en workspace); implementación directa en código.

## Archivos clave tocados

| Área | Archivos |
|------|-----------|
| CORS | `backend/server.js` |
| Imágenes | `ProductImage.tsx`, `Avatar.tsx`, `OrdersPage.tsx`, `SelectRolePage.tsx`, `ProfilePage.tsx`, `MerchantReviewsPage.tsx` |
| Navbar / layout | `Navbar.tsx`, `NavbarDesktopNav.tsx`, `PublicLayout.tsx` |
| PDP | `ProductDetailPage.tsx`, `Tabs.tsx` |
| Checkout | `CheckoutPage.tsx` |
| Pedidos | `OrdersPage.tsx` |
| Cuenta | `ProfilePage.tsx` |
| Merchant | `MerchantReviewsPage.tsx` |
| Marketing | `AboutUsPage.tsx` |
| Entorno | `backend/.env.example`, `frontend/.env.example` |

## Riesgos residuales

- **Chat flotante** y **toasts inferiores** pueden competir por la misma franja en ciertas rutas; revisar en QA manual.
- Métricas “públicas” en otros módulos (merchant) no fueron auditadas en esta pasada exhaustiva.
- **Claves Wompi** en `.env.example` son de **sandbox** compartidas como referencia; rotar en tu propio panel si es necesario.

## Build

- Ejecutar `npm run build` en `frontend` tras cambios (validado en pipeline local recomendado).
