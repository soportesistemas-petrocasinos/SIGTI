import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middlewares/validate.js';
import { createAuthController } from '../controllers/authController.js';
import { AUTH_MESSAGES } from '../services/authService.js';

export const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

export function createAuthRouter(authService) {
  const router = Router();
  const controller = createAuthController(authService);

  router.post(
    '/login',
    validate(
      { body: loginSchema },
      { code: 'MISSING_CREDENTIALS', message: AUTH_MESSAGES.missingCredentials },
    ),
    controller.login,
  );

  return router;
}
