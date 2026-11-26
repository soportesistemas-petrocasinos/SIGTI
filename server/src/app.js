import express from 'express';
import { createRouter } from './routes/index.js';
import { notFound, errorHandler } from './middlewares/errorHandler.js';
import { createUserRepository } from './db/userRepository.js';
import { createAuthService } from './services/authService.js';

// Las dependencias se pueden inyectar (p. ej. en las pruebas, para no usar la BD).
export function createApp({
  authService = createAuthService({ userRepository: createUserRepository() }),
} = {}) {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));

  app.use('/api', createRouter({ authService }));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
