/** Leitura e validação estrutural de um arquivo de tokens JSON. Funções puras. */

export interface TokenFile {
  /** Caminho relativo à raiz do repositório, com `/` (ex.: packages/core/tokens/primitives/colors.json). */
  path: string;
  selector: string;
  description?: string;
  /** Pares [chave, valor bruto] na ordem do arquivo. */
  tokens: Array<[string, string]>;
}

export interface TokenIssue {
  file: string;
  key?: string;
  message: string;
}

export interface ParseResult {
  file?: TokenFile;
  issues: TokenIssue[];
}

export const KEY_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const STRING_LITERAL = /"(?:[^"\\]|\\.)*"/g;

/**
 * JSON.parse descarta chaves repetidas em silêncio; num objeto plano de strings os literais
 * alternam chave/valor, então dá para listar as chaves na ordem do texto.
 */
function repeatedKeys(text: string): string[] {
  const literals = text.match(STRING_LITERAL) ?? [];
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (let i = 0; i < literals.length; i += 2) {
    const key = JSON.parse(literals[i] as string) as string;
    if (seen.has(key)) repeated.add(key);
    seen.add(key);
  }
  return [...repeated];
}

export function parseTokenFile(path: string, text: string): ParseResult {
  const issues: TokenIssue[] = [];
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { issues: [{ file: path, message: `JSON inválido: ${reason}` }] };
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return { issues: [{ file: path, message: 'o conteúdo deve ser um objeto JSON.' }] };
  }

  const record = data as Record<string, unknown>;
  const entries = Object.entries(record);
  const flat = entries.every(([, value]) => typeof value === 'string');
  if (flat) {
    for (const key of repeatedKeys(text)) {
      issues.push({ file: path, key, message: 'chave duplicada no mesmo arquivo.' });
    }
  }

  const selector = record['$selector'];
  if (typeof selector !== 'string' || selector.trim() === '') {
    issues.push({ file: path, key: '$selector', message: '"$selector" é obrigatório (string).' });
  }
  const description = record['$description'];
  if (description !== undefined && typeof description !== 'string') {
    issues.push({ file: path, key: '$description', message: '"$description" deve ser string.' });
  }

  const tokens: Array<[string, string]> = [];
  for (const [key, value] of entries) {
    if (key.startsWith('$')) continue;
    if (!KEY_PATTERN.test(key)) {
      issues.push({
        file: path,
        key,
        message: `chave inválida; use kebab-case (${KEY_PATTERN.source}).`,
      });
      continue;
    }
    if (typeof value !== 'string' || value.trim() === '') {
      issues.push({ file: path, key, message: 'o valor deve ser uma string não vazia.' });
      continue;
    }
    tokens.push([key, value]);
  }

  if (issues.length > 0) return { issues };
  const file: TokenFile = { path, selector: (selector as string).trim(), tokens };
  if (typeof description === 'string') file.description = description;
  return { file, issues };
}
