/**
 * Junta os textos padrão (pt-BR) com os que o consumidor trocou. Chaves `undefined` no objeto
 * parcial não apagam o padrão.
 */
export function mergeTexts<T extends object>(defaults: T, partial?: Partial<T>): T {
  const result = { ...defaults };
  if (partial) {
    for (const key of Object.keys(partial) as (keyof T)[]) {
      const value = partial[key];
      if (value !== undefined) result[key] = value as T[keyof T];
    }
  }
  return result;
}
