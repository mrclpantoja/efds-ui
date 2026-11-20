/**
 * Núcleo da máscara de entrada: funções puras, sem DOM. Usado pelo behavior (HTML por atributos)
 * e pelo `@eds-ui/react` (subcaminho `@eds-ui/behavior/mask`), para os dois se comportarem igual.
 *
 * Modelo: do texto do campo se extraem os caracteres significativos (os que o usuário digitou de
 * fato: dígitos, letras) e o texto mascarado é sempre reescrito a partir deles. O cursor é
 * recolocado pelo número de significativos que havia antes dele (ou, na moeda, depois dele).
 * Os literais da máscara entram quando o próximo caractere é digitado, nunca sobram no fim.
 * A máscara não valida: dígito verificador, datas e limites ficam com `required`/`pattern`/servidor.
 */

export type MaskName = 'telefone' | 'cpf' | 'cnpj' | 'cpf-cnpj' | 'cep' | 'moeda' | 'numero';

export const MASK_NAMES: readonly MaskName[] = [
  'telefone',
  'cpf',
  'cnpj',
  'cpf-cnpj',
  'cep',
  'moeda',
  'numero',
];

export interface MaskOptions {
  /** Casas decimais de `moeda`/`numero`. Padrão 2 (0 a 8). */
  decimals?: number;
  /** Símbolo antes do valor. Padrão `"R$ "` na moeda e vazio no número. */
  prefix?: string;
  /** Aceita valor negativo (tecla "-"). */
  negative?: boolean;
}

export type MaskInputMode = 'tel' | 'numeric' | 'decimal' | 'text';

export interface MaskEditInput {
  /** Texto do campo depois da edição do usuário (ainda sem máscara). */
  text: string;
  /** Posição do cursor em `text`. */
  caret: number;
  /** Texto do campo antes da edição (o último valor já mascarado). Habilita apagar literal. */
  prev?: string;
  /** Tipo de edição, do `inputType` do evento `input`. */
  inputType?: string;
}

export interface MaskEditResult {
  /** Texto mascarado. */
  value: string;
  /** Só os caracteres significativos (moeda/número: `"-1234.56"`). */
  raw: string;
  /** Nova posição do cursor. */
  caret: number;
}

export interface Mask {
  /** Nome da máscara pronta ou `"custom"`. */
  readonly name: string;
  /** Tamanho máximo do texto mascarado; `undefined` na moeda e no número. */
  readonly maxLength: number | undefined;
  readonly inputMode: MaskInputMode;
  /** Valor de `autocomplete` sugerido (só onde existe token adequado). */
  readonly autocomplete: string | undefined;
  /** Mascara um valor vindo de fora (atributo `value`, estado do React). */
  format(text: string): string;
  /** Só os caracteres significativos de um texto (mascarado ou não). */
  unmask(text: string): string;
  /** Uma edição do usuário: devolve o texto mascarado e o cursor. */
  edit(input: MaskEditInput): MaskEditResult;
  /** Colar `pasted` no lugar da seleção `[start, end)` de `current`. */
  paste(current: string, start: number, end: number, pasted: string): MaskEditResult;
}

// ---- Tipos internos --------------------------------------------------------------------------

/** Caracteres significativos e a posição de cada um no texto original. */
interface Extracted {
  sig: string;
  idx: number[];
}

interface Kind {
  readonly maxLength: number | undefined;
  /** O cursor é recolocado contando significativos antes (`start`) ou depois (`end`). */
  readonly anchor: 'start' | 'end';
  extract(text: string): Extracted;
  render(sig: string): string;
  raw(sig: string): string;
  /** Posição do cursor no texto renderizado. */
  caret(value: string, sig: string, before: number): number;
  /** Interpreta um valor de fora (colar, atributo). `null` = não reconhece. */
  fromText?(text: string, replacingAll: boolean): string | null;
  /** Apagando: ajusta os significativos (ex.: moeda zerada vira vazia). */
  afterDelete?(sig: string): string;
}

// ---- Padrões (0, A, *) -----------------------------------------------------------------------

type SlotKind = '0' | 'A' | '*';
type Token = { slot: SlotKind } | { literal: string };

