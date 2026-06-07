'use strict';

const ALLOWED_TYPES = ['number', 'string'];

function validateStandings(data) {
  const errors = [];
  if (!data || typeof data !== 'object') return ['El JSON no es un objeto valido.'];
  if (data.dataset !== 'standings') errors.push('dataset debe ser exactamente standings.');
  if (!Array.isArray(data.columns) || data.columns.length === 0)
    errors.push('columns debe ser un array con al menos una columna.');
  if (!Array.isArray(data.rows) || data.rows.length === 0)
    errors.push('rows debe ser un array con al menos una fila.');
  if (errors.length) return errors;

  for (const col of data.columns) {
    if (!col.key || typeof col.key !== 'string') {
      errors.push('Cada columna necesita un campo key.'); continue;
    }
    if (!col.label || typeof col.label !== 'string')
      errors.push('Columna ' + col.key + ' necesita un label.');
    if (!ALLOWED_TYPES.includes(col.type))
      errors.push('Columna ' + col.key + ': type debe ser number o string.');
  }

  for (let i = 0; i < data.rows.length; i++) {
    const row = data.rows[i];
    if (!row || typeof row !== 'object') {
      errors.push('Fila ' + (i + 1) + ' no es un objeto.'); continue;
    }
    for (const col of data.columns) {
      if (!(col.key in row))
        errors.push('Fila ' + (i + 1) + ' le falta el campo ' + col.key + '.');
      else if (col.type === 'number' && typeof row[col.key] !== 'number')
        errors.push('Fila ' + (i + 1) + ' campo ' + col.key + ' debe ser number.');
    }
  }
  return errors;
}

module.exports = { validateStandings };
