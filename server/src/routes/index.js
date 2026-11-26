import { Router } from 'express';
import { healthRouter } from './health.js';
import { createAuthRouter } from './auth.js';

export function createRouter({ authService, secureCookie }) {
  const router = Router();

  router.use('/health', healthRouter);
  router.use('/auth', createAuthRouter(authService, { secureCookie }));

  return router;
}
