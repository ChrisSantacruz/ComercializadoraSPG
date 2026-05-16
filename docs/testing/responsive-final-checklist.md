# Checklist — QA responsive (staging visual)

**Objetivo:** confirmar **sin overflow horizontal**, spacing coherente y chrome móvil (nav, toasts, barras fijas) en los anchos de referencia.

**Entorno:** Chrome/Edge + DevTools responsive; iOS Safari (opcional, safe-area real).

---

## Viewports obligatorios

| Ancho | Enfoque |
|--------|---------|
| **320px** | Mínimo real; teclado virtual no cubierto por checklist |
| **375px** | iPhone estándar |
| **768px** | Tablet; filtros catálogo y densidad intermedia |
| **1024px** | Sidebar dashboard desktop; grids de catálogo |
| **Ultrawide** | `max-w-7xl` centrado; sin columnas “estiradas” raras |

---

## Globales

- [ ] **Sin scroll horizontal** en `body` al navegar home → productos → detalle → carrito → checkout.
- [ ] **Safe-area:** notch / home indicator no recortan CTAs ni toasts (iOS si aplica).
- [ ] **Offline banner** no tapa toasts ni modales; con red cortada, banner visible y legible.

---

## Navbar y marketing

- [ ] **Header público:** logo + acciones no desbordan; menú hamburguesa usable en 320px.
- [ ] **Menú móvil:** listas largas (categorías) hacen **scroll** dentro del panel, no la página entera fuera de control.
- [ ] **Offset** del `main` (debajo del header fijo) sin solapar hero o títulos en mobile vs `md+`.

---

## Catálogo y detalle

- [ ] **Filtros:** en `< lg`, botón “Filtros” abre/cierra panel; en tablet el panel no queda inaccesible.
- [ ] **Grid:** 1 col móvil; salto a 2 columnas en `md` sin tarjetas aplastadas.
- [ ] **Detalle producto:** barra inferior móvil (si aplica) no oculta contenido crítico; hay padding inferior suficiente en la página.

---

## Carrito y checkout

- [ ] **Carrito:** barra resumen fija móvil no tapa última línea del listado (padding inferior de página).
- [ ] **Checkout:** barra inferior “Total / Continuar / Pagar” respeta **safe-area**; pasos y formularios scrollean por encima.
- [ ] **Modal / drawer** de confirmación (si se abre en flujo) cabe en altura con scroll interno.

---

## Cuenta y comerciante

- [ ] **Dashboard:** en `< lg` **no** aparece sidebar ancho fijo; el menú sale del **drawer**.
- [ ] **Nav dashboard:** iconos y labels alineados; item activo legible.
- [ ] Rutas comerciante (`/merchant/*`) dentro del mismo shell: header + contenido sin doble scroll vertical anómalo.

---

## Auth

- [ ] Formularios login/registro: inputs y CTAs no desbordan 320px; errores visibles sin layout roto.

---

## Toasts

- [ ] **Una sola cola** visible; no hay segundo sistema de notificaciones superpuesto.
- [ ] **Móvil:** toasts aparecen **abajo**, legibles, cierre táctil OK.
- [ ] **Desktop:** toasts arriba a la derecha, no cubren el menú de usuario crítico.
- [ ] **Barra de progreso** avanza y el toast cierra sin “salto” visual raro.

---

## Regresión visual rápida

- [ ] Sin **doble sombra** exagerada en cards estándar tras cambios de densidad.
- [ ] **Hover** en cards/catálogo no produce saltos agresivos (valorar páginas no tocadas en esta pasada).

---

## Sign-off

- [ ] Ejecutado en **320 / 375 / 768 / 1024 / ultrawide**
- [ ] Build frontend `npm run build` sin errores
- [ ] Listo para **staging visual**
