import { describe, expect, it } from 'vitest';
import { createMask, MASK_NAMES } from './mask';

/** Monta um número CNJ fictício com o dígito verificador correto. */
function processo(n: string, aaaa: string, j: string, tr: string, oooo: string): string {
  let rest = 0;
  for (const ch of `${n}${aaaa}${j}${tr}${oooo}00`) rest = (rest * 10 + Number(ch)) % 97;
  const dd = String(98 - rest).padStart(2, '0');
  return `${n}-${dd}.${aaaa}.${j}.${tr}.${oooo}`;
}

describe('máscaras novas (hora, competência, processo)', () => {
  it('estão na lista de máscaras prontas e não mudam as anteriores', () => {
    expect(MASK_NAMES).toEqual(expect.arrayContaining(['hora', 'competencia', 'processo']));
    expect(createMask('cpf').format('12345678900')).toBe('123.456.789-00');
    expect(createMask('telefone').format('11987654321')).toBe('(11) 98765-4321');
  });

  it('hora: hh:mm, só dígitos', () => {
    const m = createMask('hora');
    expect(m.maxLength).toBe(5);
    expect(m.inputMode).toBe('numeric');
    expect(m.format('0930')).toBe('09:30');
    expect(m.format('09')).toBe('09');
    expect(m.format('093')).toBe('09:3');
    expect(m.unmask('09:30')).toBe('0930');
    expect(m.edit({ text: '0930x', caret: 5 }).value).toBe('09:30');
  });

  it('hora: a faixa só é conferida por validate', () => {
    const m = createMask('hora');
    expect(m.format('2599')).toBe('25:99'); // a máscara não valida
    expect(m.validate?.('')).toBe(true);
    expect(m.validate?.('23:59')).toBe(true);
    expect(m.validate?.('00:00')).toBe(true);
    expect(m.validate?.('24:00')).toBe(false);
    expect(m.validate?.('12:60')).toBe(false);
    expect(m.validate?.('12:3')).toBe(false);
  });

  it('competência: mm/aaaa e mês de 01 a 12', () => {
    const m = createMask('competencia');
    expect(m.maxLength).toBe(7);
    expect(m.format('032026')).toBe('03/2026');
    expect(m.format('03')).toBe('03');
    expect(m.format('032')).toBe('03/2');
    expect(m.validate?.('03/2026')).toBe(true);
    expect(m.validate?.('13/2026')).toBe(false);
    expect(m.validate?.('00/2026')).toBe(false);
    expect(m.validate?.('03/20')).toBe(false);
    expect(m.validate?.('')).toBe(true);
  });

  it('processo CNJ: NNNNNNN-DD.AAAA.J.TR.OOOO', () => {
    const m = createMask('processo');
    expect(m.maxLength).toBe(25);
    expect(m.format('000123420202482100')).toBe('0001234-20.2024.8.21.00');
    expect(m.format('00012342020248210001')).toBe('0001234-20.2024.8.21.0001');
    expect(m.unmask('0001234-20.2024.8.21.0001')).toBe('00012342020248210001');
  });

  it('processo CNJ: valida o dígito verificador', () => {
    const m = createMask('processo');
    const valid = processo('0001234', '2024', '8', '21', '0001');
    expect(valid).toMatch(/^\d{7}-\d{2}\.2024\.8\.21\.0001$/);
    expect(m.validate?.(valid)).toBe(true);
    // Sem pontuação também: a máscara refaz o texto antes de validar.
    expect(m.validate?.(valid.replace(/\D/g, ''))).toBe(true);
    const dd = valid.slice(8, 10);
    const wrong = valid.replace(`-${dd}.`, `-${dd === '00' ? '01' : '00'}.`);
    expect(m.validate?.(wrong)).toBe(false);
    expect(m.validate?.('0001234-20.2024.8.21')).toBe(false);
  });

  it('as máscaras antigas não têm validate', () => {
    expect(createMask('cpf').validate).toBeUndefined();
    expect(createMask('00.00').validate).toBeUndefined();
  });
});
