# Plan de proyecto AIDLC — SIGTI Help Desk

*AIDLC-P{{pendiente: número asignado por Sistemas}} · Basado en AIDLC-M01 v0.3 — Flujo Maestro de Desarrollo*

> **Estado: borrador.** Redactado con asistencia de IA (Claude) a partir de las decisiones que el
> equipo confirmó el 2026-11-26 y del diagnóstico del repositorio. Lo marcado `{{pendiente: ...}}`
> no está decidido. Origen de cada parte: **[M]** lo exige el manual, **[P]** decisión del plan,
> **[v0.4]** práctica opcional (solo aplica si la sección 0 la adopta). Si el plan contradice
> al manual, prevalece el manual. Cuando se asigne el número, renombrar el archivo a `AIDLC-Pnn.md`.

---

## 0 Control documental

| Campo | Valor |
| --- | --- |
| Código | AIDLC-P{{pendiente: número}} |
| Proyecto | SIGTI — Sistema de Gestión TI (Help Desk V1) · Repositorio: https://github.com/soportesistemas-petrocasinos/SIGTI |
| Modalidad | Adopción |
| Base metodológica | AIDLC-M01 v0.3 |
| Prácticas v0.4 adoptadas | {{pendiente: Ninguna / C-03 / C-05 / C-06}} |
| Versión y fecha | 0.1 · 2026-11-26 |
| Estado | Borrador |
| Elaboró | Área de Sistemas, con asistencia de IA |
| Revisó | Líder técnico: {{pendiente}} · Representante de negocio: {{pendiente}} |
| Aprobó | Líder de Sistemas: {{pendiente}} · Fecha: {{pendiente}} · Evidencia: {{pendiente}} |

---

## 1 Iniciativa · G0 Idea, G1 Alcance [M]

| Campo | Valor |
| --- | --- |
| Necesidad o problema | Las solicitudes que llegan al Área de Sistemas no tienen un canal único con seguimiento, prioridades ni tiempos de atención medibles. |
| Solicitante | Área de Sistemas |
| Dueño funcional | Coordinador de Sistemas |
| Objetivo | Un Help Desk interno donde cualquier empleado registre solicitudes y Sistemas las atienda con prioridad y SLA. |
| Resultado esperado | Todas las solicitudes a Sistemas quedan registradas, asignadas y con tiempos de respuesta y resolución medibles. |
| Alcance (V1) | Login con usuario y contraseña propios (cuentas por importación masiva y alta manual); roles Solicitante y Sistemas; tickets con sede y área; estados Abierto → Asignado → En progreso ⇄ En espera → Resuelto → Cerrado, con confirmación del solicitante y cierre automático; prioridades con SLA en horario laboral de Sistemas y festivos de Colombia, con pausa en «En espera»; reportes. |
| Exclusiones y límites | Sin notificaciones por correo en V1. Sin integración con directorio corporativo. Sin producción hasta pasar por QA y autorización P. |
| Prioridad | {{pendiente: Alta / Media / Baja · justificación del dueño funcional}} |
| Riesgo inicial | Medio (propuesta, ver sección 3) |
| Criterios de éxito | {{pendiente: p. ej. % de solicitudes registradas en SIGTI, % de cumplimiento de SLA}} |
| Línea base | LBV-SIGTI-001 · Estado: preliminar · Enlace: este documento, sección 1 |

**Aceptación del alcance (cierre de G1):** negocio {{pendiente}} · Sistemas {{pendiente}}.

---

## 2 Estado actual del proyecto [P]

### 2.1 Inventario (al 2026-11-26)

