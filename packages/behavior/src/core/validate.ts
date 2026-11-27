/**
 * Validadores brasileiros (funções puras, sem DOM e sem dependência). Aceitam o valor com ou sem
 * máscara e devolvem só `true`/`false`: campo vazio é decisão de quem chama (`required`).
 * Compartilhado pelo HTML (`data-eds-validate`) e pelo `@efds-ui/react` (`validate`).
 */

/** Textos padrão (pt-BR) da validação; o `configure({ messages })` e o `texts` do React trocam. */
export const validationMessages = {
  // Validadores (`data-eds-validate`)
  validateCpf: 'Informe um CPF válido.',
  validateCnpj: 'Informe um CNPJ válido.',
  validateCpfCnpj: 'Informe um CPF ou CNPJ válido.',
  validateCep: 'Informe um CEP válido, com 8 dígitos.',
  validateTelefone: 'Informe um telefone válido, com DDD.',
  validateEmail: 'Informe um e-mail válido, como nome@exemplo.com.br.',
  validatePis: 'Informe um PIS/PASEP/NIS válido.',
  validateTitulo: 'Informe um título de eleitor válido.',
  validatePlaca: 'Informe uma placa válida, como ABC-1234 ou ABC1D23.',
  validateData: 'Informe uma data válida, como 31/12/2026.',
  validateDataMin: 'Informe uma data a partir de {min}.',
  validateDataMax: 'Informe uma data até {max}.',
  validateDataRange: 'Informe uma data entre {min} e {max}.',
  // Restrições nativas (no lugar do texto do navegador, que segue o idioma dele)
  validateRequired: 'Preencha este campo.',
  validateRequiredCheck: 'Marque esta opção para continuar.',
  validateRequiredChoice: 'Escolha uma opção.',
  validateTooShort: 'Use pelo menos {min} caracteres.',
  validateTooLong: 'Use no máximo {max} caracteres.',
  validatePattern: 'O valor não segue o formato esperado.',
  validateRangeUnderflow: 'Informe um valor a partir de {min}.',
  validateRangeOverflow: 'Informe um valor até {max}.',
  // Resumo de erros
  errorSummaryTitleOne: 'Corrija 1 campo',
  errorSummaryTitleMany: 'Corrija {count} campos',
  errorSummaryFixed: 'Todos os erros foram corrigidos.',
} as const;

export type ValidationMessages = { [K in keyof typeof validationMessages]: string };

/** Nomes aceitos em `data-eds-validate` e na prop `validate` do React. */
export const VALIDATOR_NAMES = [
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
] as const;
export type ValidatorName = (typeof VALIDATOR_NAMES)[number];

export function isValidatorName(value: string): value is ValidatorName {
  return (VALIDATOR_NAMES as readonly string[]).includes(value);
}

/** Chave do texto de erro de cada validador. */
export const VALIDATOR_MESSAGE_KEY: Record<ValidatorName, keyof ValidationMessages> = {
  cpf: 'validateCpf',
  cnpj: 'validateCnpj',
  'cpf-cnpj': 'validateCpfCnpj',
  cep: 'validateCep',
  telefone: 'validateTelefone',
  email: 'validateEmail',
  pis: 'validatePis',
  titulo: 'validateTitulo',
  placa: 'validatePlaca',
  data: 'validateData',
};

const allSame = (text: string): boolean =>
  text.length > 0 && text.split('').every((c) => c === text[0]);

/** Só os dígitos 0-9 (ASCII). */
export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

// CPF --------------------------------------------------------------------------------------------

function cpfDigit(base: number[]): number {
  let sum = 0;
  for (let i = 0; i < base.length; i += 1) sum += (base[i] ?? 0) * (base.length + 1 - i);
  const rest = (sum * 10) % 11;
  return rest === 10 ? 0 : rest;
}

/** CPF com dígitos verificadores corretos. Aceita `000.000.000-00` e `00000000000`; rejeita `111.111.111-11`. */
export function isCpf(value: string): boolean {
  const text = value.trim().replace(/[.\-\s]/g, '');
  if (!/^\d{11}$/.test(text) || allSame(text)) return false;
  const d = text.split('').map(Number);
  return cpfDigit(d.slice(0, 9)) === d[9] && cpfDigit(d.slice(0, 10)) === d[10];
}

// CNPJ (numérico e alfanumérico de 2026) -----------------------------------------------------------

const CNPJ_W1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const CNPJ_W2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

/** Valor do caractere no cálculo do CNPJ: código ASCII menos 48 (0-9 → 0-9, A-Z → 17-42). */
const cnpjValue = (char: string): number => char.charCodeAt(0) - 48;

function cnpjDigit(chars: string[], weights: number[]): number {
  let sum = 0;
  for (let i = 0; i < weights.length; i += 1) sum += cnpjValue(chars[i] ?? '0') * (weights[i] ?? 0);
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
}

