import { createHash, randomBytes } from 'node:crypto';
import { AppError } from '../errors.js';
import { hashPassword, verifyPassword } from './passwords.js';

export const AUTH_MESSAGES = {
  missingCredentials: 'Ingresa con tu usuario y contraseña',
  userNotFound: 'El nombre de usuario no es correcto.',
  invalidPassword: 'La contraseña no es correcta.',
  unauthenticated: 'Tu sesión no es válida o expiró. Ingresa de nuevo.',
  passwordChangeRequired: 'Debes cambiar tu contraseña antes de continuar.',
  passwordsDoNotMatch: 'Las contraseñas nuevas no coinciden.',
  weakPassword: 'La nueva contraseña debe tener al menos 8 caracteres, con letras y números.',
  initialPasswordReused: 'La nueva contraseña no puede ser la contraseña inicial.',
  samePassword: 'La nueva contraseña debe ser distinta de la actual.',
  currentPasswordRequired: 'Ingresa tu contraseña actual.',
};

export const PASSWORD_MIN_LENGTH = 8;

export function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

// Datos del usuario que se pueden enviar al cliente (sin el hash).
export function toPublicUser(user) {
  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    position: user.position,
    area: user.area,
    mustChangePassword: user.mustChangePassword,
  };
}

/**
 * @param {object} deps
 * @param {object} deps.userRepository
 * @param {object} deps.sessionRepository
 * @param {number} deps.sessionTtlHours
 * @param {string} [deps.initialPassword] contraseña inicial común (no se puede volver a elegir)
 */
export function createAuthService({
  userRepository,
  sessionRepository,
  sessionTtlHours,
  initialPassword,
  now = () => new Date(),
}) {
  async function openSession(userId) {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(now().getTime() + sessionTtlHours * 60 * 60 * 1000);
    await sessionRepository.create({ userId, tokenHash: hashToken(token), expiresAt });
    return { token, expiresAt };
  }

  return {
    async login({ username, password }) {
      const user = await userRepository.findActiveByUsername(username);
      if (!user) {
        throw new AppError(401, 'USER_NOT_FOUND', AUTH_MESSAGES.userNotFound);
      }
      if (!(await verifyPassword(password, user.passwordHash))) {
        throw new AppError(401, 'INVALID_PASSWORD', AUTH_MESSAGES.invalidPassword);
      }

      await sessionRepository.deleteExpired();
      const session = await openSession(user.id);
      return { user: toPublicUser(user), ...session };
    },

    // Devuelve { sessionId, user } si el token es de una sesión vigente, o null.
    async getSession(token) {
      if (!token) return null;
      return sessionRepository.findActiveByTokenHash(hashToken(token));
    },

    async logout(token) {
      if (token) {
        await sessionRepository.deleteByTokenHash(hashToken(token));
      }
    },

    // La primera vez (mustChangePassword) basta la sesión recién abierta con la
    // contraseña inicial; después se exige también la contraseña actual.
    async changePassword({ user, sessionId }, { currentPassword, newPassword, confirmPassword }) {
      const stored = await userRepository.findById(user.id);
      if (!stored) {
        throw new AppError(401, 'UNAUTHENTICATED', AUTH_MESSAGES.unauthenticated);
      }

      if (!stored.mustChangePassword) {
        if (!currentPassword) {
          throw new AppError(400, 'CURRENT_PASSWORD_REQUIRED', AUTH_MESSAGES.currentPasswordRequired);
        }
        if (!(await verifyPassword(currentPassword, stored.passwordHash))) {
          throw new AppError(400, 'INVALID_PASSWORD', AUTH_MESSAGES.invalidPassword);
        }
      }

      if (newPassword !== confirmPassword) {
        throw new AppError(400, 'PASSWORDS_DO_NOT_MATCH', AUTH_MESSAGES.passwordsDoNotMatch);
      }
      if (
        newPassword.length < PASSWORD_MIN_LENGTH ||
        !/[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(newPassword) ||
        !/\d/.test(newPassword)
      ) {
        throw new AppError(400, 'WEAK_PASSWORD', AUTH_MESSAGES.weakPassword);
      }
      if (initialPassword && newPassword === initialPassword) {
        throw new AppError(400, 'INITIAL_PASSWORD_REUSED', AUTH_MESSAGES.initialPasswordReused);
      }
      if (await verifyPassword(newPassword, stored.passwordHash)) {
        throw new AppError(400, 'SAME_PASSWORD', AUTH_MESSAGES.samePassword);
      }

      await userRepository.updatePassword(stored.id, await hashPassword(newPassword));
      // Cierra las demás sesiones del usuario (p. ej. alguien que entró con la clave inicial).
      await sessionRepository.deleteOtherSessions(stored.id, sessionId);

      return toPublicUser({ ...stored, mustChangePassword: false });
    },
  };
}
