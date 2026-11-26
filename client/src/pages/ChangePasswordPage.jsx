import { useState } from 'react';
import { changePassword } from '../api/auth.js';

// Se muestra obligatoriamente la primera vez que el usuario entra con la contraseña inicial.
export default function ChangePasswordPage({ user, onChanged }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const updated = await changePassword({ newPassword, confirmPassword });
      onChanged(updated);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <section className="login">
      <form className="login__card" onSubmit={handleSubmit} noValidate>
        <h2>Cambia tu contraseña</h2>
        <p className="login__hint">
          Hola, {user.fullName}. Es tu primer ingreso: por seguridad debes cambiar la contraseña
          inicial antes de continuar.
        </p>

        <label className="field">
          <span>Nueva contraseña</span>
          <input
            type="password"
            name="newPassword"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoFocus
          />
        </label>

        <label className="field">
          <span>Confirmar nueva contraseña</span>
          <input
            type="password"
            name="confirmPassword"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </label>

        <p className="login__hint">Mínimo 8 caracteres, con letras y números.</p>

        {error && (
          <p className="login__error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="button" disabled={submitting}>
          {submitting ? 'Guardando…' : 'Guardar y continuar'}
        </button>
      </form>
    </section>
  );
}
