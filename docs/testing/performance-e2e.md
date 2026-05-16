# Plan de pruebas E2E / manuales — performance y fluidez SPA

**Fecha:** 2026-05-15  
**Ámbito:** Navegación, red lenta, concurrencia, responsive, sesión y carrito.  
**Relacionado:** `docs/testing/auth-test-plan.md`, `docs/testing/wompi-e2e.md`, `docs/performance/frontend-performance-audit.md`.

---

## 1. Precondiciones

- Backend accesible (`REACT_APP_API_URL` coherente con `config/env.ts`).
- Build de producción opcional: `npm run build` + `npx serve -s build` para validar chunks y minificación.

---

## 2. Matriz de casos

### 2.1 Navegación rápida entre rutas

| Paso | Acción | Resultado esperado |
|------|--------|---------------------|
| 1 | Ir `/` → `/productos` → PDP → `/carrito` rápidamente | Primera visita a cada ruta puede mostrar **fallback de Suspense** breve; sin errores en consola por estado en componente desmontado. |
| 2 | Repetir el circuito | Chunks en caché: **menos o nulo** fallback perceptible. |

### 2.2 Red lenta (Chrome DevTools)

| Perfil | Acción | Resultado esperado |
|--------|--------|---------------------|
| Slow 3G | Cargar home | Secciones con `allSettled` no vacían todo el landing por un solo fallo. |
| Slow 3G | Escribir en búsqueda del catálogo | **Debounce ~300 ms**; no un request por tecla. |
| Offline intermitente | PDP con error | Mensaje de error visible + retry si la UI lo expone. |

### 2.3 Refresh durante async

| Paso | Acción | Resultado esperado |
|------|--------|---------------------|
| 1 | Abrir `/productos`, refrescar durante skeleton | Sin crash; URL preserva query si existía. |
| 2 | Abrir PDP, refrescar | `SeoHead` restaura título/meta al hidratar. |

### 2.4 Concurrencia / categorías

| Paso | Acción | Resultado esperado |
|------|--------|---------------------|
| 1 | En red Fast 3G, abrir `/` y enseguida `/productos` | Red: **una** petición `categories/active` en vuelo compartida (dedupe); TTL evita refetch inmediato al volver dentro de 5 min. |

### 2.5 Resize desktop / tablet / móvil

| Viewport | Ruta | Resultado esperado |
|----------|------|---------------------|
| 768–1023px | `/productos` | Acceso a filtros vía control móvil/tablet; sin `overflow-x` roto en el grid principal. |
| &lt;640px | `/carrito`, `/checkout` | CTAs alcanzables; teclado móvil no tapa inputs críticos (revisión visual). |

### 2.6 Imágenes / LCP (orientativo)

| Paso | Acción | Resultado esperado |
|------|--------|---------------------|
| 1 | PDP en móvil | Primera imagen con prioridad alta donde `ProductCard` / galería lo definan. |
| 2 | Lista larga | Imágenes fuera del viewport con carga perezosa donde corresponda. |

### 2.7 Sesión y carrito

| Paso | Acción | Resultado esperado |
|------|--------|---------------------|
| 1 | Login, añadir al carrito, cerrar pestaña, reabrir | Persistencia según `cartStore` / auth (comportamiento actual documentado en audits). |
| 2 | Cambiar de pestaña del navegador durante checkout | Sin doble submit si botones en `loading` (DEC-LOAD-003). |

### 2.8 Dashboard comerciante (datos pesados)

| Paso | Acción | Resultado esperado |
|------|--------|---------------------|
| 1 | `/merchant` con muchos datos | Spinner o secciones no bloquean toda la app globalmente. |
| 2 | Lazy load de página | Primera entrada puede mostrar `RouteChunkFallback` una vez. |

---

## 3. Criterios de aprobación

- [ ] Ningún error no capturado en consola en los flujos anteriores.
- [ ] `npm run build` sin errores de compilación.
- [ ] Navegación usable en throttling Slow 3G en home + catálogo.
- [ ] Categorías: ausencia de ráfagas duplicadas evidentes en Network al navegar entre home y catálogo.

---

## 4. Seguimiento

Registrar hallazgos en `docs/performance/frontend-performance-audit.md` (sección wins/bottlenecks) y tickets de producto para contratos backend que bloqueen optimizaciones adicionales.
