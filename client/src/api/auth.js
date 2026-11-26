import { ApiError, apiRequest } from './client.js';

export const MISSING_CREDENTIALS_MESSAGE = 'El nombre de usuario o la contraseña no son correctos.';

// Inicia sesión. Si falta el usuario o la contraseña no llama a la API y lanza
// el mismo error que respondería el servidor.
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
