# SIGTI

Base inicial de un sistema de gestión de TI, con el cliente y la API separados.

## Estructura

- `frontend/`: interfaz React/Vite.
- `backend/`: API REST Express y autenticación JWT.
- `database/023_consolidate_public_production.sql`: migración definitiva para PostgreSQL / Supabase.

## Documentación para implementación empresarial

- [`docs/IMPLEMENTATION_GUIDE.md`](docs/IMPLEMENTATION_GUIDE.md): alcance funcional, arquitectura, procesos, despliegue, seguridad, plan por fases y criterios de aceptación.
- [`backend/docs/API.md`](backend/docs/API.md): referencia de endpoints.
- [`backend/docs/DATABASE.md`](backend/docs/DATABASE.md): modelo y migraciones.
- [`backend/docs/OPERATIONS.md`](backend/docs/OPERATIONS.md): operación y diagnóstico.

## Ejecución local

1. Copie `backend/.env.example` a `backend/.env` y cambie `JWT_SECRET`.
2. Instale las dependencias en cada carpeta con `npm install`.
3. En dos terminales, ejecute `npm run dev` dentro de `backend` y `frontend`.
4. Abra `http://localhost:5173`.

Para ejecutar el backend local con la configuración de producción, establezca `NODE_ENV=production` antes de `npm start`; en ese caso se carga `backend/.env.prod`.

## Despliegue en producción

Ejecute una sola vez `database/023_consolidate_public_production.sql` (o la copia equivalente en `backend/database/`) sobre la base de datos destino. El script consolida el modelo final en `public`, copia los datos existentes desde `test` si están presentes y crea las funciones RPC, índices y permisos requeridos por el backend.

Después de ejecutar el script, configure el backend para usar `SUPABASE_MAINTENANCE_SCHEMA=public` y reinícielo. El esquema `test` no se elimina automáticamente para permitir validar los datos migrados; retírelo en una migración posterior, cuando se confirme que la aplicación funciona únicamente con `public`.

Para desplegar el frontend en Vercel, configure la variable `VITE_API_URL` con la URL pública del backend más `/api` (producción actual: `https://sistema-integrado-gestion-ti-backen.vercel.app/api`) en los entornos Preview y Production, y vuelva a desplegar. No deje esa variable con `localhost:3000` en producción: ese valor solo funciona durante el desarrollo local.

Cada empleado usa el nombre de usuario generado durante la importación y la contraseña temporal `Petrocasinos2026`.
Esta contraseña debe cambiarse en la siguiente etapa del sistema.

> La cuenta está en memoria únicamente para esta primera entrega. Antes de producción se debe migrar a una base de datos y cambiar las credenciales.
