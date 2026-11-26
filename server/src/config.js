export const config = {
  // API_PORT (y no PORT) para no heredar por accidente el puerto de otra herramienta.
  port: Number(process.env.API_PORT ?? 3000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
};
