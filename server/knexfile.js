// Configuración de Knex para la app y para el CLI (npm run migrate).
// El CLI no recibe --env-file, así que cargamos server/.env aquí si existe.
try {
  process.loadEnvFile(new URL('./.env', import.meta.url));
} catch {
  // Sin .env: se usan las variables de entorno del sistema.
}

export default {
  client: 'pg',
  connection: process.env.DATABASE_URL,
  pool: { min: 0, max: 10 },
  migrations: {
    directory: './migrations',
    tableName: 'knex_migrations',
    stub: './src/db/migration.stub',
  },
  seeds: {
    directory: './seeds',
  },
};
