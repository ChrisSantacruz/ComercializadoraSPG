# QA responsive — checklist final post-pase visual

**Referencias:** `docs/ui/responsive-rules.md`, offsets en `layouts/PublicLayout.tsx`, breakpoints Tailwind estándar.

---

## Anchos objetivo

| Viewport | Comportamiento a verificar |
|----------|----------------------------|
| **320 × 568** | Sin overflow horizontal; toasts/stacking inferior; FAB ayuda visible; PDP barra inferior no tapa contenido útil |
| **375 × 812** | Carrito navbar/badge; Checkout resumen antes del formulario; FAB no colisiona con toasts inferiores |
| **768 × 1024** | Navbar desktop aparece promo + shell; PDP grid 2 columnas; filtros catálogo (drawer) |
| **1024 × 768** | Sticky PDP galería; checkout `lg:` resumen derecha sticky |
| **≥ 1440 / ultrawide** | Contenido contenido (`max-w-7xl`/Container); navbar no “estira” tipografía irregular |

---

## Flujos manuales (marcar ✅)

### Navbar / promos / búsqueda

- [ ] Promoción sólo desde `md+`, texto legible, contraste suficiente
- [ ] Búsqueda: strip gris separa bien del toolbar
- [ ] Menú hamburguesa: overlay cierra tocando fuera

### PDP

- [ ] Migas truncan nombre largo sin romper línea (`max-w`/truncate)
- [ ] Tarjeta vendedor: descripción empresa (si viene del API); link web abre nueva pestaña
- [ ] CTA inferior móvil: total + botones dentro de zona segura inferior

### Checkout

- [ ] Paso 1: resumen aparece **arriba** en teléfono
- [ ] Barra inferior fija: “Continuar” / “Pagar” dentro de thumb reach
- [ ] Paso 2: documento pagador válido muestra mensaje claro si falla validación local

### Carrito / Catálogo

- [ ] Añadir producto desde catálogo: **single toast** “Carrito” con CTA opcional
- [ ] Badge carrito sólo cuando `count > 0`

### Auth

- [ ] Sólo Google en login/registro; Facebook **no debe** mostrarse
- [ ] Intento ficticio `{ provider:'facebook' }` → backend 400 esperado tras actualización servidor

### Chat ayuda

- [ ] FAB sin emoji; panel legible contraste texto/fondo en tema claro/dark sistemas cuando aplique accesibilidad forzada

### Dashboard merchant

- [ ] Sidebar no invade zona mínima contenido tablet; grids no “comprimidos” en 768

---

## Regresión conocida opcional build

 ESLint warnings `exhaustive-deps` en algunas páginas legadas (`CheckoutPage`: efecto ciudad/departamento; órdenes/pago success). Registrar si se refactorizan en hito aparte.

---

## Resultado esperado al cerrar QA

Staging listo para **capturas** (marketing + QA manual) sin overflow críticos y con sensación SaaS sobria coherent con la guía enterprise del proyecto.