/** `0` dígito, `A` letra, `*` letra ou dígito; `\` torna o próximo caractere literal. */
function parsePattern(pattern: string): Token[] {
  const tokens: Token[] = [];
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern.charAt(i);
    if (ch === '\\' && i + 1 < pattern.length) {
      i += 1;
      tokens.push({ literal: pattern.charAt(i) });
    } else if (ch === '0' || ch === 'A' || ch === '*') {
      tokens.push({ slot: ch });
    } else {
      tokens.push({ literal: ch });
    }
  }
  return tokens;
}

/** Letra sem acento em maiúscula, ou `''` quando não é letra A–Z. */
function letterOf(ch: string): string {
  const base = ch.normalize('NFD').replace(/\p{M}/gu, '');
  return /^[A-Za-z]$/.test(base) ? base.toUpperCase() : '';
}

/** O caractere normalizado que o espaço aceita, ou `''`. */
function accept(slot: SlotKind, ch: string): string {
  if (slot === '0') return /^[0-9]$/.test(ch) ? ch : '';
  const letter = letterOf(ch);
  if (slot === 'A') return letter;
  return letter || (/^[0-9]$/.test(ch) ? ch : '');
}

function slotsOf(tokens: Token[]): SlotKind[] {
  const slots: SlotKind[] = [];
  for (const token of tokens) if ('slot' in token) slots.push(token.slot);
  return slots;
}

/** Escolhe o padrão pelo conteúdo (telefone e CPF/CNPJ alternam). */
type PatternPicker = (loose: string) => Token[];

function patternKind(pick: PatternPicker, looseOf: (text: string) => string, max: number): Kind {
  const extract = (text: string): Extracted => {
    const tokens = pick(looseOf(text));
    const total = slotsOf(tokens).length;
    let sig = '';
    const idx: number[] = [];
    let t = 0;
    for (let i = 0; i < text.length && sig.length < total; i++) {
      const ch = text.charAt(i);
      // Literal já presente no texto (o que a máscara escreveu): não é significativo.
      let literal = false;
      for (;;) {
        const token = tokens[t];
        if (!token || !('literal' in token)) break;
        t += 1;
        if (token.literal === ch) {
          literal = true;
          break;
        }
      }
      if (literal) continue;
      const token = tokens[t];
      if (!token || !('slot' in token)) break;
      const ok = accept(token.slot, ch);
      if (ok) {
        sig += ok;
        idx.push(i);
        t += 1;
      }
    }
    return { sig, idx };
  };
  return {
    maxLength: max,
    anchor: 'start',
    extract,
    render(sig) {
      const tokens = pick(looseOf(sig));
      let out = '';
      let pending = '';
      let used = 0;
      let complete = true;
      for (const token of tokens) {
        if ('literal' in token) {
          pending += token.literal;
        } else if (used < sig.length) {
          out += pending + sig.charAt(used);
          pending = '';
          used += 1;
        } else {
          complete = false;
          break;
        }
      }
      return complete ? out + pending : out;
    },
    raw: (sig) => sig,
    caret(value, _sig, before) {
      if (before <= 0) return 0;
      const { idx } = extract(value);
      const last = idx[Math.min(before, idx.length) - 1];
      return last === undefined ? value.length : last + 1;
    },
  };
}

const PHONE_8 = parsePattern('(00) 0000-0000');
const PHONE_9 = parsePattern('(00) 00000-0000');
const CPF = parsePattern('000.000.000-00');
const CNPJ = parsePattern('**.***.***/****-00');
const CEP = parsePattern('00000-000');

const digitsOf = (text: string) => text.replace(/\D/g, '');
const alnumOf = (text: string) =>
  [...text]
    .map((ch) => accept('*', ch))
    .filter(Boolean)
    .join('');

const phoneKind = (): Kind => {
  const base = patternKind((loose) => (loose.length > 10 ? PHONE_9 : PHONE_8), digitsOf, 15);
  return {
    ...base,
    // Colar "+55 (11) 98765-4321" no campo todo: o código do país não cabe no número.
    fromText(text, replacingAll) {
      const digits = digitsOf(text);
      if (!replacingAll || digits.length < 12 || !digits.startsWith('55')) return null;
      return digits.slice(2, 13);
    },
  };
};

