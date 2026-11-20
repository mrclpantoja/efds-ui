import { describe, expect, it } from 'vitest';
import {
  formatBy,
  formatCep,
  formatCnpj,
  formatCpf,
  formatCpfCnpj,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  formatPhone,
  formatRelative,
  maskCpf,
  toDate,
} from './format';

const nbsp = (text: string) => text.replace(new RegExp(String.fromCharCode(160), 'g'), ' ');

describe('formatadores', () => {
  it('moeda e número no padrão pt-BR, com casas decimais opcionais', () => {
    expect(nbsp(formatCurrency(1280.5))).toBe('R$ 1.280,50');
    expect(nbsp(formatCurrency('1.280,5'))).toBe('R$ 1.280,50');
    expect(nbsp(formatCurrency(10, { currency: 'USD', locale: 'en-US' }))).toBe('$10.00');
    expect(formatNumber(1234567.891, { decimals: 1 })).toBe('1.234.567,9');
    expect(formatNumber('abc')).toBe('');
    expect(formatCurrency(null)).toBe('');
  });

  it('datas só com dia são locais (sem deslocar por fuso)', () => {
    expect(formatDate('2026-03-15')).toBe('15/03/2026');
    expect(formatDate('15/03/2026')).toBe('15/03/2026');
    expect(formatDate(new Date(2026, 2, 5))).toBe('05/03/2026');
    expect(formatDate('2026-03-15', { style: 'long' })).toBe('15 de março de 2026');
    expect(formatDate('2026-03-15', { locale: 'en-US', style: 'long' })).toBe('March 15, 2026');
    expect(formatDate('lixo')).toBe('');
    expect(formatDate('')).toBe('');
  });

  it('data e hora', () => {
    expect(nbsp(formatDateTime('2026-03-15T14:05'))).toMatch(/^15\/03\/2026,? 14:05$/);
  });

  it('toDate trata ISO com fuso como instante', () => {
    expect(toDate('2026-03-15T12:00:00Z')?.toISOString()).toBe('2026-03-15T12:00:00.000Z');
    expect(toDate('x')).toBeNull();
  });

  it('relativo: "há 5 minutos", "em 2 dias", "ontem"', () => {
    const now = new Date(2026, 5, 10, 12, 0, 0);
    expect(formatRelative(new Date(2026, 5, 10, 11, 55, 0), { now })).toBe('há 5 minutos');
    expect(formatRelative(new Date(2026, 5, 13, 12, 0, 0), { now })).toBe('em 3 dias');
    expect(formatRelative(new Date(2026, 5, 9, 12, 0, 0), { now })).toBe('ontem');
    expect(formatRelative(new Date(2026, 5, 10, 11, 59, 30), { now })).toBe('há 30 segundos');
    expect(formatRelative('lixo', { now })).toBe('');
  });

  it('documentos e contato', () => {
    expect(formatCpf('12345678900')).toBe('123.456.789-00');
    expect(formatCpf('123')).toBe('123');
    expect(formatCnpj('12345678000190')).toBe('12.345.678/0001-90');
    expect(formatCpfCnpj('12345678900')).toBe('123.456.789-00');
    expect(formatCpfCnpj('12345678000190')).toBe('12.345.678/0001-90');
    expect(formatPhone('11987654321')).toBe('(11) 98765-4321');
    expect(formatPhone('1133334444')).toBe('(11) 3333-4444');
    expect(formatPhone('+55 11 98765-4321')).toBe('(11) 98765-4321');
    expect(formatCep('90010100')).toBe('90010-100');
  });

  it('maskCpf oculta o que a LGPD pede e nunca devolve o original', () => {
    expect(maskCpf('12345678900')).toBe('***.456.789-**');
    expect(maskCpf('123.456.789-00')).toBe('***.456.789-**');
    expect(maskCpf('123')).toBe('');
  });

  it('formatBy escolhe pelo nome', () => {
    expect(formatBy('cpf', '12345678900')).toBe('123.456.789-00');
    expect(formatBy('cpf-mask', '12345678900')).toBe('***.456.789-**');
    expect(formatBy('mask-cpf', '12345678900')).toBe('***.456.789-**');
    expect(formatBy('desconhecido', 'x')).toBe('');
  });
});