| Elemento | Situación actual | Evidencia |
| --- | --- | --- |
| Repositorio y ramas | GitHub. `develop` (por defecto), `qa`, `production`. `qa` = `production` = estructura inicial. | `git ls-remote`; `CLAUDE.md` § Ramas |
| Stack y dependencias principales | Monorepo npm workspaces: React 19 + Vite 8 (`client/`), Express 5 + Knex + Zod + pg (`server/`), PostgreSQL. | `package.json`, `client/package.json`, `server/package.json` |
| Ambientes | Desarrollo local. QA previsto en VPS Ubuntu + Docker + Nginx compartida (`sigtiqa.portalpetrocasinos.com`). Sin producción. | `REQUISITOS-HELPDESK` (local) |
| Usuarios y datos en producción | No. Hay informes de empleados (nombre y cargo) solo en local, excluidos del repo. | `.gitignore` (`seeds/*.xlsx`) |
| Documentación existente | `CLAUDE.md` con stack, convenciones, login y ramas. | `CLAUDE.md` |
| Pruebas automatizadas existentes | 49 pruebas Vitest/Supertest (unitarias y de API con repositorios en memoria). | `npm test` |
| Integración continua (CI) | No existía. M0 agrega GitHub Actions. | `.github/workflows/ci.yml` (M0) |
| Proceso de despliegue y recuperación | No existía. M0 agrega Docker, compose de QA, script con respaldo previo y runbook de reversión. | `Dockerfile`, `deploy/qa/` (M0) |
| Deuda técnica y riesgos conocidos | Login revela si el usuario existe (`USER_NOT_FOUND`/`INVALID_PASSWORD`); contraseña inicial común; identidad basada solo en el nombre; `users` sin rol ni sede. | `CLAUDE.md` § Login; `server/migrations/` |

### 2.2 Brecha frente al mínimo común

| Control del manual | Estado actual | Brecha | Acción | Responsable | Fecha |
| --- | --- | --- | --- | --- | --- |
| Revisión por otro profesional antes de integrar | PR #1 existe; sin regla que la exija | Sin protección de rama | PR por módulo aprobado en GitHub por alguien distinto del autor; proponer protección de `develop` y `qa` | {{pendiente}} | {{pendiente}} |
| Compilación y pruebas automáticas en cada cambio (CI) | No había | Total | `ci.yml` (M0): lint, pruebas, build, auditoría, migraciones, imagen Docker | Autor de M0 | M0 |
| Criterios de aceptación por historia | No hay tarjetas | Total | Plantilla de tarjeta en `.github/ISSUE_TEMPLATE/` (M0); tarjetas por módulo | {{pendiente}} | {{pendiente}} |
| Clasificación de riesgo por tarjeta | No hay | Total | Campo de riesgo en la plantilla de tarjeta | Líder técnico | {{pendiente}} |
| Trazabilidad necesidad → despliegue | Parcial (commits descriptivos) | Sin enlace tarjeta ↔ PR ↔ versión | PR enlaza tarjeta; `/api/health` informa el commit desplegado (M0) | {{pendiente}} | {{pendiente}} |
| Recuperación prevista antes de liberar | No había | Total | Respaldo `pg_dump` en cada despliegue y reversión documentada (M0) | Responsable de despliegue | M0 |
| Observabilidad y soporte preparados | Solo `GET /api/health` | Sin verificación de BD ni logs gestionados | `/api/health/ready`, healthcheck Docker, rotación de logs (M0) | Autor de M0 | M0 |
| Uso de IA conforme al gobierno de IA | Se usa Claude en desarrollo | Sin registro de revisiones IA | Sección 8 de este plan y bloque IA en la plantilla de PR | Líder de Sistemas | {{pendiente}} |

### 2.3 Regla de transición [P]

Propuesta (la decide el equipo, el manual no regula la adopción):

- Fecha de adopción: {{pendiente: propuesta 2026-11-26}}
- Punto de entrada en G0–G8: G0–G1, para aprobar la línea base LBV-SIGTI-001.
- Regla: los cambios nuevos cumplen el mínimo común desde la fecha de adopción. El login ya integrado en `develop` no se recertifica de forma retroactiva; sus riesgos conocidos (2.1) entran al backlog como módulo M2.

---

## 3 Clasificación de riesgo [M]

| Factor | Descripción en este proyecto | Nivel |
| --- | --- | --- |
| Datos (personales, sensibles, biometría) | Nombres, cargos, áreas y sedes de empleados; texto libre y adjuntos de tickets que pueden traer datos personales. Sin datos sensibles ni biometría previstos. | Medio |
| Dinero | No maneja valores económicos. | Bajo |
| Permisos y autorizaciones | Dos roles; un solicitante no debe ver tickets ajenos ni notas internas. | Medio (Alto para el módulo de acceso) |
| Continuidad del servicio | Herramienta interna; existe alternativa manual si falla. | Bajo |
| Integraciones | Ninguna en V1. | Bajo |
| Dificultad de recuperación | BD propia con respaldo antes de cada despliegue. | Bajo |
| **Nivel del proyecto** | Se toma el mayor de los factores. | **Medio (propuesta)** |

