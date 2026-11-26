// Regla del proyecto: una vez aplicada, esta migración NO se modifica.
// Los cambios posteriores al esquema van en una migración nueva.

// Sesiones iniciadas en el servidor. El navegador guarda el token en una cookie
// httpOnly; aquí solo se guarda su hash SHA-256 (64 caracteres hex), nunca el token.

/** @param {import('knex').Knex} knex */
export async function up(knex) {
  await knex.schema.createTable('sessions', (table) => {
    table.increments('id').primary();
    table
      .integer('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table.string('token_hash', 64).notNullable().unique();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('expires_at', { useTz: true }).notNullable();

    // Para cerrar todas las sesiones de un usuario y para limpiar las vencidas.
    table.index('user_id');
    table.index('expires_at');
  });
}

/** @param {import('knex').Knex} knex */
export async function down(knex) {
  await knex.schema.dropTable('sessions');
}
