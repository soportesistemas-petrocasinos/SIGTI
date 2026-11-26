import knex from 'knex';
import knexConfig from '../../knexfile.js';

let instance;

// Conexión perezosa: la API puede arrancar (p. ej. /api/health) sin base de datos.
export function getDb() {
  if (!instance) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL no está definida. Revisa server/.env.');
    }
    instance = knex(knexConfig);
  }
  return instance;
}

// Consulta mínima para saber si la base de datos responde (lo usa /api/health/ready).
export async function checkDatabase() {
  await getDb().raw('select 1');
}

// Cierra el pool de conexiones (al apagar el proceso).
export async function closeDb() {
  if (instance) {
    const current = instance;
    instance = undefined;
    await current.destroy();
  }
}
