# Performance — experiencia producto

**Fecha:** 2026-05-15  
**Referencias:** `docs/performance/frontend-performance-audit.md`, DEC-PERF-001–006, DEC-DATA-001–005, DEC-LOAD-001–004.

---

## Cambios con impacto en bundle / runtime

| Tema | Impacto |
|------|---------|
| `npm run build` (post-cambios) | Compilación correcta; **main** gzip ~124 kB reportado por CRA en esta máquina (ligeramente distinto al snapshot previo ~109 kB — variación por hash/chunks) |
| TanStack Query | Dedupe de requests PDP (producto/categoría/relacionados) vs lógica previa encadenada en efecto |
| Carrito | Menos “tormenta” de spinners globales: fila en pending vía `isPending` de mutación; optimistic reduce percepción de latencia |
| Órdenes | Lista no refetch en cada tecla; refetch explícito / invalidación tras acciones |

---

## CLS / layout (orientación)

- PDP: skeleton inicial alineado al grid 2 columnas; galería en wrapper **sticky** para reducir saltos al scroll en desktop/tablet.
- Carrito móvil: resumen fijo + **`pb-*` compensatorio** en el contenedor principal para evitar solapamiento con última línea.
- Relacionados: skeleton de 3 cajas mientras fetch para evitar colapso brusco de sección.

---

## Riesgos de rendimiento

- **Polling** en detalle pedido (12s) solo en estados de pago pendiente; vigilancia de batería/red en móvil — aceptable para transacciones abiertas.
- **Invalidación amplia** `queryKeys.orders.all` post-mutación comerciante: correctitud > mínimo RPS; optimizar a prefijos más finos si el panel crece mucho.

---

## Próximas mediciones sugeridas

- Lighthouse móvil en PDP con Slow 4G (LCP en hero/galería).
- Comparar número de request `GET /categories/...` antes/después en navegación repetida (debe estar servido por caché Query + TTL).
