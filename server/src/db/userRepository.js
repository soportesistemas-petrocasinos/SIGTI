import { getDb } from './knex.js';

// Acceso a la tabla users. Devuelve objetos en camelCase.
export function createUserRepository(db = getDb) {
  return {
    async findActiveByUsername(username) {
      const row = await db()('users')
        .whereRaw('lower(username) = ?', [username.toLowerCase()])
        .andWhere({ is_active: true })
        .first();
      return row ? toUser(row) : null;
    },
  };
}

function toUser(row) {
  return {
    id: row.id,
    username: row.username,
    fullName: row.full_name,
    position: row.position,
    area: row.area,
    passwordHash: row.password_hash,
    mustChangePassword: row.must_change_password,
  };
}
