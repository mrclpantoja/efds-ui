import { describe, expect, it } from 'vitest';
import {
  checkPassword,
  clampNumber,
  decimalsOf,
  otpFill,
  otpSanitize,
  roundTo,
  stepNumber,
  toLookupItem,
} from './fields';

describe('checkPassword', () => {
  it('vazia: nível 0 e nenhuma regra atendida', () => {
    const r = checkPassword('');
    expect(r.level).toBe(0);
    expect(Object.values(r.rules).every((v) => !v)).toBe(true);
  });

  it('curta é fraca (nível 1)', () => {
    expect(checkPassword('abc').level).toBe(1);
    expect(checkPassword('Ab1!').level).toBe(1);
  });

  it('sequência, repetição e palavras comuns pesam contra', () => {
    expect(checkPassword('Senha1234').level).toBe(1);
    expect(checkPassword('aaaaaaaaaaaa').level).toBeLessThanOrEqual(2);
    expect(checkPassword('Xaaa7!Zk9m').level).toBeLessThan(checkPassword('Xab7!Zk9m2').level);
  });

  it('comprimento e variedade sobem o nível, até forte (4)', () => {
    expect(checkPassword('boaresposta2').level).toBe(2);
    expect(checkPassword('Cavalo-Azul-77!').level).toBe(4);
    expect(checkPassword('BoaResposta9').level).toBeGreaterThanOrEqual(3);
  });

  it('as regras refletem o texto e o comprimento mínimo', () => {
    expect(checkPassword('Ab1!', 4).rules).toEqual({
      length: true,
      lower: true,
      upper: true,
      digit: true,
      symbol: true,
    });
    expect(checkPassword('abc', 8).rules.length).toBe(false);
    expect(checkPassword('ação').rules.lower).toBe(true);
    expect(checkPassword('AÇÃO').rules.upper).toBe(true);
  });
});

describe('OTP', () => {
  it('otpSanitize só deixa dígitos (ou letras e dígitos em maiúscula)', () => {
    expect(otpSanitize('12 34-56')).toBe('123456');
    expect(otpSanitize('a1b2', 'alphanumeric')).toBe('A1B2');
    expect(otpSanitize('a1b2')).toBe('12');
  });

  it('otpFill distribui a partir da célula e devolve a próxima', () => {
    expect(otpFill(['', '', '', ''], 0, '1234')).toEqual({ cells: ['1', '2', '3', '4'], next: 3 });
    expect(otpFill(['9', '', '', ''], 1, '12')).toEqual({ cells: ['9', '1', '2', ''], next: 3 });
    expect(otpFill(['', '', ''], 1, '123456')).toEqual({ cells: ['', '1', '2'], next: 2 });
  });
});

describe('números', () => {
  it('decimalsOf, clampNumber e roundTo', () => {
    expect(decimalsOf(1)).toBe(0);
    expect(decimalsOf(0.25)).toBe(2);
    expect(clampNumber(5, { min: 1, max: 3 })).toBe(3);
    expect(clampNumber(-5, { min: 1 })).toBe(1);
    expect(roundTo(0.1 + 0.2, 2)).toBe(0.3);
  });

  it('stepNumber respeita faixa, passo e casas decimais', () => {
    expect(stepNumber(5, 1, 1, {}, 0)).toBe(6);
    expect(stepNumber(5, 10, 1, { max: 12 }, 0)).toBe(12);
    expect(stepNumber(1, -1, 1, { min: 1 }, 0)).toBe(1);
    expect(stepNumber(0.1, 2, 0.1, {}, 1)).toBe(0.3);
    expect(stepNumber(null, 1, 1, { min: 3 }, 0)).toBe(3);
    expect(stepNumber(null, 1, 1, {}, 0)).toBe(1);
  });
});

describe('toLookupItem', () => {
  it('aceita code/description e os nomes comuns', () => {
    expect(toLookupItem({ code: '10', description: 'Alfa' })?.description).toBe('Alfa');
    expect(toLookupItem({ codigo: 7, nome: 'Beta' })).toMatchObject({
      code: '7',
      description: 'Beta',
    });
    expect(toLookupItem({ descricao: 'sem código' })).toBeNull();
    expect(toLookupItem(null)).toBeNull();
  });
});
