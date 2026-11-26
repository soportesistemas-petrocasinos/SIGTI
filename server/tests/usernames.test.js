import { describe, expect, it } from 'vitest';
import { buildUsernames, splitFullName } from '../src/services/usernames.js';

describe('splitFullName', () => {
  it('toma el primer nombre y los dos últimos como apellidos', () => {
    expect(splitFullName('Olga Lucia Hernandez Rueda')).toEqual({
      firstName: 'Olga',
      firstSurname: 'Hernandez',
      secondSurname: 'Rueda',
    });
    expect(splitFullName('Rogerd De Jesus Fontalvo Cardenás')).toMatchObject({
      firstName: 'Rogerd',
      firstSurname: 'Fontalvo',
    });
  });

  it('con dos palabras toma nombre y un apellido', () => {
    expect(splitFullName('Juber Gomez')).toEqual({
      firstName: 'Juber',
      firstSurname: 'Gomez',
      secondSurname: '',
    });
  });
});

describe('buildUsernames', () => {
  it('usa nombre.apellido en minúscula y sin tildes ni ñ', () => {
    const result = buildUsernames(['Olga Lucia Hernandez Rueda', 'Juana Riaño Colmenares', 'Sergio López González']);
    expect([...result.values()]).toEqual(['olga.hernandez', 'juana.riano', 'sergio.lopez']);
  });

  it('si dos quedan iguales, ambos agregan la inicial del segundo apellido', () => {
    const result = buildUsernames([
      'Silvia Maria Ortiz Castro',
      'Silvia Ortiz Perez',
      'Olga Lucia Hernandez Rueda',
    ]);
    expect(result.get('Silvia Maria Ortiz Castro')).toBe('silvia.ortiz.c');
    expect(result.get('Silvia Ortiz Perez')).toBe('silvia.ortiz.p');
    expect(result.get('Olga Lucia Hernandez Rueda')).toBe('olga.hernandez');
  });

  it('si aun así se repite, agrega un número', () => {
    const result = buildUsernames(['Ana Ruiz Diaz', 'Ana Maria Ruiz Duarte']);
    expect([...result.values()]).toEqual(['ana.ruiz.d', 'ana.ruiz.d2']);
  });
});
