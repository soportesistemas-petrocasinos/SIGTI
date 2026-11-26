import { fileURLToPath } from 'node:url';

const nodeEnv = process.env.NODE_ENV ?? 'development';

export const config = {
  // API_PORT (y no PORT) para no heredar por accidente el puerto de otra herramienta.
  port: Number(process.env.API_PORT ?? 3000),
  nodeEnv,
  // Carpeta con los informes de empleados (.xlsx) usados para crear los usuarios.
  employeesExcelDir:
    process.env.EMPLOYEES_EXCEL_DIR ?? fileURLToPath(new URL('../../seeds/', import.meta.url)),
  // Contraseña inicial que se asigna a los usuarios nuevos al correr el seed.
  // También se usa para impedir que alguien la vuelva a elegir al cambiarla.
  authInitialPassword: process.env.AUTH_INITIAL_PASSWORD,
  session: {
    ttlHours: Number(process.env.SESSION_TTL_HOURS ?? 8),
    // En producción la cookie solo viaja por HTTPS.
    secureCookie: nodeEnv === 'production',
  },
};
