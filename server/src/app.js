import express from 'express';
import cookieParser from 'cookie-parser';
import { createRouter } from './routes/index.js';
import { notFound, errorHandler } from './middlewares/errorHandler.js';
import { serveClient } from './middlewares/staticClient.js';
import { createUserRepository } from './db/userRepository.js';
import { createSessionRepository } from './db/sessionRepository.js';
import { checkDatabase as checkDefaultDatabase } from './db/knex.js';
import { createAuthService } from './services/authService.js';
import { config } from './config.js';

function createDefaultAuthService() {
  return createAuthService({
    userRepository: createUserRepository(),
    sessionRepository: createSessionRepository(),
    sessionTtlHours: config.session.ttlHours,
    initialPassword: config.authInitialPassword,
  });
}

// Las dependencias se pueden inyectar (p. ej. en las pruebas, para no usar la BD).
export function createApp({
  authService = createDefaultAuthService(),
  secureCookie = config.session.secureCookie,
  trustProxy = config.trustProxy,
  staticDir = config.staticDir,
  checkDatabase = checkDefaultDatabase,
  version = config.appVersion,
} = {}) {
  const app = express();

  app.disable('x-powered-by');
  // Detrás de Nginx: toma la IP y el protocolo reales de X-Forwarded-For/-Proto.
  app.set('trust proxy', trustProxy);
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  app.use('/api', createRouter({ authService, secureCookie, checkDatabase, version }));

  if (staticDir) {
    app.use(serveClient(staticDir));
  }

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
