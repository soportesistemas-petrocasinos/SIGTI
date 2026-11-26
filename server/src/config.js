import { fileURLToPath } from 'node:url';

const nodeEnv = process.env.NODE_ENV ?? 'development';

// TRUST_PROXY: cuántos proxies hay delante de la app (p. ej. 1 = Nginx).
// Acepta un número, true/false o una lista de IP/subredes separadas por coma.
// Sin definir = false: Express no confía en X-Forwarded-*.
export function parseTrustProxy(value) {
  if (value === undefined || value.trim() === '' || value === 'false') {
    return false;
  }
  if (value === 'true') {
    return true;
  }
  if (/^\d+$/.test(value.trim())) {
    return Number(value.trim());
  }
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

// COOKIE_SECURE=true|false fuerza el valor; si no se define, solo es segura en producción.
export function parseSecureCookie(value, env) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return env === 'production';
}

export const config = {
  // API_PORT (y no PORT) para no heredar por accidente el puerto de otra herramienta.
  port: Number(process.env.API_PORT ?? 3000),
  nodeEnv,
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
  // Carpeta con el frontend compilado (client/dist). Si se define, Express lo sirve
  // junto con la API (así funciona en Docker). En desarrollo lo sirve Vite.
  staticDir: process.env.STATIC_DIR || undefined,
  // Versión desplegada (el commit), para identificarla en /api/health.
  appVersion: process.env.APP_VERSION || 'dev',
  // Carpeta con los informes de empleados (.xlsx) usados para crear los usuarios.
  employeesExcelDir:
    process.env.EMPLOYEES_EXCEL_DIR ?? fileURLToPath(new URL('../../seeds/', import.meta.url)),
  // Contraseña inicial que se asigna a los usuarios nuevos al correr el seed.
  // También se usa para impedir que alguien la vuelva a elegir al cambiarla.
  authInitialPassword: process.env.AUTH_INITIAL_PASSWORD,
  session: {
    ttlHours: Number(process.env.SESSION_TTL_HOURS ?? 8),
    // Por defecto, en producción la cookie solo viaja por HTTPS.
    secureCookie: parseSecureCookie(process.env.COOKIE_SECURE, nodeEnv),
  },
};
