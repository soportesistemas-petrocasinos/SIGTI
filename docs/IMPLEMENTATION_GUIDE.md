# SIGTI — Guía de implementación empresarial

**Versión del documento:** 1.0  
**Fecha de revisión:** 5 de noviembre de 2026  
**Base:** código disponible en este repositorio

## 1. Propósito

SIGTI (Sistema Integrado de Gestión de Tecnologías de la Información) centraliza el control operativo de los recursos de TI de Petrocasinos y Cosecharte. El sistema permite registrar equipos, consultar y mantener su historial, administrar periféricos, asignar kits de trabajo, recibir solicitudes de soporte y validar el inventario reportado por los empleados.

Esta guía sirve como documento base para iniciar la implementación en la empresa. Describe lo que actualmente existe en el software, cómo debe instalarse y operarse, quién participa en cada proceso y qué controles deben completarse antes de declarar el sistema listo para producción.

## 2. Alcance funcional actual

### Para el área de Sistemas

- Consultar métricas de inventario, tickets, mantenimientos y préstamos activos.
- Registrar y editar equipos de cómputo.
- Consultar sedes por empresa.
- Registrar mantenimientos y consultar su historial.
- Registrar stock de periféricos.
- Asignar kits de periféricos a empleados y equipos.
- Registrar devoluciones con condición por elemento.
- Registrar el levantamiento físico de periféricos por equipo.
- Consultar y resolver solicitudes de soporte.
- Registrar usuarios corporativos.
- Consultar los reportes de inventario enviados por empleados.

### Para los empleados

- Iniciar sesión con su cuenta SIGTI.
- Consultar equipos y periféricos asociados a su usuario.
- Reportar el inventario físico de su equipo y periféricos.
- Crear solicitudes de soporte.
- Consultar el estado y la resolución de sus solicitudes.

### Fuera del alcance actual

- Integración con Active Directory, Entra ID, Google Workspace o un proveedor SSO.
- Notificaciones por correo, Teams, Slack o WhatsApp.
- Gestión de compras, contratos, licencias de software o garantías.
- Flujos de aprobación multinivel.
- Acuerdos de nivel de servicio (SLA) y escalamiento automático.
- Aplicación móvil nativa.
- Auditoría completa de cambios por usuario.

## 3. Arquitectura de solución

```text
Navegador del empleado o de Sistemas
              |
              | HTTPS / JSON / JWT
              v
Frontend React 19 + Vite
              |
              | REST bajo /api
              v
Backend Node.js + Express 5
  | autenticación JWT
  | validación Zod
  | autorización por rol
  | reglas de inventario, soporte y mantenimiento
              |
              | API REST de Supabase / PostgreSQL
              v
Base de datos SIGTI en esquema public
```

El frontend es una SPA. El backend concentra la seguridad y las reglas de negocio; el frontend no debe considerarse una barrera de autorización. La clave `SUPABASE_SERVICE_ROLE_KEY` se usa únicamente en el backend y nunca debe exponerse al navegador.

## 4. Componentes y tecnologías

| Componente | Tecnología | Ubicación |
|---|---|---|
| Interfaz web | React 19, Vite 6 | `frontend/` |
| API | Node.js, Express 5 | `backend/` |
| Autenticación | JWT y bcryptjs | `backend/src/auth.js`, `backend/src/app.js` |
| Validación | Zod | `backend/src/app.js` |
| Persistencia | PostgreSQL administrado por Supabase | `backend/database/023_consolidate_public_production.sql` |
| Despliegue previsto | Vercel | `frontend/vercel.json`, `backend/vercel.json` |
| Importación de datos | Excel mediante `xlsx` | `backend/scripts/` |
| Pruebas existentes | Node Test Runner | `backend/test/` |

## 5. Roles y responsabilidades

| Rol SIGTI | Responsable típico | Capacidades |
|---|---|---|
| `SISTEMAS` | Mesa de ayuda, soporte o administrador TI | Administración de inventario, usuarios, stock, asignaciones, mantenimientos, reportes y tickets |
| `USUARIO` | Empleado de la organización | Consulta de recursos propios, solicitudes y reporte de inventario |