/**
 * CNPJ com dígitos verificadores corretos, numérico ou alfanumérico (as 12 primeiras posições
 * aceitam letras; os 2 dígitos finais são sempre números). Aceita `00.000.000/0000-00`.
 */
export function isCnpj(value: string): boolean {
  const text = value
    .trim()
    .replace(/[.\-/\s]/g, '')
    .toUpperCase();
  if (!/^[0-9A-Z]{12}\d{2}$/.test(text) || allSame(text)) return false;
  const chars = text.split('');
  return (
    cnpjDigit(chars, CNPJ_W1) === Number(chars[12]) &&
    cnpjDigit(chars.slice(0, 13), CNPJ_W2) === Number(chars[13])
  );
}

/** CPF (11 posições) ou CNPJ (14), pelo tamanho. */
export function isCpfOuCnpj(value: string): boolean {
  const text = value.trim().replace(/[.\-/\s]/g, '');
  if (text.length === 11) return isCpf(text);
  if (text.length === 14) return isCnpj(text);
  return false;
}

// CEP --------------------------------------------------------------------------------------------

/** CEP com 8 dígitos (`90010-100` ou `90010100`); `00000-000` não existe. */
export function isCep(value: string): boolean {
  const text = value.trim();
  return /^\d{5}-?\d{3}$/.test(text) && text.replace('-', '') !== '00000000';
}

// Telefone ---------------------------------------------------------------------------------------

/** DDDs em uso no Brasil. */
const DDDS = new Set(
  (
    '11 12 13 14 15 16 17 18 19 21 22 24 27 28 31 32 33 34 35 37 38 41 42 43 44 45 46 47 48 49 ' +
    '51 53 54 55 61 62 63 64 65 66 67 68 69 71 73 74 75 77 79 81 82 83 84 85 86 87 88 89 ' +
    '91 92 93 94 95 96 97 98 99'
  ).split(' '),
);

export interface TelefoneOptions {
  /** `fixo` (8 dígitos, começa em 2 a 5), `celular` (9 dígitos, começa em 9) ou `qualquer` (padrão). */
  tipo?: 'fixo' | 'celular' | 'qualquer';
}

/**
 * Telefone brasileiro com DDD, fixo ou celular: `(53) 3222-1234`, `53 99999-1234`, `+55 53 99999-1234`.
 * O DDD precisa existir; números com todos os dígitos iguais são recusados.
 */
export function isTelefone(value: string, options: TelefoneOptions = {}): boolean {
  let text = value.trim();
  if (/^\+/.test(text)) {
    if (!/^\+\s*55/.test(text)) return false;
    text = text.replace(/^\+\s*55/, '');
  }
  text = text.replace(/[()\-\s.]/g, '');
  if (!/^\d+$/.test(text)) return false;
  // `0` de tronco na frente do DDD (`053 ...`) não vale; o código do país só com `+`.
  const ddd = text.slice(0, 2);
  const local = text.slice(2);
  if (!DDDS.has(ddd) || allSame(local)) return false;
  const tipo = options.tipo ?? 'qualquer';
  const fixo = /^[2-5]\d{7}$/.test(local);
  const celular = /^9\d{8}$/.test(local);
  if (tipo === 'fixo') return fixo;
  if (tipo === 'celular') return celular;
  return fixo || celular;
}

// E-mail -----------------------------------------------------------------------------------------

