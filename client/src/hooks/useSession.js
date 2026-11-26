import { useCallback, useState } from 'react';

const STORAGE_KEY = 'sigti.user';

function readStoredUser() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Guarda el usuario que inició sesión mientras la pestaña esté abierta.
export function useSession() {
  const [user, setUser] = useState(readStoredUser);

  const signIn = useCallback((newUser) => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
    } catch {
      // Sin almacenamiento: la sesión dura hasta recargar la página.
    }
    setUser(newUser);
  }, []);

  const signOut = useCallback(() => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nada que limpiar.
    }
    setUser(null);
  }, []);

  return { user, signIn, signOut };
}