La autorización se aplica en el backend. Un empleado solo puede consultar sus propios recursos y tickets; el rol `SISTEMAS` puede consultar y operar información transversal.

## 6. Procesos de negocio

### 6.1 Alta de equipo

1. Sistemas selecciona la empresa y la sede.
2. Registra código, tipo, responsable, características técnicas, antivirus y estado en GLPI.
3. SIGTI genera el código completo con el prefijo de empresa y tipo de equipo.
4. Se crea el primer registro de mantenimiento.
5. El equipo queda disponible para consulta, asignación y levantamiento físico.

El código base debe cumplir `EF` seguido de 3 o 4 dígitos. Para los reportes de empleados se exige `EF` seguido de 4 dígitos. Esta diferencia debe unificarse antes de una carga masiva o de definir una política corporativa de codificación.

### 6.2 Mantenimiento

1. Sistemas consulta el inventario y el historial.
2. Registra fecha, tipo, descripción, acciones y observaciones.
3. La próxima fecha se calcula automáticamente a seis meses de la fecha de mantenimiento.
4. El tablero clasifica los equipos como vencidos, próximos o al día.

### 6.3 Stock y asignación de periféricos

1. Sistemas registra existencias por tipo, marca, referencia, ubicación y cantidad.
2. Selecciona empleado, equipo y periféricos disponibles.
3. SIGTI registra la asignación y descuenta la disponibilidad mediante funciones transaccionales de PostgreSQL.
4. Al devolver, Sistemas registra la condición de cada elemento: bueno, limpieza, dañado o faltante.
5. El movimiento queda en el historial de stock.

Los tipos actuales son `mouse`, `keyboard`, `charge`, `cooling_base` y `mouse_pad`. La interfaz de asignación utiliza obligatoriamente mouse y teclado; la base permite además otros elementos.

### 6.4 Solicitud de soporte

1. El empleado crea una solicitud con título, descripción y prioridad.
2. Sistemas la visualiza en su bandeja.
3. Sistemas resuelve la solicitud y registra notas de resolución.
4. El empleado recibe la actualización cuando la interfaz detecta el cambio.

La notificación actual usa consulta periódica cada 30 segundos; no es una notificación en tiempo real ni reemplaza un canal corporativo de comunicación.

### 6.5 Levantamiento de inventario

1. El empleado consulta sus recursos o, si no encuentra equipo asignado, registra el código que tiene físicamente.
2. Reporta cantidades de periféricos.
3. El reporte queda en estado `pending`.
4. Sistemas revisa los reportes pendientes desde su módulo de inventario.

El código de reporte exige exactamente cuatro dígitos después de `EF` y cada cantidad admite de 0 a 50 unidades.

## 7. Modelo de datos funcional

| Grupo | Tablas principales | Uso |
|---|---|---|
| Acceso | `roles`, `usuarios` | Cuentas, roles, áreas y credenciales cifradas |
| Organización | `sites` | Empresas, sedes, ciudades y estado |
| Activos | `maintenances` | Ficha técnica y responsable de cada equipo |
| Mantenimiento | `maintenance_records` | Historial, técnico y próxima fecha |
| Periféricos | `peripheral_stock` | Existencias y estados del stock |
| Asignaciones | `assignments`, `assignment_items` | Entregas y devoluciones por empleado/equipo |
| Movimientos | `peripheral_stock_movements` | Trazabilidad del stock |
| Conteo físico | `area_peripheral_counts`, `equipment_peripheral_counts` | Verificación física |
| Soporte | `tickets` | Solicitudes, estado y resolución |
| Inventario empleado | `inventory_reports` | Reporte enviado y estado de validación |

La migración operativa es `backend/database/023_consolidate_public_production.sql` (también existe una copia en `database/`). Consolida el modelo en `public`, puede copiar datos desde `test` y conserva `test` para validación posterior. La migración `024_repair_systems_user_roles.sql` corrige usuarios del área Sistemas cuyo rol no corresponda.

## 8. Instalación local

Requisitos recomendados: Node.js 20 o superior y una instancia PostgreSQL/Supabase.

