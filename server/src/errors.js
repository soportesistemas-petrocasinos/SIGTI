// Error esperado de la aplicación. El middleware de errores lo convierte en
// { "error": { "code", "message", "details"? } } con el status indicado.
export class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
