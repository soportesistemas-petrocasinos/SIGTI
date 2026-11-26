import { Router } from 'express';

// GET /api/health        → el proceso responde (lo usa el HEALTHCHECK de Docker).
// GET /api/health/ready  → además la base de datos responde (verificación tras desplegar).
export function createHealthRouter({ checkDatabase, version }) {
  const router = Router();

  router.get('/', (_req, res) => {
    res.json({ status: 'ok', version });
  });

  router.get('/ready', async (_req, res) => {
    try {
      await checkDatabase();
      res.json({ status: 'ok', version, database: 'ok' });
    } catch (error) {
      // El detalle va al log; al cliente solo se le dice que la BD no está disponible.
      console.error('Health check de la base de datos falló:', error.message);
      res.status(503).json({ status: 'error', version, database: 'unavailable' });
    }
  });

  return router;
}
