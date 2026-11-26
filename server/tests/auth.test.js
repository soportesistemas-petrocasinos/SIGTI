import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createAuthService } from '../src/services/authService.js';
import { hashPassword, verifyPassword } from '../src/services/passwords.js';

// Repositorio en memoria: las pruebas no necesitan PostgreSQL.
function createFakeUserRepository(users) {
  return {
    async findActiveByUsername(username) {
      return users.find((u) => u.username === username.toLowerCase()) ?? null;
    },
  };
}

describe('POST /api/auth/login', () => {
  let app;

  beforeAll(async () => {
    const userRepository = createFakeUserRepository([
      {
        id: 1,
        username: 'olga.hernandez',
        fullName: 'Olga Lucia Hernandez Rueda',
        position: 'Auxiliar De Cocina',
        area: 'Compras',
        passwordHash: await hashPassword('Clave-de-prueba-1'),
        mustChangePassword: true,
      },
    ]);
    app = createApp({ authService: createAuthService({ userRepository }) });
  });

  const login = (body) => request(app).post('/api/auth/login').send(body);

  it('con usuario y contraseña correctos devuelve el usuario sin el hash', async () => {
    const res = await login({ username: 'olga.hernandez', password: 'Clave-de-prueba-1' });
    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({
      id: 1,
      username: 'olga.hernandez',
      fullName: 'Olga Lucia Hernandez Rueda',
      position: 'Auxiliar De Cocina',
      area: 'Compras',
      mustChangePassword: true,
    });
  });

  it('no distingue mayúsculas ni espacios alrededor del usuario', async () => {
    const res = await login({ username: '  Olga.Hernandez ', password: 'Clave-de-prueba-1' });
    expect(res.status).toBe(200);
  });

  it('si el usuario no existe avisa que el nombre de usuario no es correcto', async () => {
    const res = await login({ username: 'no.existe', password: 'Clave-de-prueba-1' });
    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      error: { code: 'USER_NOT_FOUND', message: 'El nombre de usuario no es correcto.' },
    });
  });

  it('si la contraseña no coincide avisa que la contraseña no es correcta', async () => {
    const res = await login({ username: 'olga.hernandez', password: 'otra' });
    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      error: { code: 'INVALID_PASSWORD', message: 'La contraseña no es correcta.' },
    });
  });

  it.each([
    ['falta el usuario', { password: 'Clave-de-prueba-1' }],
    ['falta la contraseña', { username: 'olga.hernandez' }],
    ['faltan ambos', {}],
    ['vienen vacíos', { username: '   ', password: '' }],
  ])('si %s responde el mensaje genérico', async (_caso, body) => {
    const res = await login(body);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: {
        code: 'MISSING_CREDENTIALS',
        message: 'El nombre de usuario o la contraseña no son correctos.',
      },
    });
  });
});

describe('passwords', () => {
  it('verifica la contraseña correcta y rechaza las demás', async () => {
    const hash = await hashPassword('secreta');
    expect(hash).not.toContain('secreta');
    expect(await verifyPassword('secreta', hash)).toBe(true);
    expect(await verifyPassword('Secreta', hash)).toBe(false);
    expect(await verifyPassword('secreta', 'hash-invalido')).toBe(false);
  });
});
