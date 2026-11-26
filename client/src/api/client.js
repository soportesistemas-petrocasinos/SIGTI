// Cliente HTTP único para hablar con la API.
// Convierte las respuestas de error { error: { code, message } } en ApiError
// para que las pantallas solo tengan que mostrar error.message.
export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function apiRequest(path, { method = 'GET', body } = {}) {
  const hasBody = body !== undefined;
  let response;

  try {
    response = await fetch(`/api${path}`, {
      method,
      headers: hasBody ? { 'Content-Type': 'application/json' } : undefined,
      body: hasBody ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'No se pudo conectar con el servidor.');
  }

  const data = response.status === 204 ? null : await response.json().catch(() => null);

  if (!response.ok) {
    const error = data?.error;
    throw new ApiError(
      response.status,
      error?.code ?? 'UNKNOWN_ERROR',
      error?.message ?? 'Ocurrió un error inesperado. Intenta de nuevo.',
      error?.details,
    );
  }

  return data;
}
