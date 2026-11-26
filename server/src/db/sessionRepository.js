import { getDb } from './knex.js';
import { toUser } from './userRepository.js';

// Acceso a la tabla sessions. Solo maneja hashes de token, nunca el token.
export function createSessionRepository(db = getDb) {
  return {
    async create({ userId, tokenHash, expiresAt }) {
      const [row] = await db()('sessions')
        .insert({ user_id: userId, token_hash: tokenHash, expires_at: expiresAt })
        .returning('id');
      return row.id;
    },

    // Devuelve la sesión vigente y su usuario (activo), o null.
    async findActiveByTokenHash(tokenHash) {
      const row = await db()('sessions as s')
        .join('users as u', 'u.id', 's.user_id')
        .where('s.token_hash', tokenHash)
        .andWhere('s.expires_at', '>', db().fn.now())
        .andWhere('u.is_active', true)
        .first('s.id as session_id', 'u.*');
      return row ? { sessionId: row.session_id, user: toUser(row) } : null;
    },

    async deleteByTokenHash(tokenHash) {
      await db()('sessions').where({ token_hash: tokenHash }).del();
    },

    async deleteOtherSessions(userId, keepSessionId) {
      await db()('sessions').where({ user_id: userId }).whereNot({ id: keepSessionId }).del();
    },

    async deleteExpired() {
      await db()('sessions').where('expires_at', '<=', db().fn.now()).del();
    },
  };
}
