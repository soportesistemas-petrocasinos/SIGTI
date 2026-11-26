import HomePage from './pages/HomePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import ChangePasswordPage from './pages/ChangePasswordPage.jsx';
import { useSession } from './hooks/useSession.js';

export default function App() {
  const { status, user, error, signIn, signOut, updateUser } = useSession();

  let page;
  if (status === 'loading') {
    page = <p className="status status--loading">Cargando…</p>;
  } else if (!user) {
    page = (
      <>
        {error && <p className="status status--error">{error}</p>}
        <LoginPage onLogin={signIn} />
      </>
    );
  } else if (user.mustChangePassword) {
    page = <ChangePasswordPage user={user} onChanged={updateUser} />;
  } else {
    page = <HomePage />;
  }

  return (
    <div className="layout">
      <header className="header">
        <h1>SIGTI</h1>
        <span>Sistema de Gestión TI</span>
        {user && (
          <div className="header__user">
            <span>{user.fullName}</span>
            <button type="button" className="button button--ghost" onClick={signOut}>
              Cerrar sesión
            </button>
          </div>
        )}
      </header>
      <main className="content">{page}</main>
    </div>
  );
}
