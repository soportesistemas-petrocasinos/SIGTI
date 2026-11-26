import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { createApp } from '../src/app.js';
import { errorHandler } from '../src/middlewares/errorHandler.js';
import { createAuthService } from '../src/services/authService.js';
import { hashPassword, verifyPassword } from '../src/services/passwords.js';
import { requireSession, requirePasswordChanged } from '../src/middlewares/auth.js';

const INITIAL_PASSWORD = 'Clave-inicial-1';

// Repositorios en memoria: las pruebas no necesitan PostgreSQL.
function createFakeStore() {
  const users = [];
  const sessions = [];
  let nextSessionId = 1;

  const userRepository = {
    async findActiveByUsername(username) {
      return users.find((u) => u.username === username.toLowerCase()) ?? null;
    },
    async findById(id) {
      return users.find((u) => u.id === id) ?? null;
    },
    async updatePassword(id, passwordHash) {
      Object.assign(users.find((u) => u.id === id), { passwordHash, mustChangePassword: false });
    },
  };

  const sessionRepository = {
    async create({ userId, tokenHash, expiresAt }) {
      const id = nextSessionId++;
      sessions.push({ id, userId, tokenHash, expiresAt });
      return id;
    },
    async findActiveByTokenHash(tokenHash) {
      const s = sessions.find((x) => x.tokenHash === tokenHash && x.expiresAt > new Date());
      if (!s) return null;
      return { sessionId: s.id, user: { ...users.find((u) => u.id === s.userId) } };
    },
    async deleteByTokenHash(tokenHash) {
      sessions.splice(0, sessions.length, ...sessions.filter((s) => s.tokenHash !== tokenHash));
    },
    async deleteOtherSessions(userId, keepId) {
      sessions.splice(0, sessions.length, ...sessions.filter((s) => s.userId !== userId || s.id === keepId));
    },
    async deleteExpired() {
      sessions.splice(0, sessions.length, ...sessions.filter((s) => s.expiresAt > new Date()));
    },
  };

  return { users, sessions, userRepository, sessionRepository };
}

async function buildApp({ sessionTtlHours = 8 } = {}) {
  const store = createFakeStore();
  store.users.push({
    id: 1,
    username: 'olga.hernandez',
    fullName: 'Olga Lucia Hernandez Rueda',
    position: 'Auxiliar De Cocina',
    area: 'Compras',
    passwordHash: await hashPassword(INITIAL_PASSWORD),
    mustChangePassword: true,
  });
  const authService = createAuthService({
    userRepository: store.userRepository,
    sessionRepository: store.sessionRepository,
    sessionTtlHours,
    initialPassword: INITIAL_PASSWORD,
  });
  const app = createApp({ authService, secureCookie: false });
  return { app, store, authService };
}

// App aparte con una ruta protegida de ejemplo (como lo serán las de solicitudes),
// que usa la misma sesión que la app principal.
async function buildProtectedApp() {
  const ctx = await buildApp();
  const protectedApp = express();
  protectedApp.use(cookieParser());
  protectedApp.get('/privado', requireSession(ctx.authService), requirePasswordChanged, (_req, res) =>
    res.json({ ok: true }),
  );
  protectedApp.use(errorHandler);
  return { ...ctx, protectedApp };
}

function sessionCookie(res) {
  return res.headers['set-cookie']?.find((c) => c.startsWith('sigti_session='));
}