Propuso: {{pendiente: líder técnico, fecha}} · Confirmó: {{pendiente: dueño funcional, fecha}} · Seguridad: no obligatoria en Medio; sí en la tarjeta de acceso si se clasifica Alto.

Controles adicionales según el manual (§4): en Medio, diseño de impacto, pruebas de integración y regresión del flujo afectado. Propuesta [P]: el módulo de acceso y usuarios (M2) se clasifica **Alto** y lleva pruebas negativas de permisos y validación independiente.

---

## 4 Roles y responsables [M]

Propuesta habitual del Área, pendiente de confirmación:

| Rol | Titular | Suplente | Restricción |
| --- | --- | --- | --- |
| Dueño funcional | Coordinador de Sistemas | {{pendiente}} | Su aceptación funcional no sustituye la revisión técnica. |
| Líder de Sistemas | Coordinador de Sistemas | {{pendiente}} | Aprueba iniciativas y liberaciones. |
| Líder técnico | {{pendiente: Auxiliar de Sistemas}} | {{pendiente}} | Si escribe código, lo revisa otra persona. |
| Equipo de desarrollo | Auxiliar de Sistemas, con asistencia de IA | — | Un revisor distinto del autor valida cada cambio. |
| Revisor de código | {{pendiente: el otro Auxiliar o el Coordinador}} | {{pendiente}} | Nunca el autor del cambio. La IA no aprueba. |
| Responsable de pruebas | {{pendiente}} | {{pendiente}} | En Alto, distinto del autor. |
| Operación y soporte | {{pendiente}} | {{pendiente}} | Ejecuta los despliegues en la VPS. |
| Seguridad | Área de Sistemas | — | Obligatoria en tarjetas Alto o Crítico. |
| Privacidad y Jurídica | Área jurídica de Petrocasinos | — | Ver sección 9. |
| Finanzas | No aplica: el sistema no tiene impacto económico. | — | — |

**Combinaciones no permitidas:** autor y revisor de un mismo cambio; autor y validador en tarjetas Alto.

**Delegaciones escritas del líder de Sistemas:** {{pendiente}}

---

## 5 Forma de trabajo [M] [P]

| Aspecto | Definición del proyecto |
| --- | --- |
| Herramienta de tablero | {{pendiente: GitHub Projects / Issues propuesto}} |
| Estados (manual) | Pendiente → Listo → En curso → En validación → Terminado |
| Marca Bloqueado | Con causa, dueño y próxima acción. Un bloqueo alto o crítico se escala el mismo día. |
| Límite de trabajo activo | {{pendiente: propuesta 1 módulo a la vez}} |
| Duración del objetivo | {{pendiente: 2 semanas, valor de partida del manual}} |
| Coordinación diaria | {{pendiente}} |
| Revisión del tablero e indicadores | Semanal · {{pendiente: día}} |
| Demostración y retrospectiva | Al cierre de cada módulo · una mejora con responsable |
| Repositorio y estrategia de ramas | Rama temporal por módulo desde `develop` → PR aprobado en GitHub → `develop` → (aprobación separada) `qa` → `production` solo con autorización P. Sin force push. |
| Integración continua | GitHub Actions (`.github/workflows/ci.yml`): lint, pruebas, build, `npm audit`, migraciones contra PostgreSQL e imagen Docker con el compose de QA. |
| Ambientes | Desarrollo local · QA en VPS (`sigtiqa.portalpetrocasinos.com`, Docker aislado, ver `deploy/qa/README.md`) · Producción {{pendiente}} |
| Seguimiento de liberaciones | Preparada → Autorizada → Desplegada → Estable |

**Módulos planeados (backlog inicial):**

| # | Módulo | Riesgo propuesto |
| --- | --- | --- |
| M0 | Base de despliegue: Docker, compose de QA, CI, `trust proxy`, health checks, este plan | Medio |
| M1 | Interfaz base: Bootstrap, router, layout, login y cambio de contraseña | Bajo |
| M2 | Acceso y usuarios: riesgos del login, roles, sedes y áreas, administración e importación | Alto |
| M3 | Catálogos: categorías, prioridades con SLA, horario y festivos | Medio |
| M4 | Tickets núcleo: crear, mis tickets, bandeja, asignar, estados, comentarios, historial | Medio |
| M5 | Adjuntos con permisos | Medio |
| M6 | SLA: vencimientos en horario laboral, pausas, indicadores, cierre automático | Medio |
| M7 | Reportes | Bajo |

