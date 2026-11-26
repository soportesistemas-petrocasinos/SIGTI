import HomePage from './pages/HomePage.jsx';

export default function App() {
  return (
    <div className="layout">
      <header className="header">
        <h1>SIGTI</h1>
        <span>Sistema de Gestión TI</span>
      </header>
      <main className="content">
        <HomePage />
      </main>
    </div>
  );
}