const EMAIL_LOCAL = /^[\p{L}\p{N}!#$%&'*+/=?^_`{|}~-]+(?:\.[\p{L}\p{N}!#$%&'*+/=?^_`{|}~-]+)*$/u;
const EMAIL_LABEL = /^[\p{L}\p{N}](?:[\p{L}\p{N}-]{0,61}[\p{L}\p{N}])?$/u;

/**
 * E-mail pragmático: uma `@`, parte local sem pontos soltos, domínio com ao menos dois rótulos e o
 * último (TLD) só de letras com 2 ou mais. Não confirma que a caixa existe.
 */
export function isEmail(value: string): boolean {
  const text = value.trim();
  if (text.length > 254) return false;
  const at = text.lastIndexOf('@');
  if (at < 1 || at !== text.indexOf('@')) return false;
  const local = text.slice(0, at);
  const domain = text.slice(at + 1);
  if (local.length > 64 || !EMAIL_LOCAL.test(local)) return false;
  const labels = domain.split('.');
  if (labels.length < 2) return false;
  if (!labels.every((label) => EMAIL_LABEL.test(label))) return false;
  return /^\p{L}{2,}$/u.test(labels[labels.length - 1] ?? '');
}

// Datas ------------------------------------------------------------------------------------------

export interface DateParts {
  year: number;
  month: number;
  day: number;
}

const daysIn = (year: number, month: number): number => new Date(year, month, 0).getDate();

/**
 * Lê `dd/mm/aaaa` ou `aaaa-mm-dd` (ISO) e devolve as partes, ou `null` se o formato ou o calendário
 * não fecham (31/02, 29/02 em ano comum, mês 13). Ano de 1000 a 9999. Sem fuso.
 */
export function parseData(value: string): DateParts | null {
  const text = value.trim();
  let match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  let day: number;
  let month: number;
  let year: number;
  if (match) {
    day = Number(match[1]);
    month = Number(match[2]);
    year = Number(match[3]);
  } else {
    match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
    if (!match) return null;
    year = Number(match[1]);
    month = Number(match[2]);
    day = Number(match[3]);
  }
  if (year < 1000 || month < 1 || month > 12 || day < 1 || day > daysIn(year, month)) return null;
  return { year, month, day };
}

const dateKey = (p: DateParts): number => p.year * 10000 + p.month * 100 + p.day;

export interface DataOptions {
  /** Menor data aceita (`dd/mm/aaaa` ou ISO). */
  min?: string;
  /** Maior data aceita. */
  max?: string;
}

/** Data real em `dd/mm/aaaa` ou ISO; com `min`/`max`, também confere a faixa (limites inclusos). */
export function isDataValida(value: string, options: DataOptions = {}): boolean {
  const date = parseData(value);
  if (!date) return false;
  const min = options.min ? parseData(options.min) : null;
  const max = options.max ? parseData(options.max) : null;
  if (min && dateKey(date) < dateKey(min)) return false;
  if (max && dateKey(date) > dateKey(max)) return false;
  return true;
}

/** Período: as duas datas existem e o início não é depois do fim (iguais valem). */
export function isIntervaloDatas(inicio: string, fim: string): boolean {
  const a = parseData(inicio);
  const b = parseData(fim);
  return a !== null && b !== null && dateKey(a) <= dateKey(b);
}

// PIS/PASEP/NIS ----------------------------------------------------------------------------------

const PIS_W = [3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

/** PIS, PASEP ou NIS (11 dígitos) com dígito verificador correto. */
export function isPis(value: string): boolean {
  const text = value.trim().replace(/[.\-\s]/g, '');
  if (!/^\d{11}$/.test(text) || allSame(text)) return false;
  const d = text.split('').map(Number);
  let sum = 0;
  for (let i = 0; i < 10; i += 1) sum += (d[i] ?? 0) * (PIS_W[i] ?? 0);
  const rest = 11 - (sum % 11);
  return (rest >= 10 ? 0 : rest) === d[10];
}

// Título de eleitor ------------------------------------------------------------------------------

/**
 * Título de eleitor: 8 dígitos de sequência, 2 da UF (01 a 28; 28 é o exterior) e 2 verificadores.
 * Resto 10 vira 0; para SP (01) e MG (02), resto 0 vira 1.
 */
export function isTituloEleitor(value: string): boolean {
  const text = value.trim().replace(/[.\-\s]/g, '');
  if (!/^\d{12}$/.test(text) || allSame(text)) return false;
  const d = text.split('').map(Number);
  const uf = d[8]! * 10 + d[9]!;
  if (uf < 1 || uf > 28) return false;
  const fix = (rest: number): number => {
    if (rest === 10) return 0;
    if (rest === 0 && (uf === 1 || uf === 2)) return 1;
    return rest;
  };
  let sum1 = 0;
  for (let i = 0; i < 8; i += 1) sum1 += (d[i] ?? 0) * (i + 2);
  const dv1 = fix(sum1 % 11);
  const dv2 = fix((d[8]! * 7 + d[9]! * 8 + dv1 * 9) % 11);
  return dv1 === d[10] && dv2 === d[11];
}

// Placa ------------------------------------------------------------------------------------------

/** Placa de veículo: padrão antigo (`ABC-1234`) ou Mercosul (`ABC1D23`), em qualquer caixa. */
export function isPlaca(value: string): boolean {
  const text = value.trim().replace(/[-\s]/g, '').toUpperCase();
  return /^[A-Z]{3}\d{4}$/.test(text) || /^[A-Z]{3}\d[A-Z]\d{2}$/.test(text);
}

// Despacho por nome ------------------------------------------------------------------------------

export interface ValidateOptions extends DataOptions, TelefoneOptions {}

/** Valida pelo nome (`data-eds-validate` / `validate`). Valor vazio é válido: use `required`. */
export function validateBy(
  name: ValidatorName,
  value: string,
  options: ValidateOptions = {},
): boolean {
  if (value.trim() === '') return true;
  switch (name) {
    case 'cpf':
      return isCpf(value);
    case 'cnpj':
      return isCnpj(value);
    case 'cpf-cnpj':
      return isCpfOuCnpj(value);
    case 'cep':
      return isCep(value);
    case 'telefone':
      return isTelefone(value, options);
    case 'email':
      return isEmail(value);
    case 'pis':
      return isPis(value);
    case 'titulo':
      return isTituloEleitor(value);
    case 'placa':
      return isPlaca(value);
    case 'data':
      return isDataValida(value, options);
  }
}
