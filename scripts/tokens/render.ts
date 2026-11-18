/** Resolução de referências e geração do CSS. Funções puras. */

import type { TokenFile } from './parse.ts';
import { REFERENCE } from './validate.ts';

export const GENERATED_MARKER = 'Gerado por scripts/build-tokens.ts';

/** `{nome}` → `var(--eds-nome)`; o restante do valor é copiado literalmente. */
export function resolveValue(value: string): string {
  return value.replace(REFERENCE, (_, name: string) => `var(--eds-${name})`);
}

/**
 * Caminho do CSS gerado para um JSON de origem, ou `null` se o JSON não está numa pasta de tokens.
 * - packages/core/tokens/<pasta>/<nome>.json → packages/core/src/tokens/<pasta>-<nome>.css
 * - packages/themes/tokens/<nome>.json       → packages/themes/src/tokens/<nome>.css
 */
export function outputPathFor(sourcePath: string): string | null {
  const match = /^packages\/(core|themes)\/tokens\/(.+)\.json$/.exec(sourcePath);
  if (!match) return null;
  return `packages/${match[1]}/src/tokens/${(match[2] as string).split('/').join('-')}.css`;
}

function commentText(text: string): string {
  return text.replace(/\*\//g, '* /').replace(/\s+/g, ' ').trim();
}

/** Saída determinística: 2 espaços, LF, newline final; o Prettier a ignora. */
export function renderCss(file: TokenFile): string {
  const lines = [`/* ${GENERATED_MARKER} — não edite. Fonte: ${file.path} */`];
  if (file.description) lines.push(`/* ${commentText(file.description)} */`);
  // O gerador é a fonte do formato: o Prettier não reformata (aspas, caixa de hex, quebras).
  lines.push('', '/* prettier-ignore */', '@layer eds.tokens {', `  ${file.selector} {`);
  for (const [key, value] of file.tokens) {
    lines.push(`    --eds-${key}: ${resolveValue(value)};`);
  }
  lines.push('  }', '}', '');
  return lines.join('\n');
}

/** Mapa caminho de saída → conteúdo, na ordem dos arquivos de entrada. */
export function buildOutputs(files: TokenFile[]): Map<string, string> {
  const outputs = new Map<string, string>();
  for (const file of files) {
    const target = outputPathFor(file.path);
    if (target === null) continue;
    outputs.set(target, renderCss(file));
  }
  return outputs;
}