const cpfCnpjPick: PatternPicker = (loose) => (/^\d{0,11}$/.test(loose) ? CPF : CNPJ);

function customKind(pattern: string): { kind: Kind; inputMode: MaskInputMode } {
  const tokens = parsePattern(pattern);
  const slots = slotsOf(tokens);
  const loose = (text: string) => text;
  return {
    kind: patternKind(() => tokens, loose, tokens.length),
    inputMode: slots.length > 0 && slots.every((s) => s === '0') ? 'numeric' : 'text',
  };
}

// ---- Moeda e número --------------------------------------------------------------------------

const MAX_DIGITS = 18;

function numberKind(decimals: number, prefix: string, negative: boolean): Kind {
  const stripZeros = (digits: string) => digits.replace(/^0+/, '');
  const split = (sig: string) => ({
    neg: sig.endsWith('-'),
    digits: sig.endsWith('-') ? sig.slice(0, -1) : sig,
  });
  const body = (digits: string) => {
    const padded = stripZeros(digits).padStart(decimals + 1, '0');
    return { int: padded.slice(0, padded.length - decimals), frac: padded.slice(-decimals) };
  };
  const group = (int: string) => int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const signOf = (text: string) => negative && (text.match(/-/g)?.length ?? 0) % 2 === 1;
  return {
    maxLength: undefined,
    anchor: 'end',
    extract(text) {
      let digits = '';
      const idx: number[] = [];
      for (let i = 0; i < text.length && digits.length < MAX_DIGITS; i++) {
        const ch = text.charAt(i);
        if (ch >= '0' && ch <= '9') {
          digits += ch;
          idx.push(i);
        }
      }
      return { sig: signOf(text) ? `${digits}-` : digits, idx };
    },
    render(sig) {
      const { neg, digits } = split(sig);
      if (digits === '') return neg ? '-' : '';
      const { int, frac } = body(digits);
      return `${neg ? '-' : ''}${prefix}${group(int)}${decimals > 0 ? `,${frac}` : ''}`;
    },
    raw(sig) {
      const { neg, digits } = split(sig);
      if (digits === '') return '';
      const { int, frac } = body(digits);
      const zero = /^0*$/.test(int + frac);
      return `${neg && !zero ? '-' : ''}${int}${decimals > 0 ? `.${frac}` : ''}`;
    },
    caret(value, sig, before) {
      let after = split(sig).digits.length - before;
      let i = value.length;
      while (after > 0 && i > 0) {
        i -= 1;
        if (/\d/.test(value.charAt(i))) after -= 1;
      }
      return i;
    },
    afterDelete(sig) {
      const { neg, digits } = split(sig);
      return digits !== '' && /^0*$/.test(digits) ? (neg ? '-' : '') : sig;
    },
    // Valor de fora ("1234.56", "1.234,56", "R$ 1.234,56", "-5"): é um número, não centavos.
    fromText(text) {
      const cleaned = text.replace(/[^\d.,-]/g, '');
      if (!/\d/.test(cleaned)) return null;
      const neg = negative && cleaned.includes('-');
      const num = cleaned.replace(/-/g, '');
      let int: string;
      let frac = '';
      const comma = num.lastIndexOf(',');
      const dots = num.split('.').length - 1;
      if (comma >= 0) {
        int = digitsOf(num.slice(0, comma));
        frac = digitsOf(num.slice(comma + 1));
      } else if (dots === 1) {
        const [head = '', tail = ''] = num.split('.');
        // "1.234" com 2 casas é milhar; "1234.5" e "1234.56" são decimais.
        if (tail.length > 0 && tail.length <= decimals && (tail.length !== 3 || decimals === 3)) {
          int = head;
          frac = tail;
        } else {
          int = digitsOf(num);
        }
      } else {
        int = digitsOf(num);
      }
      const digits = (int + frac.padEnd(decimals, '0').slice(0, decimals)).slice(0, MAX_DIGITS);
      return neg ? `${digits}-` : digits;
    },
  };
}

