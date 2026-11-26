import { useEffect, useState } from 'react';
import { apiRequest } from '../api/client.js';

export default function HomePage() {
  const [apiStatus, setApiStatus] = useState({ state: 'loading' });

  useEffect(() => {
    let active = true;
    apiRequest('/health')
      .then(() => active && setApiStatus({ state: 'ok' }))
      .catch((error) => active && setApiStatus({ state: 'error', message: error.message }));
    return () => {
      active = false;
    };
  }, []);

  return (
    <section>
      <h2>Solicitudes</h2>
      <p>Aquí se gestionarán las solicitudes que llegan al área de TI.</p>
      <p className={`status status--${apiStatus.state}`}>
        {apiStatus.state === 'loading' && 'Conectando con el servidor…'}
        {apiStatus.state === 'ok' && 'Servidor conectado.'}
        {apiStatus.state === 'error' && apiStatus.message}
      </p>
    </section>
  );
}
