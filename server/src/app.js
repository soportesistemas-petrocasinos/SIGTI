import express from 'express';
import { router } from './routes/index.js';
import { notFound, errorHandler } from './middlewares/errorHandler.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));

  app.use('/api', router);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