// ---- Fábrica ---------------------------------------------------------------------------------

function clampDecimals(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return 2;
  return Math.min(8, Math.max(0, Math.trunc(value)));
}

export function isMaskName(value: string): value is MaskName {
  return (MASK_NAMES as readonly string[]).includes(value);
}

/**
 * Cria uma máscara pelo nome (`telefone`, `cpf`, `cnpj`, `cpf-cnpj`, `cep`, `moeda`, `numero`)
 * ou por um padrão personalizado: `0` dígito, `A` letra (vira maiúscula), `*` letra ou dígito,
 * `\` para um literal que seria espaço (`\0`); o resto é literal.
 */
export function createMask(spec: string, options: MaskOptions = {}): Mask {
  let kind: Kind;
  let name: string = spec;
  let inputMode: MaskInputMode = 'numeric';
  let autocomplete: string | undefined;
  switch (spec) {
    case 'telefone':
      kind = phoneKind();
      inputMode = 'tel';
      autocomplete = 'tel';
      break;
    case 'cpf':
      kind = patternKind(() => CPF, digitsOf, 14);
      break;
    case 'cnpj':
      kind = patternKind(() => CNPJ, alnumOf, 18);
      inputMode = 'text';
      break;
    case 'cpf-cnpj':
      kind = patternKind(cpfCnpjPick, alnumOf, 18);
      inputMode = 'text';
      break;
    case 'cep':
      kind = patternKind(() => CEP, digitsOf, 9);
      autocomplete = 'postal-code';
      break;
    case 'moeda':
    case 'numero': {
      const decimals = clampDecimals(options.decimals);
      const negative = options.negative === true;
      kind = numberKind(decimals, options.prefix ?? (spec === 'moeda' ? 'R$ ' : ''), negative);
      inputMode = negative ? 'text' : decimals > 0 ? 'decimal' : 'numeric';
      break;
    }
    default: {
      const custom = customKind(spec);
      kind = custom.kind;
      inputMode = custom.inputMode;
      name = 'custom';
    }
  }

  const finish = (sig: string, before: number): MaskEditResult => {
    const value = kind.render(sig);
    return { value, raw: kind.raw(sig), caret: kind.caret(value, sig, before) };
  };

  const mask: Mask = {
    name,
    maxLength: kind.maxLength,
    inputMode,
    autocomplete,
    format(text) {
      const sig = kind.fromText?.(text, true) ?? kind.extract(text).sig;
      return kind.render(sig);
    },
    unmask(text) {
      return kind.raw(kind.extract(text).sig);
    },
    edit({ text, caret, prev, inputType }) {
      const { sig, idx } = kind.extract(text);
      let chars = sig;
      let before = idx.filter((i) => i < caret).length;
      const deleting = inputType?.startsWith('delete') === true;
      // Só um literal foi apagado: o texto mascarado seria o mesmo e o Backspace parecia travado.
      // Apaga o significativo vizinho (antes do cursor no Backspace, depois no Delete).
      if (deleting && prev !== undefined && sig === kind.extract(prev).sig) {
        if (inputType === 'deleteContentBackward' && before > 0) {
          chars = chars.slice(0, before - 1) + chars.slice(before);
          before -= 1;
        } else if (inputType === 'deleteContentForward' && before < idx.length) {
          chars = chars.slice(0, before) + chars.slice(before + 1);
        }
      }
      if (deleting && kind.afterDelete) chars = kind.afterDelete(chars);
      return finish(chars, Math.min(before, chars.length));
    },
    paste(current, start, end, pasted) {
      const replacingAll = start <= 0 && end >= current.length;
      const direct = kind.fromText?.(pasted, replacingAll);
      if (direct !== null && direct !== undefined) return finish(direct, direct.length);
      if (kind.anchor === 'end') {
        // Moeda: texto sem número algum não muda nada.
        return mask.edit({ text: current, caret: end });
      }
      const text = current.slice(0, start) + pasted + current.slice(end);
      return mask.edit({ text, caret: start + pasted.length });
    },
  };
  return mask;
}
