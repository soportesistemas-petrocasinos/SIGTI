import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiRequest } from './client.js';

function mockFetch(status, body) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: () => (body === undefined ? Promise.reject(new Error('sin cuerpo')) : Promise.resolve(body)),
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('apiRequest', () => {
  it('devuelve los datos cuando la respuesta es correcta', async () => {
    mockFetch(200, { status: 'ok' });
    await expect(apiRequest('/health')).resolves.toEqual({ status: 'ok' });
    expect(fetch).toHaveBeenCalledWith('/api/health', expect.objectContaining({ method: 'GET' }));
  });

  it('envía el cuerpo como JSON', async () => {
    mockFetch(201, { id: 1 });
    await apiRequest('/requests', { method: 'POST', body: { title: 'Sin internet' } });
    expect(fetch).toHaveBeenCalledWith('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"title":"Sin internet"}',
    });
  });

  it('convierte el error de la API en ApiError', async () => {
    mockFetch(404, { error: { code: 'REQUEST_NOT_FOUND', message: 'La solicitud no existe.' } });
    const error = await apiRequest('/requests/99').catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 404, code: 'REQUEST_NOT_FOUND', message: 'La solicitud no existe.' });
  });

  it('usa un mensaje genérico si la respuesta de error no trae cuerpo', async () => {
    mockFetch(502, undefined);
    const error = await apiRequest('/health').catch((e) => e);
    expect(error).toMatchObject({ status: 502, code: 'UNKNOWN_ERROR' });
  });

  it('informa cuando no hay conexión con el servidor', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const error = await apiRequest('/health').catch((e) => e);
    expect(error).toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
  });
});
