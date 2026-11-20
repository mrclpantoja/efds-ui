/**
 * Regras puras dos campos da onda C (sem DOM): força da senha, distribuição do código OTP e
 * aritmética do NumberInput. Usadas pelo behavior (HTML por atributos) e pelo `@eds-ui/react`
 * (subcaminho `@eds-ui/behavior/fields`), para os dois se comportarem igual.
 */

// ---- Senha -----------------------------------------------------------------------------------

export type PasswordRuleId = 'length' | 'lower' | 'upper' | 'digit' | 'symbol';

export const PASSWORD_RULE_IDS: readonly PasswordRuleId[] = [
  'length',
  'lower',
  'upper',
  'digit',
  'symbol',
];

export type PasswordLevel = 0 | 1 | 2 | 3 | 4;

export interface PasswordCheck {
  /** 0 só para senha vazia; 1 fraca, 2 razoável, 3 boa, 4 forte. */
  level: PasswordLevel;
  /** Cada regra atendida ou não. */
  rules: Record<PasswordRuleId, boolean>;
}

const COMMON = ['senha', 'password', 'qwerty', 'admin', 'abc123', 'letmein', 'mudar'];

/** Três ou mais caracteres seguidos iguais ("aaa") ou em sequência ("abc", "321"). */
function hasRepeatOrSequence(value: string): boolean {
  if (/(.)\1{2,}/.test(value)) return true;
  const lower = value.toLowerCase();
  for (let i = 0; i + 2 < lower.length; i++) {
    const a = lower.charCodeAt(i);
    const b = lower.charCodeAt(i + 1);
    const c = lower.charCodeAt(i + 2);
    if ((b - a === 1 && c - b === 1) || (a - b === 1 && b - c === 1)) return true;
  }
  return false;
}

/**
 * Força de uma senha por heurística local (nada é enviado a lugar nenhum): comprimento, classes
 * de caracteres, repetição/sequência e palavras comuns. É uma ajuda, não uma garantia: a política
 * de senhas vale no servidor.
 */
export function checkPassword(value: string, minLength = 8): PasswordCheck {
  const min = Math.max(1, Math.trunc(minLength) || 8);
  const rules: Record<PasswordRuleId, boolean> = {
    length: value.length >= min,
    lower: /\p{Ll}/u.test(value),
    upper: /\p{Lu}/u.test(value),
    digit: /\d/.test(value),
    symbol: /[^\p{L}\d]/u.test(value),
  };
  if (value === '') return { level: 0, rules };
  const classes = [rules.lower, rules.upper, rules.digit, rules.symbol].filter(Boolean).length;
  let score = 0;
  if (value.length >= min) score += 1;
  if (value.length >= Math.max(12, min + 4)) score += 1;
  if (classes >= 3) score += 1;
  if (classes === 4 && value.length >= 10) score += 1;
  else if (value.length >= 16) score += 1;
  const lower = value.toLowerCase();
  const weak = hasRepeatOrSequence(value) || COMMON.some((word) => lower.includes(word));
  if (weak) score -= 1;
  if (value.length < min) score = Math.min(score, 1);
  const level = Math.min(4, Math.max(1, score)) as PasswordLevel;
  return { level, rules };
}

// ---- OTP -------------------------------------------------------------------------------------

export type OtpKind = 'numeric' | 'alphanumeric';

/** Só os caracteres aceitos: dígitos, ou letras e dígitos (letras viram maiúsculas). */
export function otpSanitize(text: string, kind: OtpKind = 'numeric'): string {
  const pattern = kind === 'numeric' ? /\d/ : /[\p{L}\d]/u;
  return [...text]
    .filter((ch) => pattern.test(ch))
    .map((ch) => (kind === 'numeric' ? ch : ch.toUpperCase()))
    .join('');
}

/**
 * Distribui `text` (digitado, colado ou do preenchimento do SMS) a partir da célula `start`.
 * Devolve as células e a posição da próxima a receber o foco.
 */
export function otpFill(
  cells: readonly string[],
  start: number,
  text: string,
  kind: OtpKind = 'numeric',
): { cells: string[]; next: number } {
  const chars = [...otpSanitize(text, kind)];
  const result = [...cells];
  let index = Math.max(0, start);
  for (const ch of chars) {
    if (index >= result.length) break;
    result[index] = ch;
    index += 1;
  }
  return { cells: result, next: Math.min(index, result.length - 1) };
}

// ---- NumberInput -----------------------------------------------------------------------------

export interface NumberRange {
  min?: number;
  max?: number;
}

/** Casas decimais de um passo ("0.25" -> 2). */
export function decimalsOf(step: number): number {
  const text = String(step);
  const dot = text.indexOf('.');
  return dot < 0 ? 0 : text.length - dot - 1;
}

export function clampNumber(value: number, { min, max }: NumberRange): number {
  let result = value;
  if (min !== undefined && result < min) result = min;
  if (max !== undefined && result > max) result = max;
  return result;
}

/** Arredonda a `decimals` casas sem o ruído do ponto flutuante (0.1 + 0.2). */
export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON * Math.sign(value)) * factor) / factor;
}

/**
 * Soma `steps` passos a `value` (vazio parte de 0 dentro da faixa), respeitando `min`, `max` e
 * as casas decimais de `decimals` (e do passo).
 */
export function stepNumber(
  value: number | null,
  steps: number,
  step: number,
  range: NumberRange,
  decimals: number,
): number {
  const base = value ?? clampNumber(0, range);
  const places = Math.max(decimals, decimalsOf(step));
  // Valor vazio + subir/descer: o primeiro passo só leva ao valor inicial dentro da faixa.
  if (value === null && range.min !== undefined && steps > 0) return roundTo(range.min, places);
  return roundTo(clampNumber(base + steps * step, range), places);
}

// ---- Lookup ----------------------------------------------------------------------------------

export interface LookupItem {
  code: string;
  description: string;
  /** O objeto original (para colunas extras e para `detail.item`). */
  raw: Record<string, unknown>;
}

const pick = (o: Record<string, unknown>, keys: string[]): string => {
  for (const key of keys) {
    const v = o[key];
    if (v !== undefined && v !== null && String(v) !== '') return String(v);
  }
  return '';
};

/** Aceita `code`/`description` ou os nomes mais comuns (`codigo`, `id`, `descricao`, `nome`...). */
export function toLookupItem(value: unknown): LookupItem | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const code = pick(raw, ['code', 'codigo', 'id']);
  if (code === '') return null;
  return { code, description: pick(raw, ['description', 'descricao', 'nome', 'name']), raw };
}
