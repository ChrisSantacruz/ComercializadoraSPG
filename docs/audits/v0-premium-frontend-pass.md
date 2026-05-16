# Auditoría — pase visual enterprise (v0/Magic + código)

**Fecha:** 2026-05-15  
**Alcance:** refinamiento visual UX sin nueva arquitectura ni refactor masivo backend. Objetivos alineados a `docs/ui/design-system.md`, `docs/ui/responsive-rules.md`, `docs/roadmap/frontend-refactor-roadmap.md`.

---

## Herramientas MCP

| Herramienta | Resultado |
|-------------|-----------|
| **21st Magic (inspiración)** | OK — referencias de navbar e-commerce recuperadas como guía rápida. |
| **v0 MCP (`createChat`)** | Falló con **401 Unauthorized** (API no configurada o token ausente). No se generaron prompts adicionales en v0 dentro de esta pasada; el diseño se aplicó desde tokens existentes + criterios de la documentación interna. |
| **Context7 / shadcn** | Repo ya sigue patrón *headless + Tailwind tokens* equivalente shadcn (ver `design-system.md` §4). No se añadieron deps Radix/shadcn. |

---

## Cambios ejecutados en código

1. **Navbar pública:** cabecera clara tipo SaaS (`bg-white/92`, blur, borde sobrio); logo y marca con jerarquía tipográfica; iconos neutros; CTA registrar en `gray-900`; **badge del carrito solo si `count > 0`**; promo bar menos saturada (emerald sobrio).
2. **Drawer móvil:** panel blanco + overlay; enlaces tipo Linear/Vercel (hover `gray-100`); navegación accesible.
3. **Búsqueda (strip):** panel gris neutro; chips y botón “Buscar” coherentes con la cabecera clara.
4. **PDP:** tarjeta vendedor con `nombreEmpresa`, `descripcionEmpresa`, rubro, verificación, sitio web; pestaña “Vendedor” ampliada; migas de pan más discretas; toast de carrito unificado en título `Carrito`.
5. **Checkout:** en móvil el **resumen va primero** (`order-1`), formulario después (`order-2`); corrección de ruta vacía (`/productos`); eliminado carácter decorativo en label de dirección.
6. **Toasts:** eliminada duplicación típica (catálogo + store); cola acotada a 4; estilo más compacto (radio, tipografía 12–13px).
7. **Home / carrito:** `HomePage` usa `useCartStore` + misma política de notificación que catálogo.
8. **Auth social:** sólo Google en UI; Firebase sin FacebookProvider; **`POST /auth/firebase-login`** rechaza `provider !== 'google'`.
9. **SupportChat:** sin emojis; header neutro; CTA rápidas con iconos Heroicons; botón flotante monocromático con icono sólido.
10. **Sobre nosotros:** franja de indicadores sobrios entre hero y pilares.

---

## `.env` backend (sandbox local)

Intento de reescritura automatizada del `backend/.env` local falló porque el archivo estaba bloqueado por otro proceso. **Acción manual recomendada:** cerrar procesos que tengan el archivo abierto, luego establecer para pruebas locales:

- `FRONTEND_URL=http://localhost:3000`
- Claves API **sandbox** Wompi (ver `backend/.env.example`) y `WOMPI_API_URL=https://sandbox.wompi.co/v1`

**Seguridad:** si alguna clave de producción pudo exponerse en entornos no confiables, **rota llaves en Wompi / SendGrid / Firebase** desde sus consolas.

---

## Build

`npm run build` en `frontend/` finaliza OK; advertencias ESLint previas `react-hooks/exhaustive-deps` en otras páginas (checkout/orders/payment) — no bloqueantes; no fueron objeto de esta pasada.

---

## Pendientes opcionales (no bloqueantes)

- Migrar PDP `lg:sticky` offset si se afinan alturas promo+header (`PublicLayout`).
- Consolidar clase `btn-primary` en Checkout con primitivos `Button` en iteración siguiente.
- Reintentar integración **v0** cuando el MCP tenga autorización válida.
