import { formatIsoDate, normalize } from './model';
import type { ExportData } from './types';

/**
 * JSON: array de objetos com as `key`s das colunas. Número, moeda e percentual saem como número,
 * data como ISO (`2026-03-15` ou `2026-03-15T14:30:00`, relógio local), texto como texto e
 * célula vazia como `null`. Com `key` repetida, vale a última coluna.
 */
export function toJson(data: ExportData): string {
  const { columns, rows } = normalize(data);
  const out = rows.map((row) => {
    const obj: Record<string, string | number | boolean | null> = {};
    row.forEach((cell, i) => {
      const key = columns[i]?.key;
      if (key === undefined) return;
      obj[key] =
        cell.kind === 'empty'
          ? null
          : cell.kind === 'date'
            ? formatIsoDate(cell)
            : cell.kind === 'text'
              ? cell.text
              : cell.value;
    });
    return obj;
  });
  return JSON.stringify(out, null, 2);
}
