import express from 'express';
import cookieParser from 'cookie-parser';
import { createRouter } from './routes/index.js';
import { notFound, errorHandler } from './middlewares/errorHandler.js';
import { createUserRepository } from './db/userRepository.js';
import { createSessionRepository } from './db/sessionRepository.js';
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
} = {}) {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  app.use('/api', createRouter({ authService, secureCookie }));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