---

## 6 Ready y Done del proyecto [M]

### 6.1 Ready: listo para construir (control R)

- [ ] Necesidad y origen identificados; dueño, prioridad y alcance del incremento claros.
- [ ] Criterios de aceptación observables, con reglas y escenarios relevantes de error acordados.
- [ ] Riesgo e impacto en datos, permisos, seguridad y operación evaluados.
- [ ] Dependencias y decisiones que condicionan la solución resueltas; la investigación pendiente delimitada como tarea de exploración.
- [ ] Diseño suficiente, enfoque de pruebas y datos de prueba previstos; estrategia de migración y recuperación si aplica.
- [ ] Tamaño compatible con un incremento corto y capacidad del equipo confirmada.

Ajustes del proyecto [P]: todo cambio de esquema de BD se consulta antes de implementarlo (`CLAUDE.md` § Reglas). Las pruebas usan solo datos sintéticos.

### 6.2 Done: terminado (control Q)

- [ ] Código integrado con revisión de otro profesional, sin autoaprobación; compilación y pruebas automatizadas aprobadas sobre la versión resultante.
- [ ] Criterios de aceptación comprobados con resultados enlazados; integración y regresión del flujo afectado según el riesgo.
- [ ] Análisis de seguridad pertinentes ejecutados; hallazgos resueltos o con aceptación válida de riesgo; sin bloqueos obligatorios.
- [ ] Documentación, configuración, auditoría y observabilidad actualizadas; migraciones verificadas cuando existan.
- [ ] Criterios funcionales validados con el mecanismo acordado con negocio; evidencias, revisiones IA aplicables y trazabilidad completas.

**Mecanismo de aceptación funcional acordado:** {{pendiente: propuesta, demostración en QA al dueño funcional}}

---

## 7 Liberación y operación · G7, G8 [M]

| Parámetro | Valor en este proyecto |
| --- | --- |
| Ventana de observación tras liberar | {{pendiente: referencia v0.4 para Medio, 3 días hábiles}} |
| Recuperación antes de liberar | Respaldo `pg_dump` automático en cada despliegue; reversión documentada en `deploy/qa/README.md`. {{pendiente: ensayarla en QA antes de la primera liberación a producción}} |
| Aviso a usuarios afectados | {{pendiente}} |
| Ventana de atribución (Fallos de cambio) | Igual a la ventana de observación |

- **Responsable de despliegue:** {{pendiente: persona con acceso a la VPS}}
- **Verificaciones de salud:** `GET /api/health/ready` (BD y versión), estado `healthy` del contenedor, login en el navegador.
- **Umbrales para detener o revertir:** `/api/health/ready` distinto de 200 tras el despliegue; login caído; {{pendiente: otros}}.
- **Respaldo previo:** `pg_dump -Fc` en `/opt/sigti-qa/backups/` antes de migrar; el script verifica que no quede vacío.
- **Canal de comunicación a usuarios:** {{pendiente}}
- **Cierre de G8:** lo cierra Operación con conformidad funcional; los pendientes pasan al backlog con dueño.

**Cambios urgentes:** se vinculan al incidente y llevan revisión independiente, prueba focalizada, autorización y recuperación antes de desplegar (§5). La documentación se completa en {{pendiente: 2 días hábiles}}.

---

## 8 Uso de IA [M]

| Aspecto | Definición del proyecto |
| --- | --- |
| Herramientas autorizadas por Sistemas | Claude (Claude Code) · {{pendiente: plan o licencia}} |
| Finalidad autorizada | Análisis, generación de código, pruebas, revisión y documentación |
| Datos permitidos | Código, configuración sin secretos y datos sintéticos |
| Datos prohibidos (manual) | Secretos, credenciales, documentos de identidad, imágenes y plantillas biométricas. En este proyecto, además, los informes de empleados (`seeds/*.xlsx`) y el `.env` de QA. |
| Acceso, retención y condiciones del proveedor verificadas | {{pendiente}} |
| Privilegio de los asistentes | No tienen acceso a la VPS ni a producción. Preparan cambios y comandos; una persona los ejecuta. No aprueban PR. |
| Revisión IA en R, Q y P | En una ejecución separada de la generación; la disposición la decide un revisor humano (bloque en la plantilla de PR). |

