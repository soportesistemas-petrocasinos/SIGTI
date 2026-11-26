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

    async findById(id) {
      const row = await db()('users').where({ id }).first();
      return row ? toUser(row) : null;
    },

    async updatePassword(id, passwordHash) {
      await db()('users').where({ id }).update({
        password_hash: passwordHash,
        must_change_password: false,
        updated_at: db().fn.now(),
      });
    },
  };
}

export function toUser(row) {
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
