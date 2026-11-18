export type ClassValue = string | false | null | undefined;

/** Junta nomes de classe, ignorando valores falsy. */
export function cx(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ');
}
