import { crc32 } from '../export/zip';

export interface ZipFile {
  name: string;
  /** Bytes do conteúdo (método STORE). */
  data: Uint8Array;
  text: string;
}

/**
 * Leitor mínimo de ZIP para os testes: confere assinaturas, método STORE, bit UTF-8, tamanhos e
 * CRC32 de cada entrada, lendo pelo diretório central.
 */
export function readZip(bytes: Uint8Array): ZipFile[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder('utf-8', { fatal: true });
  const eocd = bytes.length - 22;
  if (view.getUint32(eocd, true) !== 0x06054b50) throw new Error('EOCD ausente');
  const count = view.getUint16(eocd + 10, true);
  let pos = view.getUint32(eocd + 16, true);
  const files: ZipFile[] = [];
  for (let i = 0; i < count; i += 1) {
    if (view.getUint32(pos, true) !== 0x02014b50) throw new Error('diretório central inválido');
    const flags = view.getUint16(pos + 8, true);
    const method = view.getUint16(pos + 10, true);
    const crc = view.getUint32(pos + 16, true);
    const size = view.getUint32(pos + 24, true);
    const nameLen = view.getUint16(pos + 28, true);
    const offset = view.getUint32(pos + 42, true);
    const name = decoder.decode(bytes.subarray(pos + 46, pos + 46 + nameLen));
    if (method !== 0) throw new Error('método não é STORE');
    if ((flags & 0x0800) === 0) throw new Error('nome sem bit UTF-8');
    if (view.getUint32(offset, true) !== 0x04034b50) throw new Error('cabeçalho local inválido');
    const localNameLen = view.getUint16(offset + 26, true);
    const start = offset + 30 + localNameLen;
    const data = bytes.slice(start, start + size);
    if (crc32(data) !== crc) throw new Error(`CRC32 diferente em ${name}`);
    files.push({ name, data, text: decoder.decode(data) });
    pos += 46 + nameLen;
  }
  return files;
}