```powershell
cd backend
npm install
Copy-Item .env.example .env
npm run db:check
npm run dev
```

En otra terminal:

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Variables mínimas del backend:

| Variable | Requisito |
|---|---|
| `SUPABASE_URL` | URL del proyecto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave privada solo para el backend |
| `SUPABASE_MAINTENANCE_SCHEMA` | `public` en el ambiente objetivo |
| `JWT_SECRET` | Valor largo, aleatorio y distinto por ambiente |
| `FRONTEND_URL` | Origen real del frontend; admite varios separados por coma |
| `JWT_EXPIRES_IN` | Vigencia del token, por ejemplo `8h` |

Variable mínima del frontend:

```env
VITE_API_URL=https://dominio-del-backend/api
```

No coloque secretos en variables `VITE_*`, porque se incluyen en el JavaScript enviado al navegador.

## 9. Despliegue recomendado

### Base de datos

1. Crear el proyecto de PostgreSQL/Supabase.
2. Ejecutar `backend/database/023_consolidate_public_production.sql` con un usuario propietario.
3. Revisar conteos de usuarios, equipos, mantenimientos, stock, tickets y asignaciones.
4. Ejecutar `024_repair_systems_user_roles.sql` si aplica.
5. Mantener `test` hasta terminar la validación de datos; retirarlo mediante una migración posterior y controlada.

### Backend

1. Configurar las variables secretas en el proveedor de despliegue.
2. Publicar `backend/` con `npm start` o la configuración de `backend/vercel.json`.
3. Validar `GET /api/health`.
4. Ejecutar una prueba de login, consulta de equipos y métricas.
5. Confirmar que CORS permita únicamente los dominios corporativos del frontend.

### Frontend

1. Configurar `VITE_API_URL` con la URL pública del backend terminada en `/api`.
2. Ejecutar `npm run build`.
3. Publicar `frontend/` con la configuración de Vercel.
4. Probar recarga directa de rutas internas, login y operaciones de ambos roles.

## 10. API disponible

La referencia detallada está en [`backend/docs/API.md`](../backend/docs/API.md). Las familias principales son:

| Familia | Rutas |
|---|---|
| Acceso | `/health`, `/auth/login`, `/auth/me` |
| Usuarios | `/users`, `/users/:id/equipment` |
| Inventario | `/maintenances`, `/sites`, `/inventory-report`, `/inventory-reports` |
| Mantenimiento | `/maintenance-records`, `/maintenances/:id/history`, `/maintenances/:id/records` |
| Periféricos | `/peripheral-stock`, `/assignments`, `/assignment-options` |
| Soporte | `/tickets`, `/tickets/:id/resolve` |
| Indicadores | `/dashboard/systems` |

Las rutas protegidas requieren `Authorization: Bearer <JWT>`. Los errores tienen, como mínimo, el formato `{ "message": "..." }`.

## 11. Seguridad y controles antes de producción

El repositorio contiene controles básicos —hash de contraseñas, JWT, validación de entrada, autorización por rol y separación de la clave privada—, pero se deben cerrar estos puntos antes del uso corporativo:

- Eliminar el valor por defecto de `JWT_SECRET` y hacer que el arranque falle si falta en producción.
- Obligar el cambio de contraseña temporal en el primer inicio de sesión.
- Definir política de contraseña, recuperación y bloqueo por intentos fallidos.
- Evaluar SSO corporativo y MFA.
- Restringir CORS a dominios productivos conocidos; retirar orígenes de desarrollo de producción.
- Configurar HTTPS, dominios corporativos, backups y retención de logs.
- Incorporar auditoría de altas, ediciones, asignaciones, devoluciones, resoluciones y cambios de estado.
- Revisar permisos de Supabase y confirmar que la clave `service_role` no aparezca en logs ni en el frontend.
- Definir responsables para la validación de reportes de inventario pendientes.
- Añadir límites de frecuencia y protección contra abuso en login y endpoints públicos.

## 12. Plan de implementación empresarial

### Fase 0 — Gobierno y preparación

