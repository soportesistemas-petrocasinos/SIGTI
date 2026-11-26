import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../src/app.js';
import { parseTrustProxy, parseSecureCookie } from '../src/config.js';

// Servicio de auth falso: estas pruebas no tocan la BD.
const authService = { getSession: async () => null };

describe('health checks', () => {
  it('GET /api/health informa la versión desplegada', async () => {
    const app = createApp({ authService, version: 'abc1234' });
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', version: 'abc1234' });
  });

  it('GET /api/health/ready responde ok si la BD responde', async () => {
    const checkDatabase = vi.fn().mockResolvedValue();
    const app = createApp({ authService, checkDatabase, version: 'v1' });
    const res = await request(app).get('/api/health/ready');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', version: 'v1', database: 'ok' });
    expect(checkDatabase).toHaveBeenCalledOnce();
  });

  it('GET /api/health/ready responde 503 sin exponer el error si la BD falla', async () => {
    const checkDatabase = vi
      .fn()
      .mockRejectedValue(new Error('password authentication failed for user "secreto"'));
    const app = createApp({ authService, checkDatabase, version: 'v1' });
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const res = await request(app).get('/api/health/ready');
      expect(res.status).toBe(503);
      expect(res.body).toEqual({ status: 'error', version: 'v1', database: 'unavailable' });
      expect(JSON.stringify(res.body)).not.toContain('secreto');
    } finally {
      spy.mockRestore();
    }
  });
});

describe('trust proxy', () => {
  it('parseTrustProxy interpreta número, booleano y lista', () => {
    expect(parseTrustProxy(undefined)).toBe(false);
    expect(parseTrustProxy('')).toBe(false);
    expect(parseTrustProxy('false')).toBe(false);
    expect(parseTrustProxy('true')).toBe(true);
    expect(parseTrustProxy('1')).toBe(1);
    expect(parseTrustProxy('loopback, 172.16.0.0/12')).toEqual(['loopback', '172.16.0.0/12']);
  });

  it('por defecto no confía en X-Forwarded-*', () => {
    const app = createApp({ authService });
    expect(app.get('trust proxy')).toBe(false);
  });

  it('con TRUST_PROXY=1 confía solo en el proxy inmediato (Nginx)', () => {
    const app = createApp({ authService, trustProxy: 1 });
    const trustFn = app.get('trust proxy fn');
    // Salto 0 = quien se conecta directamente (Nginx): se confía.
    expect(trustFn('172.18.0.1', 0)).toBe(true);
    // Salto 1 = lo que diga X-Forwarded-For más atrás: no se confía.
    expect(trustFn('10.1.2.3', 1)).toBe(false);
  });

  it('parseSecureCookie: COOKIE_SECURE manda; si no, depende de NODE_ENV', () => {
    expect(parseSecureCookie('true', 'development')).toBe(true);
    expect(parseSecureCookie('false', 'production')).toBe(false);
    expect(parseSecureCookie(undefined, 'production')).toBe(true);
    expect(parseSecureCookie(undefined, 'development')).toBe(false);
  });
});

describe('frontend compilado servido por Express', () => {
  let staticDir;
  let app;

  beforeAll(() => {
    staticDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sigti-dist-'));
    fs.mkdirSync(path.join(staticDir, 'assets'));
    fs.writeFileSync(path.join(staticDir, 'index.html'), '<!doctype html><title>SIGTI</title>');
    fs.writeFileSync(path.join(staticDir, 'assets', 'index-abc123.js'), 'console.log(1);');
    fs.writeFileSync(path.join(staticDir, 'favicon.svg'), '<svg></svg>');
    app = createApp({ authService, staticDir });
  });

  afterAll(() => {
    fs.rmSync(staticDir, { recursive: true, force: true });
  });

  it('GET / devuelve index.html sin caché', async () => {
    const res = await request(app).get('/').set('Accept', 'text/html');
    expect(res.status).toBe(200);
    expect(res.text).toContain('<title>SIGTI</title>');
    expect(res.headers['cache-control']).toBe('no-cache');
  });

  it('una ruta de React (p. ej. /tickets/5) también devuelve index.html', async () => {
    const res = await request(app).get('/tickets/5').set('Accept', 'text/html');
    expect(res.status).toBe(200);
    expect(res.text).toContain('<title>SIGTI</title>');
  });

  it('los assets con hash se guardan en caché por un año', async () => {
    const res = await request(app).get('/assets/index-abc123.js');
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toContain('immutable');
  });

  it('los archivos de la raíz se sirven sin caché larga', async () => {
    const res = await request(app).get('/favicon.svg');
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-cache');
  });

  it('las rutas de /api siguen respondiendo JSON y 404 en JSON', async () => {
    const health = await request(app).get('/api/health');
    expect(health.body.status).toBe('ok');

    const missing = await request(app).get('/api/no-existe').set('Accept', 'text/html');
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('NOT_FOUND');
  });

  it('un archivo inexistente que no es una página responde 404', async () => {
    const res = await request(app).get('/assets/no-existe.js').set('Accept', 'application/javascript');
    expect(res.status).toBe(404);
  });

  it('un POST fuera de /api no devuelve index.html', async () => {
    const res = await request(app).post('/tickets').set('Accept', 'text/html');
    expect(res.status).toBe(404);
  });
});
