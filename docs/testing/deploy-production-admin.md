# Despliegue producción + bootstrap admin

Fecha: 2026-05-25

## URLs

| Servicio | URL |
|----------|-----|
| Frontend | https://andinoexpress.com |
| Backend API | https://comercializadoraspg.onrender.com |

## 1. Push a GitHub (dispara deploy)

Render/Vercel deben estar conectados a `main` en `ChrispinSantacruz/ComercializadoraSPG`.

Tras el push, espera estado **Live** en el backend y build OK en el frontend.

## 2. Variables en Render (backend)

Servicio: `comercializadoraspg` (o el nombre actual del Web Service).

```env
NODE_ENV=production
FRONTEND_URL=https://andinoexpress.com
MONGODB_URI=<tu_uri_atlas>
JWT_SECRET=<secreto_largo_unico>
JWT_EXPIRE=30d

# Wompi sandbox (pruebas staging real)
WOMPI_PUBLIC_KEY=pub_test_vCPe0u28F8LelBmQ0FKvosSHMsrQAm7K
WOMPI_PRIVATE_KEY=prv_test_VOjFWhNYZ7mZQOKZf0xX4KKM6LJQAQSO
WOMPI_INTEGRITY_SECRET=test_integrity_IEKn14ygMN0L9P6PlujjkHIKPitLl8a6
WOMPI_EVENTS_SECRET=test_events_KGhXkD3ZZ7ArHpWfIEmPbwVeptF8QA5R
WOMPI_API_URL=https://sandbox.wompi.co/v1

# Ventana corta solo para crear superadmin
ENABLE_ADMIN_BOOTSTRAP=true
ADMIN_BOOTSTRAP_SECRET=<genera_un_secreto_largo>
```

Opcional: `CLOUDINARY_*`, `EMAIL_*`, `GOOGLE_CLIENT_*` si ya los usas.

**No** uses `CORS_ALLOW_NO_ORIGIN` en producción.

## 3. Variables en hosting del frontend

Deben coincidir con el build (CRA embebe en compile time):

```env
REACT_APP_API_URL=https://comercializadoraspg.onrender.com
REACT_APP_WOMPI_PUBLIC_KEY=pub_test_vCPe0u28F8LelBmQ0FKvosSHMsrQAm7K
REACT_APP_ENV=production
```

Si el front está en Vercel/Render Static, **redeploy** después de cambiar estas variables.

## 4. Crear superadmin (una sola vez)

Con `ENABLE_ADMIN_BOOTSTRAP=true` y deploy **Live**:

**PowerShell:**

```powershell
$secret = "TU_ADMIN_BOOTSTRAP_SECRET"
$body = @{
  secret = $secret
  adminData = @{
    nombre = "Admin Principal"
    email = "tu-email@dominio.com"
    password = "PasswordSeguro123!"
  }
} | ConvertTo-Json -Depth 3

Invoke-RestMethod `
  -Method POST `
  -Uri "https://comercializadoraspg.onrender.com/api/admin/bootstrap-superadmin" `
  -Headers @{ "X-Admin-Bootstrap-Secret" = $secret; "Content-Type" = "application/json" } `
  -Body $body
```

**curl (bash/Git Bash):**

```bash
curl -X POST "https://comercializadoraspg.onrender.com/api/admin/bootstrap-superadmin" \
  -H "Content-Type: application/json" \
  -H "X-Admin-Bootstrap-Secret: TU_ADMIN_BOOTSTRAP_SECRET" \
  -d '{"secret":"TU_ADMIN_BOOTSTRAP_SECRET","adminData":{"nombre":"Admin Principal","email":"tu-email@dominio.com","password":"PasswordSeguro123!"}}'
```

Respuesta esperada: `201` con `rol: superadmin`.

## 5. Cerrar bootstrap (obligatorio)

En Render, **elimina o pon en false**:

```env
ENABLE_ADMIN_BOOTSTRAP=false
```

Opcional: rota `ADMIN_BOOTSTRAP_SECRET` y guarda deploy.

## 6. Probar en el navegador

1. `GET https://comercializadoraspg.onrender.com/api/health` → 200
2. https://andinoexpress.com/login → credenciales del superadmin
3. Debe redirigir a `/admin`
4. Merchant: crear producto → estado `pending`
5. Admin: aprobar → producto visible en `/productos`
6. Checkout Wompi sandbox

## 7. Smoke CORS (consola del navegador)

En https://andinoexpress.com, Network → cualquier `GET /api/products` debe tener:

- `Access-Control-Allow-Origin: https://andinoexpress.com`
- Sin error de preflight

## Troubleshooting

| Síntoma | Acción |
|---------|--------|
| 404 bootstrap | `ENABLE_ADMIN_BOOTSTRAP` no es `true` o deploy viejo |
| 401 bootstrap | `ADMIN_BOOTSTRAP_SECRET` no coincide con header/body |
| CORS bloqueado | `FRONTEND_URL=https://andinoexpress.com` en backend |
| Admin no entra a `/admin` | Usuario debe tener `rol` `superadmin` o `admin` |
| Wompi falla al arrancar | Revisar logs Render; claves sandbox + `WOMPI_API_URL` sandbox |
