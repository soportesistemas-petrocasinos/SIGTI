# Sistema de Gestión TI - SIGTI

La primera versión será solamente para gestionar las solicitudes que llegan al área de TI.

## Stack
- Frontend: React + Vite (`client/`)
- Backend: Node.js + Express 5 (`server/`)
- Base de datos: PostgreSQL, con migraciones y consultas vía Knex
- Validación de entrada: Zod
- Pruebas: Vitest (client y server) + Supertest (API)

## Comandos
Monorepo con npm workspaces; todos los comandos se corren desde la raíz.

- Instalar: `npm install`
- Configurar entorno: copiar `server/.env.example` a `server/.env` y llenar los valores
- Migrar BD: `npm run migrate` (aplica migraciones pendientes)
- Nueva migración: `npm run migrate:make -w server -- nombre_descriptivo`
- Correr (desarrollo): `npm run dev` (levanta client y server juntos)
- Probar: `npm test`
- Lint: `npm run lint`
- Build del frontend: `npm run build`

En desarrollo la API corre en el puerto `API_PORT` (3000 por defecto) y Vite (5173)
reenvía `/api` a ella. Se usa `API_PORT` y no `PORT` para no heredar el puerto de otra herramienta.

## Convenciones

### Estructura de carpetas
```
client/
  src/
    api/          # llamadas HTTP al backend
    components/   # componentes reutilizables
    pages/        # una carpeta/archivo por pantalla
    hooks/
server/
  src/
    routes/       # definición de rutas y validación (Zod)
    controllers/  # traducen request/response
    services/     # lógica de negocio
    db/           # conexión Knex y repositorios
    middlewares/  # errorHandler, validate (Zod), auth, etc.
    errors.js     # clase AppError
    app.js        # createApp(): arma Express (usado también por las pruebas)
  migrations/     # migraciones Knex (nunca editar las existentes)
  seeds/          # datos de prueba
  tests/
```

### Nombres e idioma del código
- Identificadores (variables, funciones, archivos, tablas, columnas) en **inglés**:
  `request`, `assignee`, `status`, tabla `requests`.
- Textos visibles al usuario, mensajes de error de la API y documentación en **español**.
- JavaScript/React: `camelCase` para variables y funciones, `PascalCase` para componentes.
- Base de datos: `snake_case` y tablas en plural (`requests`, `request_comments`).
- Rutas de la API en plural y bajo `/api`: `GET /api/requests`, `PATCH /api/requests/:id`.

### Manejo de errores
- El backend lanza `AppError(status, code, message)` para errores esperados
  (p. ej. `404 REQUEST_NOT_FOUND`, `400 VALIDATION_ERROR`).
- Un único middleware de errores en `server/src/middlewares/` arma la respuesta:
  `{ "error": { "code": "...", "message": "..." } }`.
- Errores no esperados: se registran con detalle en el log y se responde `500 INTERNAL_ERROR`
  sin exponer el stack ni detalles internos.
- Toda entrada (body, params, query) se valida con Zod en la ruta antes de llegar al servicio,
  usando `validate({ body: schema })`; los datos validados quedan en `req.validated`.
- En el frontend, `client/src/api/` traduce los errores de la API a mensajes para el usuario.

## Reglas
- No modificar migraciones existentes; los cambios al esquema van en migraciones nuevas.
- No subir credenciales; usar `.env` (y mantener un `.env.example` sin valores reales).
- Preguntar antes de cambiar el esquema de la BD.
