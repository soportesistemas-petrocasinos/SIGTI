import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from './client.js';
import {
  changePassword,
  getCurrentUser,
  login,
  logout,
  MISSING_CREDENTIALS_MESSAGE,
} from './auth.js';

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
    const user = { id: 1, username: 'olga.hernandez', mustChangePassword: true };
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
  ])('si falta un dato (%j, %j) muestra "Ingresa con tu usuario y contraseña" sin llamar a la API', async (u, p) => {
    vi.stubGlobal('fetch', vi.fn());
    const error = await login(u, p).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.message).toBe('Ingresa con tu usuario y contraseña');
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

describe('getCurrentUser', () => {
  it('devuelve el usuario de la sesión', async () => {
    mockFetch(200, { user: { id: 1 } });
    await expect(getCurrentUser()).resolves.toEqual({ id: 1 });
    expect(fetch).toHaveBeenCalledWith('/api/auth/me', expect.objectContaining({ method: 'GET' }));
  });

  it('devuelve null si no hay sesión', async () => {
    mockFetch(401, { error: { code: 'UNAUTHENTICATED', message: '...' } });
    await expect(getCurrentUser()).resolves.toBeNull();
  });
});

describe('logout', () => {
  it('llama a POST /api/auth/logout', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 204 }));
    await logout();
    expect(fetch).toHaveBeenCalledWith('/api/auth/logout', expect.objectContaining({ method: 'POST' }));
  });
});

describe('changePassword', () => {
  it('si las contraseñas no coinciden avisa sin llamar a la API', async () => {
    vi.stubGlobal('fetch', vi.fn());
    const error = await changePassword({ newPassword: 'a1b2c3d4', confirmPassword: 'otra' }).catch((e) => e);
    expect(error.code).toBe('PASSWORDS_DO_NOT_MATCH');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('envía la nueva contraseña y devuelve el usuario actualizado', async () => {
    mockFetch(200, { user: { id: 1, mustChangePassword: false } });
    const user = await changePassword({ newPassword: 'MiClave2026', confirmPassword: 'MiClave2026' });
    expect(user.mustChangePassword).toBe(false);
    expect(fetch).toHaveBeenCalledWith('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"newPassword":"MiClave2026","confirmPassword":"MiClave2026"}',
    });
  });
});
