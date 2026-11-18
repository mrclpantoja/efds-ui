/** Validação entre arquivos: referências, duplicatas por seletor e ciclos. Funções puras. */

import type { TokenFile, TokenIssue } from './parse.ts';

export const REFERENCE = /\{([^{}]*)\}/g;

export function referencesOf(value: string): string[] {
  return [...value.matchAll(REFERENCE)].map((match) => match[1] as string);
}

export function validateFiles(files: TokenFile[]): TokenIssue[] {
  const issues: TokenIssue[] = [];
  const known = new Set<string>();
  for (const file of files) for (const [key] of file.tokens) known.add(key);

  // Mesma chave duas vezes no mesmo seletor (arquivos diferentes) gera CSS ambíguo.
  const definedIn = new Map<string, string>();
  for (const file of files) {
    for (const [key] of file.tokens) {
      const id = `${file.selector}|${key}`;
      const first = definedIn.get(id);
      if (first === undefined) {
        definedIn.set(id, file.path);
      } else if (first !== file.path) {
        issues.push({
          file: file.path,
          key,
          message: `chave duplicada no seletor ${file.selector}; já definida em ${first}.`,
        });
      }
    }
  }

  const edges = new Map<string, Set<string>>();
  for (const file of files) {
    for (const [key, value] of file.tokens) {
      for (const ref of referencesOf(value)) {
        if (!known.has(ref)) {
          issues.push({
            file: file.path,
            key,
            message: `referência {${ref}} não existe em nenhum arquivo de tokens.`,
          });
          continue;
        }
        const targets = edges.get(key) ?? new Set<string>();
        targets.add(ref);
        edges.set(key, targets);
      }
    }
  }

  issues.push(...findCycles(files, edges));
  return issues;
}

function findCycles(files: TokenFile[], edges: Map<string, Set<string>>): TokenIssue[] {
  const owner = new Map<string, string>();
  for (const file of files) {
    for (const [key] of file.tokens) if (!owner.has(key)) owner.set(key, file.path);
  }

  const issues: TokenIssue[] = [];
  const state = new Map<string, 'visiting' | 'done'>();
  const stack: string[] = [];

  const visit = (key: string): void => {
    if (state.get(key) === 'done') return;
    if (state.get(key) === 'visiting') {
      const loop = [...stack.slice(stack.indexOf(key)), key].join(' → ');
      issues.push({
        file: owner.get(key) ?? '(desconhecido)',
        key,
        message: `referência circular: ${loop}.`,
      });
      return;
    }
    state.set(key, 'visiting');
    stack.push(key);
    for (const next of edges.get(key) ?? []) visit(next);
    stack.pop();
    state.set(key, 'done');
  };

  for (const key of edges.keys()) visit(key);
  return issues;
}
