import { Router } from 'express';
import { healthRouter } from './health.js';
import { createAuthRouter } from './auth.js';

export function createRouter({ authService }) {
  const router = Router();

  router.use('/health', healthRouter);
  router.use('/auth', createAuthRouter(authService));

  return router;
}
