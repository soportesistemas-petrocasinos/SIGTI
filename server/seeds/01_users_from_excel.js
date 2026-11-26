// Crea o actualiza los usuarios a partir de los informes de empleados en Excel.
// Uso: npm run seed -w server
//
// - Los usuarios nuevos reciben la contraseña AUTH_INITIAL_PASSWORD (server/.env)
//   y quedan marcados con must_change_password = true.
// - Los usuarios que ya existen conservan su contraseña; solo se actualizan
//   nombre, cargo y área.
import { config } from '../src/config.js';
import { readEmployeesFromExcel } from '../src/db/employeesExcel.js';
import { buildUsernames } from '../src/services/usernames.js';
import { hashPassword } from '../src/services/passwords.js';

/** @param {import('knex').Knex} knex */
export async function seed(knex) {
  if (!config.authInitialPassword) {
    throw new Error('AUTH_INITIAL_PASSWORD no está definida. Revisa server/.env.');
  }

  const employees = await readEmployeesFromExcel(config.employeesExcelDir);
  const usernames = buildUsernames(employees.map((e) => e.fullName));
  const existing = new Set(await knex('users').pluck('username'));

  let created = 0;
  let updated = 0;
  await knex.transaction(async (trx) => {
    for (const employee of employees) {
      const row = {
        username: usernames.get(employee.fullName),
        full_name: employee.fullName,
        position: employee.position ?? null,
        area: employee.area ?? null,
        updated_at: trx.fn.now(),
      };

      if (existing.has(row.username)) {
        await trx('users').where({ username: row.username }).update(row);
        updated += 1;
      } else {
        await trx('users').insert({
          ...row,
          password_hash: await hashPassword(config.authInitialPassword),
        });
        created += 1;
      }
    }
  });

  console.log(`Usuarios: ${created} creados, ${updated} actualizados.`);
}
