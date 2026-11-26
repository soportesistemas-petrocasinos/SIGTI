import HomePage from './pages/HomePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import { useSession } from './hooks/useSession.js';

export default function App() {
  const { user, signIn, signOut } = useSession();

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
      <main className="content">{user ? <HomePage /> : <LoginPage onLogin={signIn} />}</main>
    </div>
  );
}
