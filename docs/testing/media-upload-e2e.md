# E2E manual — medios y creación de productos

**Entorno:** local (`STORAGE_DRIVER=local`, API `:5001`, SPA `:3000`)  
**Rol:** comerciante autenticado

---

## Pre-requisitos

- [ ] MongoDB en ejecución
- [ ] `backend/.env` con `STORAGE_DRIVER=local`
- [ ] `npm run dev` backend + frontend
- [ ] Carpetas creadas al primer upload: `backend/uploads/products`, `backend/uploads/videos`

---

## 1. Producto simple (sin variantes)

| Paso | Acción | Esperado |
|------|--------|----------|
| 1 | Ir a Mis Productos → Nuevo | Formulario premium carga |
| 2 | Completar nombre, descripción, precio, stock, categoría | Validación OK |
| 3 | Subir 2 imágenes JPG (< 5 MB) | Previews + barra de progreso |
| 4 | Reordenar imágenes (flechas) | Primera = portada |
| 5 | Guardar | 201, mensaje pendiente moderación |
| 6 | Ver tarjeta en listado | Imagen visible (`/uploads/products/...`) |
| 7 | Abrir URL imagen en navegador | 200, archivo servido |

---

## 2. Producto con variantes

| Paso | Acción | Esperado |
|------|--------|----------|
| 1 | Definir atributos Color/Talla y generar variantes | Tabla responsive |
| 2 | Asignar precio y stock por variante | Stock total solo lectura = suma |
| 3 | Subir 1 imagen de producto | OK |
| 4 | Guardar | Producto creado, `stock` = suma variantes |
| 5 | Editar y verificar stock en listado | Coincide con suma |

---

## 3. Video de producto

| Paso | Acción | Esperado |
|------|--------|----------|
| 1 | Subir MP4 < 50 MB | Preview con controles |
| 2 | Guardar producto | `media` incluye `type: video` |
| 3 | GET producto (API o detalle) | URL video accesible |

---

## 4. Edición de medios

| Paso | Acción | Esperado |
|------|--------|----------|
| 1 | Editar producto existente | Medios guardados visibles |
| 2 | Eliminar una imagen guardada (X) | Desaparece del formulario |
| 3 | Subir imagen nueva | Se añade a la galería |
| 4 | Reordenar medios guardados | Orden persistido tras guardar |
| 5 | Guardar | `removedMediaIds` + `mediaOrder` aplicados |

---

## 5. Casos de error

| Caso | Acción | Esperado |
|------|--------|----------|
| Archivo inválido | Subir `.pdf` como imagen | Mensaje visible, no envía |
| Imagen > 5 MB | Subir archivo grande | Warning en UI |
| Video > 50 MB | Subir video grande | Warning en UI |
| Variante precio 0 | Precio vacío en variante | Error validación frontend |
| Variantes duplicadas | Misma combinación atributos | `VARIANT_CONFLICT` o error claro |
| Sin red | Desconectar y guardar | Error de red visible |

---

## 6. Payload y resiliencia

| Caso | Acción | Esperado |
|------|--------|----------|
| Payload grande | 8 imágenes + 2 videos válidos | Progreso %, éxito o límite claro |
| Refresh navegador | F5 durante upload | Estado coherente (reintentar) |
| Retry upload | Reenviar tras error 413 | Mensaje `FILE_TOO_LARGE` |

---

## 7. Responsive

| Viewport | Verificar |
|----------|-----------|
| 320px | Dropzone usable, botones fijos inferiores |
| 768px | Grid 2–3 columnas previews |
| Desktop | Sidebar resumen + secciones |

---

## 8. Consola y red

- [ ] Sin errores React en consola
- [ ] `POST /api/products` → 201, `exito: true`
- [ ] `Content-Type: multipart/form-data` sin boundary manual
- [ ] Imágenes: `GET /uploads/products/...` → 200

---

## Checklist post-deploy staging

- [ ] `STORAGE_DRIVER=local` en staging
- [ ] Volumen persistente montado en `/uploads` (si aplica)
- [ ] CORS permite origen del SPA
- [ ] `REACT_APP_API_URL` apunta al API correcto
