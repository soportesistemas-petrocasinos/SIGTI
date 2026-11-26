import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { z } from 'zod';
import { createApp } from '../src/app.js';
import { validate } from '../src/middlewares/validate.js';
import { errorHandler } from '../src/middlewares/errorHandler.js';
import { AppError } from '../src/errors.js';

describe('API base', () => {
  const app = createApp();

  it('GET /api/health responde ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('una ruta inexistente responde 404 con el formato de error', async () => {
    const res = await request(app).get('/api/no-existe');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: { code: 'NOT_FOUND', message: 'El recurso solicitado no existe.' },
    });
  });

  it('un JSON mal formado responde 400 INVALID_JSON', async () => {
    const res = await request(app)
      .post('/api/health')
      .set('Content-Type', 'application/json')
      .send('{ no es json');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
  });
});

describe('manejo de errores', () => {
  function buildApp(register) {
    const app = express();
    app.use(express.json());
    register(app);
    app.use(errorHandler);
    return app;
  }

  it('AppError usa su status, código y mensaje', async () => {
    const app = buildApp((a) =>
      a.get('/x', () => {
        throw new AppError(404, 'REQUEST_NOT_FOUND', 'La solicitud no existe.');
      }),
    );
    const res = await request(app).get('/x');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: { code: 'REQUEST_NOT_FOUND', message: 'La solicitud no existe.' },
    });
  });

  it('validate() responde 400 VALIDATION_ERROR con detalles', async () => {
    const schema = z.object({ title: z.string().min(1) });
    const app = buildApp((a) =>
      a.post('/x', validate({ body: schema }), (req, res) => res.json(req.validated.body)),
    );

    const bad = await request(app).post('/x').send({ title: '' });
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe('VALIDATION_ERROR');
    expect(bad.body.error.details[0].path).toBe('title');

    const ok = await request(app).post('/x').send({ title: 'Impresora sin tóner' });
    expect(ok.status).toBe(200);
    expect(ok.body).toEqual({ title: 'Impresora sin tóner' });
  });

  it('un error inesperado responde 500 sin exponer detalles', async () => {
    const app = buildApp((a) =>
      a.get('/x', async () => {
        throw new Error('detalle interno secreto');
      }),
    );
    const originalError = console.error;
    console.error = () => {};
    try {
      const res = await request(app).get('/x');
      expect(res.status).toBe(500);
      expect(res.body.error.code).toBe('INTERNAL_ERROR');
      expect(JSON.stringify(res.body)).not.toContain('secreto');
    } finally {
      console.error = originalError;
    }
  });
});
