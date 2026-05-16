# QA responsive — checklist final

**Objetivo:** validación manual antes de staging (320px → ultrawide).

## Viewports

- [ ] 320px: sin scroll horizontal global; navbar + menú móvil usables.
- [ ] 375px: PDP, carrito, checkout, pedidos sin solapamiento de CTAs.
- [ ] 768px: filtros catálogo accesibles; tabs PDP scroll horizontal suave si aplica.
- [ ] 1024px+: PDP en dos columnas; checkout resumen lateral sticky.
- [ ] 1440px / ultrawide: contenedor centrado (`max-w-7xl`), sin filas “estiradas” raras.

## Flujos críticos

- [ ] **Catálogo → PDP → carrito → checkout:** sin errores de consola; POST orden con header `Idempotency-Key` sin error CORS.
- [ ] **Pedidos:** cabecera “Mis pedidos” + botones no se superponen; imágenes de líneas sin `src` vacío.
- [ ] **Sobre nosotros:** sin emojis; tipografía y CTAs legibles.
- [ ] **Wompi sandbox:** pago de prueba completo y retorno (ver `docs/testing/wompi-sandbox-full-flow.md`).

## Accesibilidad rápida

- [ ] Focus visible en tabs y botones principales.
- [ ] Textos alternativos en imágenes de producto.

## Sign-off

- [ ] `npm run build` (frontend) OK  
- [ ] Backend arranca con `.env` basado en `.env.example`  
- [ ] Listo para staging visual
