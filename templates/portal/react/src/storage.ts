/** Armazenamento do navegador, sempre com try/catch (modo privado e dados bloqueados). */

export function readStored(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStored(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* sem armazenamento: a preferência vale só nesta página */
  }
}

const KEY_PROTOCOLS = 'portal:protocolos';

export interface StoredProtocol {
  number: string;
  service: string;
  opened: string;
}

export function storedProtocols(): StoredProtocol[] {
  try {
    const list: unknown = JSON.parse(readStored(KEY_PROTOCOLS) ?? '[]');
    return Array.isArray(list) ? (list as StoredProtocol[]) : [];
  } catch {
    return [];
  }
}

export function saveProtocol(item: StoredProtocol): void {
  writeStored(KEY_PROTOCOLS, JSON.stringify([...storedProtocols(), item]));
}

/** Número fictício no formato 0000000-00.0000.0.00.0000 (máscara `processo`). */
export function newProtocolNumber(): string {
  const digits = (n: number) =>
    Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join('');
  return `${digits(7)}-${digits(2)}.2026.1.01.0001`;
}
