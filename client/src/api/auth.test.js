import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from './client.js';
import { login, MISSING_CREDENTIALS_MESSAGE } from './auth.js';

function mockFetch(status, body) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('login', () => {
  it('envía usuario y contraseña y devuelve el usuario', async () => {
    const user = { id: 1, username: 'olga.hernandez' };
    mockFetch(200, { user });
    await expect(login('  olga.hernandez ', 'clave')).resolves.toEqual(user);
    expect(fetch).toHaveBeenCalledWith('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"username":"olga.hernandez","password":"clave"}',
    });
  });

  it.each([
    ['', 'clave'],
    ['olga.hernandez', ''],
    ['   ', ''],
  ])('si falta un dato (%j, %j) muestra el mensaje genérico sin llamar a la API', async (u, p) => {
    vi.stubGlobal('fetch', vi.fn());
    const error = await login(u, p).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.message).toBe(MISSING_CREDENTIALS_MESSAGE);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('propaga el mensaje del servidor cuando el usuario no es correcto', async () => {
    mockFetch(401, { error: { code: 'USER_NOT_FOUND', message: 'El nombre de usuario no es correcto.' } });
    await expect(login('x', 'y')).rejects.toMatchObject({
      code: 'USER_NOT_FOUND',
      message: 'El nombre de usuario no es correcto.',
    });
  });
});
