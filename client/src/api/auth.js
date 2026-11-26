import { ApiError, apiRequest } from './client.js';

export const MISSING_CREDENTIALS_MESSAGE = 'Ingresa con tu usuario y contraseña';
export const PASSWORDS_DO_NOT_MATCH_MESSAGE = 'Las contraseñas nuevas no coinciden.';

// Inicia sesión. El servidor guarda la sesión en una cookie httpOnly.
// Si falta el usuario o la contraseña no llama a la API y lanza el mismo error
// que respondería el servidor.
export async function login(username, password) {
  const cleanUsername = username.trim();
  if (!cleanUsername || !password) {
    throw new ApiError(400, 'MISSING_CREDENTIALS', MISSING_CREDENTIALS_MESSAGE);
  }
  const data = await apiRequest('/auth/login', {
    method: 'POST',
    body: { username: cleanUsername, password },
  });
  return data.user;
}

export async function logout() {
  await apiRequest('/auth/logout', { method: 'POST' });
}

// Usuario de la sesión actual, o null si no hay sesión.
export async function getCurrentUser() {
  try {
    const data = await apiRequest('/auth/me');
    return data.user;
  } catch (error) {
    if (error.status === 401) return null;
    throw error;
  }
}

export async function changePassword({ currentPassword, newPassword, confirmPassword }) {
  if (newPassword !== confirmPassword) {
    throw new ApiError(400, 'PASSWORDS_DO_NOT_MATCH', PASSWORDS_DO_NOT_MATCH_MESSAGE);
  }
  const body = { newPassword, confirmPassword };
  if (currentPassword) body.currentPassword = currentPassword;
  const data = await apiRequest('/auth/change-password', { method: 'POST', body });
  return data.user;
}
