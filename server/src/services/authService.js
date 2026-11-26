import { AppError } from '../errors.js';
import { verifyPassword } from './passwords.js';

export const AUTH_MESSAGES = {
  missingCredentials: 'El nombre de usuario o la contraseña no son correctos.',
  userNotFound: 'El nombre de usuario no es correcto.',
  invalidPassword: 'La contraseña no es correcta.',
};

export function createAuthService({ userRepository }) {
  return {
    async login({ username, password }) {
      const user = await userRepository.findActiveByUsername(username);
      if (!user) {
        throw new AppError(401, 'USER_NOT_FOUND', AUTH_MESSAGES.userNotFound);
      }

      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) {
        throw new AppError(401, 'INVALID_PASSWORD', AUTH_MESSAGES.invalidPassword);
      }

      return {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        position: user.position,
        area: user.area,
        mustChangePassword: user.mustChangePassword,
      };
    },
  };
}
