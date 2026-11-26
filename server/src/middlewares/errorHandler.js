import { ZodError } from 'zod';
import { AppError } from '../errors.js';

export function notFound(_req, _res, next) {
  next(new AppError(404, 'NOT_FOUND', 'El recurso solicitado no existe.'));
}

// Express reconoce el middleware de errores por tener 4 parámetros.
export function errorHandler(err, _req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof AppError) {
    return sendError(res, err.status, err.code, err.message, err.details);
  }

  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({
      path: issue.path.map(String).join('.'),
      message: issue.message,
    }));
    return sendError(res, 400, 'VALIDATION_ERROR', 'Los datos enviados no son válidos.', details);
  }

  if (err.type === 'entity.parse.failed') {
    return sendError(res, 400, 'INVALID_JSON', 'El cuerpo de la petición no es un JSON válido.');
  }

  if (err.type === 'entity.too.large') {
    return sendError(res, 413, 'PAYLOAD_TOO_LARGE', 'La petición es demasiado grande.');
  }

  // Error inesperado: detalle completo al log, mensaje genérico al cliente.
  console.error(err);
  return sendError(res, 500, 'INTERNAL_ERROR', 'Ocurrió un error interno. Intenta de nuevo más tarde.');
}

function sendError(res, status, code, message, details) {
  const error = { code, message };
  if (details !== undefined) {
    error.details = details;
  }
  res.status(status).json({ error });
}