---

## 9 Datos y cumplimiento [M]

| Pregunta | Respuesta |
| --- | --- |
| ¿Trata datos personales? | Sí: nombre, cargo, área y sede de empleados; contenido de tickets y adjuntos. |
| ¿Trata datos sensibles o biométricos? | No previstos. Los adjuntos podrían contenerlos por error: {{pendiente: política de uso}} |
| ¿Requiere concepto de Jurídica? | {{pendiente: decisión del líder de Sistemas}} |
| Autorización de titulares y finalidad | {{pendiente}} |
| Decisiones jurídicas pendientes | Carga de empleados reales en QA (ver `deploy/qa/README.md` § 5) |
| Retención y acceso a datos del sistema | {{pendiente}} |

---

## 10 Trazabilidad y registros [M]

| Registro | Dónde vive | Plantilla |
| --- | --- | --- |
| 1 Iniciativa | Este plan, sección 1 | — |
| 2 Tarjeta de cambio | GitHub Issues | `.github/ISSUE_TEMPLATE/tarjeta-cambio.md` |
| 3 Liberación | GitHub Issues | `.github/ISSUE_TEMPLATE/liberacion.md` |

- **Cadena mínima:** sección de alcance → tarjeta (issue) → PR (`Closes #n`) → ejecución de CI → commit desplegado (visible en `/api/health`) → issue de liberación.
- **Retención y acceso al historial:** {{pendiente}}
- **Excepciones y riesgos aceptados:** en la tarjeta, con motivo, mitigación, aprobador y vencimiento.

---

## 11 Seguimiento [M]

**Vista consolidada:** {{pendiente: tablero}}

| Indicador | Fuente | Responsable | Frecuencia |
| --- | --- | --- | --- |
| Tiempo de ciclo | Tablero | {{pendiente}} | Semanal |
| Entrega aceptada | Tablero + sección 1 | {{pendiente}} | Semanal |
| Fallos de cambio | Issues de liberación | {{pendiente}} | Por periodo |
| Restauración del servicio | Incidentes | {{pendiente}} | Por incidente |
| Control y trazabilidad | Tarjetas terminadas | {{pendiente}} | Semanal |

---

## 12 Riesgos, dependencias y decisiones abiertas [P]

| ID | Tipo | Descripción | Impacto | Responsable | Fecha límite | Estado |
| --- | --- | --- | --- | --- | --- | --- |
| R-01 | Riesgo | El login revela si un usuario existe. | Medio | {{pendiente}} | M2 | Abierto |
| R-02 | Riesgo | Contraseña inicial común para todos los usuarios nuevos. | Medio | {{pendiente}} | M2 | Abierto |
| R-03 | Riesgo | Identidad basada solo en el nombre (homónimos, retiros). | Medio | {{pendiente}} | M2 | Abierto |
| R-04 | Riesgo | VPS compartida con otros sistemas. | Medio | Operación | M0 | Mitigado por diseño (`deploy/qa/README.md`); pendiente verificar en la VPS |
| D-01 | Dependencia | Inspección de la VPS (puerto libre, Nginx en host, certificado). | Bloquea el primer despliegue | Operación | M0 | Abierto |
| D-02 | Decisión | Concepto de Jurídica sobre datos de empleados. | Bloquea la carga de usuarios reales | Líder de Sistemas | {{pendiente}} | Abierto |
| D-03 | Decisión | Categorías, tiempos de SLA, horario, días de cierre automático, sedes y áreas. | Ready de M3–M6 | Dueño funcional | {{pendiente}} | Abierto |

---

## 13 Primer incremento [P]

- **Objetivo:** M0, la aplicación actual (login) desplegada en QA de forma aislada, con CI y recuperación documentada.
- **Historias candidatas:** M0 y M1 (ver sección 5).
- **Fecha objetivo:** {{pendiente}}
- **Criterio de éxito:** `https://sigtiqa.portalpetrocasinos.com/api/health/ready` responde con la versión desplegada y un usuario de prueba inicia sesión y cambia su contraseña.

---

## 14 Aprobación del plan [M]

| Rol | Nombre | Decisión | Fecha | Evidencia |
| --- | --- | --- | --- | --- |
| Líder técnico (revisión) | | | | |
| Representante de negocio (revisión) | | | | |
| Líder de Sistemas (aprobación) | | | | |