describe('POST /api/auth/login', () => {
  let app;
  beforeEach(async () => {
    ({ app } = await buildApp());
  });
  const login = (body) => request(app).post('/api/auth/login').send(body);

  it('con usuario y contraseña correctos abre la sesión en una cookie httpOnly', async () => {
    const res = await login({ username: 'olga.hernandez', password: INITIAL_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ username: 'olga.hernandez', mustChangePassword: true });
    expect(res.body.user).not.toHaveProperty('passwordHash');
    const cookie = sessionCookie(res);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/);
    expect(cookie).toMatch(/Path=\/api/);
  });

  it('si el usuario no existe avisa que el nombre de usuario no es correcto', async () => {
    const res = await login({ username: 'no.existe', password: INITIAL_PASSWORD });
    expect(res.status).toBe(401);
    expect(res.body.error).toEqual({ code: 'USER_NOT_FOUND', message: 'El nombre de usuario no es correcto.' });
    expect(sessionCookie(res)).toBeUndefined();
  });

  it('si la contraseña no coincide avisa que la contraseña no es correcta', async () => {
    const res = await login({ username: 'olga.hernandez', password: 'otra' });
    expect(res.status).toBe(401);
    expect(res.body.error).toEqual({ code: 'INVALID_PASSWORD', message: 'La contraseña no es correcta.' });
  });

  it.each([
    ['falta el usuario', { password: INITIAL_PASSWORD }],
    ['falta la contraseña', { username: 'olga.hernandez' }],
    ['faltan ambos', {}],
    ['vienen vacíos', { username: '   ', password: '' }],
  ])('si %s responde "Ingresa con tu usuario y contraseña"', async (_caso, body) => {
    const res = await login(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toEqual({
      code: 'MISSING_CREDENTIALS',
      message: 'Ingresa con tu usuario y contraseña',
    });
  });
});

describe('sesión', () => {
  it('GET /api/auth/me devuelve el usuario con la cookie y 401 sin ella', async () => {
    const { app } = await buildApp();
    const agent = request.agent(app);
    expect((await agent.get('/api/auth/me')).status).toBe(401);

    await agent.post('/api/auth/login').send({ username: 'olga.hernandez', password: INITIAL_PASSWORD });
    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.user.username).toBe('olga.hernandez');
  });

  it('una cookie inventada no abre sesión', async () => {
    const { app } = await buildApp();
    const res = await request(app).get('/api/auth/me').set('Cookie', 'sigti_session=inventado');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('una sesión vencida no sirve', async () => {
    const { app } = await buildApp({ sessionTtlHours: -1 });
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ username: 'olga.hernandez', password: INITIAL_PASSWORD });
    expect((await agent.get('/api/auth/me')).status).toBe(401);
  });

  it('logout borra la sesión del servidor', async () => {
    const { app, store } = await buildApp();
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ username: 'olga.hernandez', password: INITIAL_PASSWORD });
    expect(store.sessions).toHaveLength(1);
    expect((await agent.post('/api/auth/logout')).status).toBe(204);
    expect(store.sessions).toHaveLength(0);
    expect((await agent.get('/api/auth/me')).status).toBe(401);
  });

  it('la base solo guarda el hash del token, no el token', async () => {
    const { app, store } = await buildApp();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'olga.hernandez', password: INITIAL_PASSWORD });
    const token = sessionCookie(res).split(';')[0].split('=')[1];
    expect(store.sessions[0].tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(store.sessions[0].tokenHash).not.toBe(token);
  });
});

