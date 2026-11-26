// Regla del proyecto: una vez aplicada, esta migración NO se modifica.
// Los cambios posteriores al esquema van en una migración nueva.

/** @param {import('knex').Knex} knex */
export async function up(knex) {
  await knex.schema.createTable('users', (table) => {
    table.increments('id').primary();
    table.string('username', 100).notNullable().unique();
    table.string('full_name', 200).notNullable();
    table.string('position', 150);
    table.string('area', 100);
    table.string('password_hash', 255).notNullable();
    table.boolean('must_change_password').notNullable().defaultTo(true);
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamps(true, true);
  });
}

/** @param {import('knex').Knex} knex */
export async function down(knex) {
  await knex.schema.dropTable('users');
}
