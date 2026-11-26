// Genera los nombres de usuario a partir del nombre completo del empleado.
//
// Regla:
//   - nombre.apellido (primer nombre + primer apellido).
//   - Si dos o más empleados quedan con el mismo usuario, todos ellos pasan a
//     nombre.primerApellido.inicialSegundoApellido.
//   - Si aun así se repite (o no hay segundo apellido), se agrega un número.
//
// Se asume el formato colombiano: las dos últimas palabras son los apellidos y lo
// anterior son los nombres. Con solo dos palabras: nombre + un apellido.

export function normalizeWord(word) {
  return word
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function splitFullName(fullName) {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  if (words.length < 2) {
    return { firstName: words[0] ?? '', firstSurname: '', secondSurname: '' };
  }
  if (words.length === 2) {
    return { firstName: words[0], firstSurname: words[1], secondSurname: '' };
  }
  return {
    firstName: words[0],
    firstSurname: words.at(-2),
    secondSurname: words.at(-1),
  };
}

function baseUsername({ firstName, firstSurname }) {
  return [firstName, firstSurname].map(normalizeWord).filter(Boolean).join('.');
}

function extendedUsername({ firstName, firstSurname, secondSurname }) {
  const initial = normalizeWord(secondSurname).charAt(0);
  return [normalizeWord(firstName), normalizeWord(firstSurname), initial].filter(Boolean).join('.');
}

function groupBy(items, keyFn) {
  const groups = new Map();
  for (const item of items) {
    const key = keyFn(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return groups;
}

/**
 * @param {string[]} fullNames
 * @returns {Map<string, string>} nombre completo -> usuario
 */
export function buildUsernames(fullNames) {
  const people = fullNames.map((fullName) => ({ fullName, parts: splitFullName(fullName) }));

  for (const person of people) {
    person.username = baseUsername(person.parts);
  }
  for (const group of groupBy(people, (p) => p.username).values()) {
    if (group.length > 1) {
      for (const person of group) {
        person.username = extendedUsername(person.parts);
      }
    }
  }
  for (const group of groupBy(people, (p) => p.username).values()) {
    if (group.length > 1) {
      group.forEach((person, index) => {
        if (index > 0) {
          person.username = `${person.username}${index + 1}`;
        }
      });
    }
  }

  return new Map(people.map((p) => [p.fullName, p.username]));
}
