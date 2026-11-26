import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middlewares/validate.js';
import { requireSession } from '../middlewares/auth.js';
import { createAuthController } from '../controllers/authController.js';
import { AUTH_MESSAGES } from '../services/authService.js';

const PASSWORD_MAX_LENGTH = 128;

export const loginSchema = z.object({
  username: z.string().trim().min(1).max(100),
  password: z.string().min(1).max(PASSWORD_MAX_LENGTH),
});

// Las reglas de la nueva contraseña (largo, letras y números, etc.) están en authService.
export const changePasswordSchema = z.object({
  currentPassword: z.string().max(PASSWORD_MAX_LENGTH).optional(),
  newPassword: z.string().max(PASSWORD_MAX_LENGTH),
  confirmPassword: z.string().max(PASSWORD_MAX_LENGTH),
});

export function createAuthRouter(authService, { secureCookie }) {
  const router = Router();
  const controller = createAuthController(authService, { secureCookie });
  const session = requireSession(authService);

  router.post(
    '/login',
    validate(
      { body: loginSchema },
      { code: 'MISSING_CREDENTIALS', message: AUTH_MESSAGES.missingCredentials },
    ),
    controller.login,
  );
  router.post('/logout', controller.logout);
  // /me y /change-password no exigen haber cambiado la contraseña: son justo lo
  // que necesita el usuario que entra por primera vez.
  router.get('/me', session, controller.me);
  router.post(
    '/change-password',
    session,
    validate({ body: changePasswordSchema }),
    controller.changePassword,
  );

  return router;
}
