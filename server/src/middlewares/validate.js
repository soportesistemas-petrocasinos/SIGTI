import { ZodError } from 'zod';
import { AppError } from '../errors.js';

// Valida partes de la petición con esquemas Zod y deja el resultado en req.validated.
// Uso: router.post('/', validate({ body: createRequestSchema }), controller.create)
// Si falla, Zod lanza ZodError y el middleware de errores responde 400 VALIDATION_ERROR.
//
// Opcional: validate(schemas, { code, message }) responde 400 con ese código y mensaje
// en lugar del genérico (p. ej. el login, que debe mostrar un mensaje concreto).
export function validate(schemas, customError) {
  return (req, _res, next) => {
    req.validated = {};
    try {
      for (const [part, schema] of Object.entries(schemas)) {
        req.validated[part] = schema.parse(req[part]);
      }
    } catch (error) {
      if (customError && error instanceof ZodError) {
        throw new AppError(400, customError.code, customError.message);
      }
      throw error;
    }
    next();
  };
}
