import { createApp } from './app.js';
import { config } from './config.js';

const app = createApp();

app.listen(config.port, (error) => {
  if (error) {
    throw error;
  }
  console.log(`API de SIGTI escuchando en http://localhost:${config.port}`);
});
