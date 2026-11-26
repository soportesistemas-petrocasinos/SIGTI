import { useCallback, useEffect, useState } from 'react';
import { getCurrentUser, logout } from '../api/auth.js';

// La sesión vive en el servidor (cookie httpOnly). Al cargar la app se le pregunta
// al servidor quién está conectado; el navegador no guarda el usuario por su cuenta.
export function useSession() {
  const [state, setState] = useState({ status: 'loading', user: null, error: '' });

  useEffect(() => {
    let active = true;
    getCurrentUser()
      .then((user) => active && setState({ status: 'ready', user, error: '' }))
      .catch((error) => active && setState({ status: 'ready', user: null, error: error.message }));
    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback((user) => {
    setState({ status: 'ready', user, error: '' });
  }, []);

  const signOut = useCallback(async () => {
    try {
      await logout();
    } finally {
      setState({ status: 'ready', user: null, error: '' });
    }
  }, []);

  return { ...state, signIn, signOut, updateUser: signIn };
}
