/** Comparação entre o que o gerador produziria e o que existe em disco. Função pura. */

export interface OutputDiff {
  /** Arquivos que não existem ou diferem do esperado. */
  stale: string[];
  /** Arquivos gerados em disco cujo JSON de origem não existe mais. */
  orphans: string[];
}

/**
 * @param expected caminho → conteúdo esperado
 * @param existing caminho → conteúdo atual dos CSS gerados em disco (só os que têm o cabeçalho)
 */
export function diffOutputs(
  expected: Map<string, string>,
  existing: Map<string, string>,
): OutputDiff {
  const stale = [...expected]
    .filter(([path, content]) => existing.get(path) !== content)
    .map(([path]) => path);
  const orphans = [...existing.keys()].filter((path) => !expected.has(path));
  return { stale, orphans };
}
