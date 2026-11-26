import { createApp } from './app.js';
import { config } from './config.js';
import { closeDb } from './db/knex.js';

const app = createApp();

const server = app.listen(config.port, (error) => {
  if (error) {
    throw error;
  }
  console.log(`API de SIGTI ${config.appVersion} escuchando en el puerto ${config.port}`);
});

// Apagado ordenado: Docker envía SIGTERM al detener o reemplazar el contenedor.
let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} recibido: cerrando el servidor...`);

  // Si algo se queda colgado, salir de todos modos antes de que Docker lo mate.
  setTimeout(() => process.exit(1), 10_000).unref();

  server.close(async () => {
    try {
      await closeDb();
    } finally {
      process.exit(0);
    }
  });
  server.closeIdleConnections();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
