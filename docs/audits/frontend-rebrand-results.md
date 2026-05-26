# Frontend rebrand results

**Fecha:** 2026-05-25  
**Objetivo:** alinear el branding visible al usuario bajo **Andino Express** sin renombrar contratos, imports, modelos ni rutas técnicas.

## Archivos modificados

- `frontend/src/components/nav/navData.ts`
- `frontend/src/components/seo/SeoHead.tsx`
- `frontend/src/components/ui/ErrorDisplay.tsx`
- `frontend/src/components/dashboard/TopProductsWidget.tsx`
- `frontend/src/components/forms/DeliveryConfirmationForm.tsx`
- `frontend/src/components/forms/ReviewForm.tsx`
- `frontend/src/components/profile/NotificationCenter.tsx`
- `frontend/src/components/charts/RatingsChart.tsx`
- `frontend/src/pages/home/HomePage.tsx`
- `frontend/src/pages/checkout/CheckoutPage.tsx`
- `frontend/src/pages/ContactPage.tsx`
- `frontend/src/pages/auth/CompleteMerchantProfilePage.tsx`
- `frontend/src/pages/merchant/MerchantOrders.tsx`
- `frontend/src/pages/merchant/MerchantReviewsPage.tsx`
- `frontend/src/pages/payment/PaymentSuccessPage.tsx`
- `frontend/public/index.html`
- `frontend/public/manifest.json`
- `frontend/public/images/default-product.svg`
- `backend/config/branding.js`
- `backend/services/emailService.js`
- `backend/services/transactionalEmailService.js`
- `backend/utils/email.js`
- `backend/services/wompiService.js`
- `backend/controllers/orderController.js`
- `backend/routes/maintenanceRoutes.js`

## Branding actualizado

- Marca visible centralizada en navegación, footer, dashboard y checkout: **Andino Express**.
- SEO CSR actualizado en `SeoHead`: `document.title`, `og:title` y `og:site_name`.
- Metadata pública actualizada en `index.html` y `manifest.json`.
- Emails transaccionales y utilitarios muestran **Andino Express** en remitente por defecto, asuntos, header y footer.
- Checkout, recogida en punto y descripciones de pago Wompi muestran el nuevo nombre comercial.
- Se eliminaron emojis visibles de componentes tocados, reemplazándolos por Heroicons o copy textual.

## Riesgos evitados

- No se renombraron rutas API, modelos Mongoose, colecciones, imports, enums ni nombres de archivos.
- Se mantuvo `spg_checkout_draft_v1` para no invalidar drafts de checkout existentes.
- Se mantuvieron números de orden `SPG-*` porque son identificadores técnicos y pueden estar persistidos.
- No se modificaron variables de entorno ni claves de proveedores.
- No se cambiaron contratos de Wompi; solo descripciones visibles enviadas al proveedor.

## No tocado intencionalmente

- Referencias técnicas de backend como `server.js`, scripts de inicialización y helpers de número de orden.
- Comentarios no renderizados, por ejemplo la nota de paleta en `frontend/tailwind.config.js`.
- Documentos históricos de auditoría y roadmaps que describen el estado anterior.
- Nombres de paquete y rutas del repositorio.

## Deuda restante

- Falta una revisión visual manual en navegador para confirmar densidad, cortes de línea y contraste tras el cambio de marca.
- Algunas pantallas legacy mantienen estilos antiguos aunque el texto visible ya no contradice la marca.
- Conviene centralizar metadata estática adicional si se agregan más archivos públicos o plantillas de email.
