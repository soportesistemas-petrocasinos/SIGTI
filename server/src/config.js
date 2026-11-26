import { fileURLToPath } from 'node:url';

export const config = {
  // API_PORT (y no PORT) para no heredar por accidente el puerto de otra herramienta.
  port: Number(process.env.API_PORT ?? 3000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  // Carpeta con los informes de empleados (.xlsx) usados para crear los usuarios.
  employeesExcelDir:
    process.env.EMPLOYEES_EXCEL_DIR ?? fileURLToPath(new URL('../../seeds/', import.meta.url)),
  // Contraseña inicial que se asigna a los usuarios nuevos al correr el seed.
  authInitialPassword: process.env.AUTH_INITIAL_PASSWORD,
};