- Nombrar dueño del producto, administrador funcional y responsables de datos.
- Acordar catálogo oficial de empresas, sedes, áreas, tipos de equipo y periféricos.
- Definir la política de codificación de activos.
- Aprobar la matriz de roles, soporte y tiempos de atención.

### Fase 1 — Datos y ambiente controlado

- Crear Supabase/PostgreSQL de pruebas.
- Ejecutar la migración definitiva.
- Importar empleados y equipos con simulación previa.
- Validar duplicados, responsables, sedes y áreas.
- Ejecutar pruebas con un grupo piloto de Sistemas.

### Fase 2 — Piloto con usuarios

- Seleccionar una sede o área piloto.
- Capacitar a Sistemas y empleados participantes.
- Ejecutar levantamiento físico y comparar contra la fuente anterior.
- Registrar incidencias y ajustar catálogos, permisos y formularios.

### Fase 3 — Salida productiva

- Congelar la fuente anterior durante la migración final.
- Respaldar la base destino.
- Importar datos aprobados y validar conteos.
- Habilitar primero a Sistemas y luego a los empleados por grupos.
- Monitorear login, tickets, asignaciones y errores durante los primeros días.

### Fase 4 — Mejora continua

- Medir cumplimiento de mantenimiento y tiempos de resolución.
- Incorporar auditoría, SLA, notificaciones corporativas y SSO según prioridad.
- Revisar mensualmente datos huérfanos, stock negativo lógico, reportes pendientes y usuarios inactivos.

## 13. Criterios de aceptación del piloto

- Un usuario de cada rol puede iniciar sesión y solo ve las funciones autorizadas.
- El área de Sistemas puede registrar, editar y consultar un equipo.
- Un mantenimiento nuevo calcula correctamente su próxima fecha.
- Un kit se asigna solo con stock disponible y se refleja en el equipo y empleado.
- Una devolución registra una condición por periférico y actualiza el stock.
- Un empleado crea un ticket y Sistemas lo resuelve con notas.
- Un empleado envía un reporte de inventario y Sistemas lo puede consultar.
- Los datos migrados coinciden con los conteos aprobados.
- `npm test` y `npm run build` terminan correctamente.
- No se encuentran secretos en el repositorio, frontend compilado ni logs.

## 14. Riesgos y decisiones pendientes

| Riesgo o decisión | Impacto | Recomendación |
|---|---|---|
| Contraseña temporal compartida | Alto | Forzar cambio en primer acceso y usar entrega segura |
| Sin SSO/MFA | Alto | Priorizar integración con identidad corporativa |
| Validación de reportes manual | Medio | Definir bandeja, responsable y estados de validación |
| Código `EF` con 3/4 dígitos según flujo | Medio | Adoptar una única regla antes de la migración final |
| Notificaciones por polling | Medio | Integrar correo/Teams o eventos cuando el volumen lo requiera |
| Pruebas concentradas en backend | Medio | Añadir pruebas de frontend y pruebas end-to-end |
| Sin auditoría de cambios | Alto | Crear bitácora antes de usarlo como sistema oficial de control |

## 15. Documentación técnica relacionada

- [`README.md`](../README.md): instalación y despliegue resumidos.
- [`backend/docs/API.md`](../backend/docs/API.md): endpoints, roles y validaciones.
- [`backend/docs/DATABASE.md`](../backend/docs/DATABASE.md): modelo y migraciones.
- [`backend/docs/OPERATIONS.md`](../backend/docs/OPERATIONS.md): operación y diagnóstico.
- [`frontend/docs/USER_GUIDE.md`](../frontend/docs/USER_GUIDE.md): guía funcional de usuario.
- [`frontend/docs/ARCHITECTURE.md`](../frontend/docs/ARCHITECTURE.md): arquitectura de la interfaz.

## 16. Nota de mantenimiento del documento

Actualizar esta guía cuando cambien roles, flujos, migraciones, variables de entorno, endpoints o criterios de seguridad. La fuente de verdad técnica sigue siendo el código y las migraciones ejecutadas; esta guía debe reflejar cualquier diferencia aprobada antes de una nueva salida a producción.
