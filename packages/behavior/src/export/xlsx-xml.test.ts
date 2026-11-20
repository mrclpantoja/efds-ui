import { describe, expect, it } from 'vitest';
import { readZip } from '../test-utils/zip';
import { toXlsx } from './xlsx';

describe('toXlsx: XML bem formado', () => {
  it('todas as partes são XML válido e os índices de texto existem', () => {
    const bytes = toXlsx(
      {
        columns: [
          { key: 'a', label: 'Nome & <Sobrenome>' },
          { key: 'b', label: 'Valor', type: 'currency' },
          { key: 'c', label: 'Data', type: 'date' },
        ],
        rows: [
          { a: 'Óleo "Modelo" <b>', b: 10.5, c: '2026-03-15' },
          { a: "O'Brien\nLinha 2 😀", b: -3, c: new Date(2026, 0, 5, 8, 30) },
        ],
      },
      { title: "Relatório: de 'Pedidos' / 2026 [x]", now: new Date(2026, 10, 20) },
    );
    const parser = new DOMParser();
    const files = readZip(bytes);
    expect(files.length).toBe(7);
    for (const file of files) {
      const doc = parser.parseFromString(file.text, 'application/xml');
      expect(doc.getElementsByTagName('parsererror'), file.name).toHaveLength(0);
    }
    const sst = parser.parseFromString(
      files.find((f) => f.name === 'xl/sharedStrings.xml')?.text ?? '',
      'application/xml',
    );
    const count = sst.getElementsByTagName('si').length;
    const sheet = parser.parseFromString(
      files.find((f) => f.name === 'xl/worksheets/sheet1.xml')?.text ?? '',
      'application/xml',
    );
    const refs = Array.from(sheet.querySelectorAll('c[t="s"] > v'), (v) => Number(v.textContent));
    expect(refs.length).toBeGreaterThan(0);
    expect(Math.max(...refs)).toBeLessThan(count);
    const wb = files.find((f) => f.name === 'xl/workbook.xml')?.text ?? '';
    expect(wb).toContain(`<sheet name="Relatório de 'Pedidos' 2026 x"`);
    expect(wb).toContain("'Relatório de ''Pedidos'' 2026 x'!$A$1:$C$3");
  });
});
