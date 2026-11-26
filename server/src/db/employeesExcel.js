// Lee los informes de empleados (.xlsx) y los une por nombre completo.
//
// Cada archivo trae una fila de encabezados con "Nombre completo" y uno o más campos
// (p. ej. "Cargo" o "Área"). Los archivos se combinan en un solo empleado por nombre.
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import ExcelJS from 'exceljs';

const NAME_HEADER = 'nombre completo';

// Encabezado del Excel (normalizado) -> propiedad del empleado.
const FIELD_BY_HEADER = {
  cargo: 'position',
  area: 'area',
};

function normalizeHeader(value) {
  return cellText(value)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

function cellText(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    if ('result' in value) return cellText(value.result);
    if ('richText' in value) return value.richText.map((part) => part.text).join('');
    if ('text' in value) return cellText(value.text);
  }
  return String(value).replace(/\s+/g, ' ').trim();
}

async function readWorkbook(filePath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheet = workbook.worksheets[0];
  const rows = [];
  let columns = null;

  sheet.eachRow((row) => {
    const values = row.values; // índice 1 = columna A
    if (!columns) {
      const nameIndex = values.findIndex((v) => normalizeHeader(v) === NAME_HEADER);
      if (nameIndex === -1) return;
      columns = { name: nameIndex, fields: [] };
      values.forEach((v, index) => {
        const field = FIELD_BY_HEADER[normalizeHeader(v)];
        if (field) columns.fields.push({ index, field });
      });
      return;
    }
    const fullName = cellText(values[columns.name]);
    if (!fullName) return;
    const employee = { fullName };
    for (const { index, field } of columns.fields) {
      employee[field] = cellText(values[index]) || null;
    }
    rows.push(employee);
  });

  if (!columns) {
    throw new Error(`El archivo ${path.basename(filePath)} no tiene la columna "Nombre completo".`);
  }
  return rows;
}

/**
 * @param {string} directory carpeta con los .xlsx
 * @returns {Promise<Array<{ fullName: string, position?: string|null, area?: string|null }>>}
 */
export async function readEmployeesFromExcel(directory) {
  const files = (await readdir(directory))
    .filter((name) => name.toLowerCase().endsWith('.xlsx') && !name.startsWith('~$'))
    .sort();
  if (files.length === 0) {
    throw new Error(`No hay archivos .xlsx en ${directory}.`);
  }

  const byName = new Map();
  for (const file of files) {
    for (const employee of await readWorkbook(path.join(directory, file))) {
      byName.set(employee.fullName, { ...byName.get(employee.fullName), ...employee });
    }
  }
  return [...byName.values()];
}
