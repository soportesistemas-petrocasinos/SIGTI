import { Router } from 'express';
import { createHealthRouter } from './health.js';
import { createAuthRouter } from './auth.js';

export function createRouter({ authService, secureCookie, checkDatabase, version }) {
  const router = Router();

  router.use('/health', createHealthRouter({ checkDatabase, version }));
  router.use('/auth', createAuthRouter(authService, { secureCookie }));

  return router;
}
