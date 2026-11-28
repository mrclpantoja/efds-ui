import { describe, expect, it } from 'vitest';
import {
  isCep,
  isCnpj,
  isCpf,
  isCpfCnpj,
  isDate,
  isEmail,
  isDateRange,
  isPis,
  isPlate,
  isPhone,
  isVoterId,
  parseDateParts,
  validateBy,
} from './validate';

/**
 * Casos gerados por algoritmo (gerador independente do validador, com semente fixa): nenhum
 * documento de pessoa real aparece aqui.
 */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}
const next = rng(20261126);
const digitsOf = (n: number): number[] => Array.from({ length: n }, () => Math.floor(next() * 10));

function genCpf(): string {
  const d = digitsOf(9);
  for (const len of [9, 10]) {
    let sum = 0;
    for (let i = 0; i < len; i += 1) sum += d[i]! * (len + 1 - i);
    d.push(((sum * 10) % 11) % 10);
  }
  return d.join('');
}

const A = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
function genCnpj(alnum: boolean): string {
  const base = Array.from({ length: 12 }, () =>
    alnum ? A.charAt(Math.floor(next() * 36)) : String(Math.floor(next() * 10)),
  );
  const val = (c: string) => c.charCodeAt(0) - 48;
  const dv = (chars: string[], w: number[]) => {
    const sum = chars.reduce((acc, c, i) => acc + val(c) * w[i]!, 0);
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const d1 = dv(base, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = dv([...base, String(d1)], [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return [...base, String(d1), String(d2)].join('');
}

const maskCpf = (c: string) => `${c.slice(0, 3)}.${c.slice(3, 6)}.${c.slice(6, 9)}-${c.slice(9)}`;
const maskCnpj = (c: string) =>
  `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12)}`;

/** Troca o último dígito por outro, mantendo o formato: o verificador deixa de bater. */
const breakLast = (text: string): string => {
  const last = Number(text.slice(-1));
  return text.slice(0, -1) + String((last + 1) % 10);
};

describe('isCpf', () => {
  it('aceita 200 CPFs válidos gerados, com e sem máscara', () => {
    for (let i = 0; i < 200; i += 1) {
      const cpf = genCpf();
      if (/^(\d)\1{10}$/.test(cpf)) continue;
      expect(isCpf(cpf), cpf).toBe(true);
      expect(isCpf(maskCpf(cpf)), cpf).toBe(true);
    }
  });

  it('recusa o dígito verificador errado (primeiro e segundo)', () => {
    for (let i = 0; i < 50; i += 1) {
      const cpf = genCpf();
      expect(isCpf(breakLast(cpf))).toBe(false);
      const d1 = Number(cpf[9]);
      expect(isCpf(cpf.slice(0, 9) + String((d1 + 1) % 10) + cpf.slice(10))).toBe(false);
    }
  });

  it('recusa sequências repetidas, tamanho errado, letras e vazio', () => {
    for (let d = 0; d <= 9; d += 1) expect(isCpf(String(d).repeat(11))).toBe(false);
    expect(isCpf('123456789')).toBe(false);
    expect(isCpf('1234567890123')).toBe(false);
    expect(isCpf('abc.def.ghi-jk')).toBe(false);
    expect(isCpf('')).toBe(false);
  });

  it('exemplo clássico de documentação (gerado, não é de pessoa)', () => {
    expect(isCpf('529.982.247-25')).toBe(true);
    expect(isCpf('529.982.247-24')).toBe(false);
  });
});

describe('isCnpj', () => {
  it('aceita 200 CNPJs numéricos e 200 alfanuméricos gerados', () => {
    for (let i = 0; i < 200; i += 1) {
      for (const alnum of [false, true]) {
        const cnpj = genCnpj(alnum);
        if (/^(.)\1+$/.test(cnpj)) continue;
        expect(isCnpj(cnpj), cnpj).toBe(true);
        expect(isCnpj(maskCnpj(cnpj)), cnpj).toBe(true);
        expect(isCnpj(maskCnpj(cnpj).toLowerCase()), cnpj).toBe(true);
      }
    }
  });

  it('confere o exemplo oficial do CNPJ alfanumérico', () => {
    expect(isCnpj('12.ABC.345/01DE-35')).toBe(true);
    expect(isCnpj('12ABC34501DE35')).toBe(true);
    expect(isCnpj('12.ABC.345/01DE-36')).toBe(false);
  });

  it('recusa verificador errado, repetidos, letras nos 2 últimos e tamanho', () => {
    for (let i = 0; i < 50; i += 1) expect(isCnpj(breakLast(genCnpj(true)))).toBe(false);
    for (let d = 0; d <= 9; d += 1) expect(isCnpj(String(d).repeat(14))).toBe(false);
    expect(isCnpj('00.000.000/0001-AA')).toBe(false);
    expect(isCnpj('12345678')).toBe(false);
    expect(isCnpj('')).toBe(false);
  });

  it('CNPJ conhecido de exemplo (numérico gerado)', () => {
    expect(isCnpj('11.222.333/0001-81')).toBe(true);
    expect(isCnpj('11.222.333/0001-82')).toBe(false);
  });
});

describe('isCpfCnpj', () => {
  it('escolhe pelo tamanho', () => {
    expect(isCpfCnpj(genCpf().replace(/^(\d)\1+$/, '52998224725'))).toBe(true);
    expect(isCpfCnpj('11.222.333/0001-81')).toBe(true);
    expect(isCpfCnpj('11.222.333/0001-80')).toBe(false);
    expect(isCpfCnpj('5299822472')).toBe(false);
    expect(isCpfCnpj('')).toBe(false);
  });
});

describe('isCep', () => {
  it('aceita 8 dígitos com ou sem hífen e recusa 00000-000', () => {
    expect(isCep('90010-100')).toBe(true);
    expect(isCep('90010100')).toBe(true);
    expect(isCep(' 90010-100 ')).toBe(true);
    expect(isCep('00000-000')).toBe(false);
    expect(isCep('9001-0100')).toBe(false);
    expect(isCep('9001010')).toBe(false);
    expect(isCep('9001010A')).toBe(false);
  });
});

describe('isPhone', () => {
  it('aceita fixo e celular com DDD, em vários formatos', () => {
    expect(isPhone('(53) 3222-1234')).toBe(true);
    expect(isPhone('5332221234')).toBe(true);
    expect(isPhone('(53) 99912-3456')).toBe(true);
    expect(isPhone('53 9 9912 3456')).toBe(true);
    expect(isPhone('+55 53 99912-3456')).toBe(true);
    expect(isPhone('+55 (11) 4002-8922')).toBe(true);
  });

  it('filtra por tipo', () => {
    expect(isPhone('(53) 3222-1234', { type: 'landline' })).toBe(true);
    expect(isPhone('(53) 3222-1234', { type: 'mobile' })).toBe(false);
    expect(isPhone('(53) 99912-3456', { type: 'mobile' })).toBe(true);
    expect(isPhone('(53) 99912-3456', { type: 'landline' })).toBe(false);
  });

  it('recusa DDD inexistente, falta de DDD, números iguais, tamanho e país errado', () => {
    expect(isPhone('(10) 3222-1234')).toBe(false);
    expect(isPhone('(20) 99912-3456')).toBe(false);
    expect(isPhone('3222-1234')).toBe(false);
    expect(isPhone('999123456')).toBe(false);
    expect(isPhone('(53) 99999-9999')).toBe(false);
    expect(isPhone('(53) 3333-3333')).toBe(false);
    expect(isPhone('(53) 8222-1234')).toBe(false);
    expect(isPhone('(53) 3222-123')).toBe(false);
    expect(isPhone('+1 53 99912-3456')).toBe(false);
    expect(isPhone('(53) 3222-12ab')).toBe(false);
    expect(isPhone('')).toBe(false);
  });
});

describe('isEmail', () => {
  it('aceita endereços comuns', () => {
    for (const ok of [
      'nome@exemplo.com.br',
      'nome.sobrenome+tag@exemplo.com',
      "o'brien@exemplo.org",
      'x@a-b.co',
      'ação@exemplo.com.br',
      'a@b.cd',
    ]) {
      expect(isEmail(ok), ok).toBe(true);
    }
  });

  it('recusa os erros típicos', () => {
    for (const bad of [
      '',
      'semarroba.com',
      '@exemplo.com',
      'nome@',
      'nome@exemplo',
      'nome@@exemplo.com',
      'nome@exemplo..com',
      '.nome@exemplo.com',
      'nome.@exemplo.com',
      'no..me@exemplo.com',
      'nome @exemplo.com',
      'nome@-exemplo.com',
      'nome@exemplo.c',
      'nome@exemplo.123',
      `${'a'.repeat(65)}@exemplo.com`,
      `a@${'b'.repeat(64)}.com`,
    ]) {
      expect(isEmail(bad), bad).toBe(false);
    }
  });
});

describe('datas', () => {
  it('lê dd/mm/aaaa e ISO', () => {
    expect(parseDateParts('26/11/2026')).toEqual({ year: 2026, month: 11, day: 26 });
    expect(parseDateParts('2026-11-26')).toEqual({ year: 2026, month: 11, day: 26 });
    expect(parseDateParts('26-11-2026')).toBeNull();
    expect(parseDateParts('26/11/26')).toBeNull();
  });

  it('confere o calendário (bissexto, 30/31 dias, mês 13)', () => {
    expect(isDate('29/02/2028')).toBe(true);
    expect(isDate('29/02/2027')).toBe(false);
    expect(isDate('29/02/2100')).toBe(false);
    expect(isDate('29/02/2000')).toBe(true);
    expect(isDate('31/04/2026')).toBe(false);
    expect(isDate('31/12/2026')).toBe(true);
    expect(isDate('00/01/2026')).toBe(false);
    expect(isDate('15/13/2026')).toBe(false);
    expect(isDate('2026-02-30')).toBe(false);
    expect(isDate('2028-02-29')).toBe(true);
    expect(isDate('01/01/0999')).toBe(false);
    expect(isDate('')).toBe(false);
  });

  it('faixa min/max, com os limites inclusos e formatos misturados', () => {
    const o = { min: '01/01/2026', max: '2026-12-31' };
    expect(isDate('01/01/2026', o)).toBe(true);
    expect(isDate('31/12/2026', o)).toBe(true);
    expect(isDate('31/12/2025', o)).toBe(false);
    expect(isDate('01/01/2027', o)).toBe(false);
    expect(isDate('15/06/2026', { min: '01/01/2026' })).toBe(true);
    expect(isDate('15/06/2026', { max: '01/01/2026' })).toBe(false);
  });

  it('intervalo: início não pode passar do fim', () => {
    expect(isDateRange('01/01/2026', '31/01/2026')).toBe(true);
    expect(isDateRange('01/01/2026', '01/01/2026')).toBe(true);
    expect(isDateRange('2026-02-01', '31/01/2026')).toBe(false);
    expect(isDateRange('31/02/2026', '01/03/2026')).toBe(false);
  });
});

function genPis(): string {
  const w = [3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const d = digitsOf(10);
  const sum = d.reduce((acc, n, i) => acc + n * w[i]!, 0);
  const r = 11 - (sum % 11);
  d.push(r >= 10 ? 0 : r);
  return d.join('');
}

describe('isPis', () => {
  it('aceita PIS gerados, com ou sem máscara', () => {
    for (let i = 0; i < 100; i += 1) {
      const pis = genPis();
      if (/^(\d)\1+$/.test(pis)) continue;
      expect(isPis(pis), pis).toBe(true);
      expect(isPis(`${pis.slice(0, 3)}.${pis.slice(3, 8)}.${pis.slice(8, 10)}-${pis[10]}`)).toBe(
        true,
      );
      expect(isPis(breakLast(pis))).toBe(false);
    }
  });

  it('recusa repetidos e tamanho', () => {
    expect(isPis('11111111111')).toBe(false);
    expect(isPis('1234567890')).toBe(false);
    expect(isPis('')).toBe(false);
  });
});

function genTitulo(uf: number): string {
  const seq = digitsOf(8);
  const ufd = [Math.floor(uf / 10), uf % 10];
  const fix = (r: number) => (r === 10 ? 0 : r === 0 && (uf === 1 || uf === 2) ? 1 : r);
  const dv1 = fix(seq.reduce((acc, n, i) => acc + n * (i + 2), 0) % 11);
  const dv2 = fix((ufd[0]! * 7 + ufd[1]! * 8 + dv1 * 9) % 11);
  return [...seq, ...ufd, dv1, dv2].join('');
}

describe('isVoterId', () => {
  it('aceita títulos gerados de todas as UFs (01 a 28)', () => {
    for (let uf = 1; uf <= 28; uf += 1) {
      for (let i = 0; i < 5; i += 1) {
        const t = genTitulo(uf);
        if (/^(\d)\1+$/.test(t)) continue;
        expect(isVoterId(t), t).toBe(true);
        expect(isVoterId(`${t.slice(0, 4)} ${t.slice(4, 8)} ${t.slice(8)}`)).toBe(true);
      }
    }
  });

  it('recusa verificador errado, UF fora de 01-28, repetidos e tamanho', () => {
    for (let i = 0; i < 30; i += 1) {
      const t = genTitulo(1 + (i % 28));
      expect(isVoterId(breakLast(t))).toBe(false);
    }
    const base = genTitulo(5);
    expect(isVoterId(`${base.slice(0, 8)}00${base.slice(10)}`)).toBe(false);
    expect(isVoterId(`${base.slice(0, 8)}29${base.slice(10)}`)).toBe(false);
    expect(isVoterId('111111111111')).toBe(false);
    expect(isVoterId('12345678')).toBe(false);
    expect(isVoterId('1234')).toBe(false);
    expect(isVoterId('1023850106710')).toBe(false);
  });

  it('confere com exemplo independente (mesma regra do brazilian-utils)', () => {
    expect(isVoterId('102385010671')).toBe(true);
    expect(isVoterId('1023 8501 0671')).toBe(true);
    expect(isVoterId('102385010672')).toBe(false);
  });

  it('completa com zeros os títulos antigos sem os zeros à esquerda', () => {
    expect(isVoterId('000123450655')).toBe(true);
    expect(isVoterId('123450655')).toBe(true);
    expect(isVoterId('12345 06 55')).toBe(true);
    expect(isVoterId('123450656')).toBe(false);
  });
});

describe('isPlate', () => {
  it('aceita o padrão antigo e o Mercosul, em qualquer caixa', () => {
    for (const ok of ['ABC-1234', 'abc1234', 'ABC 1234', 'ABC1D23', 'abc1d23', 'BRA2E19']) {
      expect(isPlate(ok), ok).toBe(true);
    }
  });

  it('recusa formatos que não existem', () => {
    for (const bad of [
      '',
      'AB-12345',
      'ABCD123',
      '1234ABC',
      'ABC-12D4',
      'ABC1D2',
      'ABC1DD3',
      'ÁBC1234',
    ]) {
      expect(isPlate(bad), bad).toBe(false);
    }
  });
});

describe('validateBy', () => {
  it('campo vazio é válido (o required decide)', () => {
    for (const name of [
      'cpf',
      'cnpj',
      'cpf-cnpj',
      'cep',
      'telefone',
      'email',
      'pis',
      'titulo',
      'placa',
      'data',
    ] as const) {
      expect(validateBy(name, ''), name).toBe(true);
      expect(validateBy(name, '   '), name).toBe(true);
    }
  });

  it('despacha pelo nome', () => {
    expect(validateBy('cpf', '529.982.247-25')).toBe(true);
    expect(validateBy('cpf', '529.982.247-24')).toBe(false);
    expect(validateBy('data', '15/06/2026', { max: '01/01/2026' })).toBe(false);
    expect(validateBy('telefone', '(53) 3222-1234', { type: 'mobile' })).toBe(false);
  });
});
