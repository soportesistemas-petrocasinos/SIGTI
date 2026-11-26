import { AppError } from '../errors.js';
import { AUTH_MESSAGES } from '../services/authService.js';

export const SESSION_COOKIE = 'sigti_session';

// Exige una sesión vigente. Deja el usuario en req.user y el id de sesión en req.sessionId.
// Uso: router.get('/', requireSession(authService), requirePasswordChanged, controller.list)
export function requireSession(authService) {
  return async (req, _res, next) => {
    const session = await authService.getSession(req.cookies?.[SESSION_COOKIE]);
    if (!session) {
      throw new AppError(401, 'UNAUTHENTICATED', AUTH_MESSAGES.unauthenticated);
    }
    req.user = session.user;
    req.sessionId = session.sessionId;
    next();
  };
}

// Bloquea todo (salvo lo que no lo use) mientras el usuario tenga la contraseña inicial.
export function requirePasswordChanged(req, _res, next) {
  if (req.user?.mustChangePassword) {
    throw new AppError(403, 'PASSWORD_CHANGE_REQUIRED', AUTH_MESSAGES.passwordChangeRequired);
  }
  next();
}
