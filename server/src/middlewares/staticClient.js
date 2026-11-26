import path from 'node:path';
import express from 'express';

// Sirve el frontend compilado (client/dist) desde Express, en el mismo origen que la API.
// - /assets/* lleva hash en el nombre: se puede guardar en caché por un año.
// - index.html no se guarda en caché, para que cada despliegue se vea de inmediato.
// - Cualquier GET fuera de /api que pida HTML recibe index.html (rutas de React).
export function serveClient(staticDir) {
  const router = express.Router();
  const indexFile = path.resolve(staticDir, 'index.html');

  router.use(
    express.static(staticDir, {
      index: false,
      setHeaders(res, filePath) {
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else {
          res.setHeader('Cache-Control', 'no-cache');
        }
      },
    }),
  );

  router.use((req, res, next) => {
    const isPageRequest =
      (req.method === 'GET' || req.method === 'HEAD') &&
      req.path !== '/api' &&
      !req.path.startsWith('/api/') &&
      req.accepts('html');
    if (!isPageRequest) {
      return next();
    }
    res.setHeader('Cache-Control', 'no-cache');
    return res.sendFile(indexFile, (error) => {
      if (error) next(error);
    });
  });

  return router;
}