describe('cambio obligatorio de contraseña', () => {
  let ctx;
  let agent;
  beforeEach(async () => {
    ctx = await buildProtectedApp();
    agent = request.agent(ctx.app);
    await agent.post('/api/auth/login').send({ username: 'olga.hernandez', password: INITIAL_PASSWORD });
  });
  const change = (body) => agent.post('/api/auth/change-password').send(body);

  it('con la contraseña inicial las rutas protegidas responden 403 PASSWORD_CHANGE_REQUIRED', async () => {
    const cookie = (await request(ctx.app)
      .post('/api/auth/login')
      .send({ username: 'olga.hernandez', password: INITIAL_PASSWORD })).headers['set-cookie'];
    const res = await request(ctx.protectedApp).get('/privado').set('Cookie', cookie);
    expect(res.status).toBe(403);
    expect(res.body.error).toEqual({
      code: 'PASSWORD_CHANGE_REQUIRED',
      message: 'Debes cambiar tu contraseña antes de continuar.',
    });
  });

  it('sin sesión no se puede cambiar la contraseña', async () => {
    const res = await request(ctx.app)
      .post('/api/auth/change-password')
      .send({ newPassword: 'Nueva2026x', confirmPassword: 'Nueva2026x' });
    expect(res.status).toBe(401);
  });

  it.each([
    ['no coinciden', { newPassword: 'Nueva2026x', confirmPassword: 'Nueva2026y' }, 'PASSWORDS_DO_NOT_MATCH'],
    ['es corta', { newPassword: 'Ab1', confirmPassword: 'Ab1' }, 'WEAK_PASSWORD'],
    ['no tiene números', { newPassword: 'SoloLetras', confirmPassword: 'SoloLetras' }, 'WEAK_PASSWORD'],
    ['no tiene letras', { newPassword: '12345678', confirmPassword: '12345678' }, 'WEAK_PASSWORD'],
    ['es la inicial', { newPassword: INITIAL_PASSWORD, confirmPassword: INITIAL_PASSWORD }, 'INITIAL_PASSWORD_REUSED'],
  ])('rechaza la nueva contraseña si %s', async (_caso, body, code) => {
    const res = await change(body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe(code);
    expect(ctx.store.users[0].mustChangePassword).toBe(true);
  });

  it('al cambiarla queda guardada, se libera el acceso y se cierran las otras sesiones', async () => {
    // Otra persona entró antes con la contraseña inicial.
    const intruder = request.agent(ctx.app);
    await intruder.post('/api/auth/login').send({ username: 'olga.hernandez', password: INITIAL_PASSWORD });
    expect(ctx.store.sessions).toHaveLength(2);

    const res = await change({ newPassword: 'MiClave2026', confirmPassword: 'MiClave2026' });
    expect(res.status).toBe(200);
    expect(res.body.user.mustChangePassword).toBe(false);

    const user = ctx.store.users[0];
    expect(user.mustChangePassword).toBe(false);
    expect(await verifyPassword('MiClave2026', user.passwordHash)).toBe(true);

    expect(ctx.store.sessions).toHaveLength(1);
    expect((await agent.get('/api/auth/me')).body.user.mustChangePassword).toBe(false);
    expect((await intruder.get('/api/auth/me')).status).toBe(401);

    // La contraseña inicial ya no sirve; la nueva sí.
    const old = await request(ctx.app)
      .post('/api/auth/login')
      .send({ username: 'olga.hernandez', password: INITIAL_PASSWORD });
    expect(old.status).toBe(401);
    const fresh = await request(ctx.app)
      .post('/api/auth/login')
      .send({ username: 'olga.hernandez', password: 'MiClave2026' });
    expect(fresh.status).toBe(200);
    expect(fresh.body.user.mustChangePassword).toBe(false);
  });

  it('después del primer cambio, cambiarla otra vez exige la contraseña actual', async () => {
    await change({ newPassword: 'MiClave2026', confirmPassword: 'MiClave2026' });

    const sinActual = await change({ newPassword: 'OtraClave27', confirmPassword: 'OtraClave27' });
    expect(sinActual.body.error.code).toBe('CURRENT_PASSWORD_REQUIRED');

    const actualMala = await change({
      currentPassword: 'equivocada',
      newPassword: 'OtraClave27',
      confirmPassword: 'OtraClave27',
    });
    expect(actualMala.body.error.code).toBe('INVALID_PASSWORD');

    const igual = await change({
      currentPassword: 'MiClave2026',
      newPassword: 'MiClave2026',
      confirmPassword: 'MiClave2026',
    });
    expect(igual.body.error.code).toBe('SAME_PASSWORD');

    const ok = await change({
      currentPassword: 'MiClave2026',
      newPassword: 'OtraClave27',
      confirmPassword: 'OtraClave27',
    });
    expect(ok.status).toBe(200);
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

  it('un hash dañado nunca acepta la contraseña', async () => {
    expect(await verifyPassword('lo-que-sea', 'scrypt$AAAA$=')).toBe(false);
    expect(await verifyPassword('lo-que-sea', 'scrypt$AAAA$AAAA')).toBe(false);
  });
});
