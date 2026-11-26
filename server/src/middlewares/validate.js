// Valida partes de la petición con esquemas Zod y deja el resultado en req.validated.
// Uso: router.post('/', validate({ body: createRequestSchema }), controller.create)
// Si falla, Zod lanza ZodError y el middleware de errores responde 400 VALIDATION_ERROR.
export function validate(schemas) {
  return (req, _res, next) => {
    req.validated = {};
    for (const [part, schema] of Object.entries(schemas)) {
      req.validated[part] = schema.parse(req[part]);
    }
    next();
  };
}
