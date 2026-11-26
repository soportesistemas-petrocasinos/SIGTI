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
