import { deflateSync } from 'node:zlib';

/** Tabela do CRC-32 exigida pelos blocos PNG. */
const CRC = (() => {
  const tabela = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    tabela[n] = c >>> 0;
  }
  return tabela;
})();

function crc32(dados: Buffer): number {
  let c = 0xffffffff;
  for (const byte of dados) c = (CRC[(c ^ byte) & 0xff] ?? 0) ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function bloco(tipo: string, dados: Buffer): Buffer {
  const cabeca = Buffer.alloc(4);
  cabeca.writeUInt32BE(dados.length);
  const corpo = Buffer.concat([Buffer.from(tipo, 'ascii'), dados]);
  const rodape = Buffer.alloc(4);
  rodape.writeUInt32BE(crc32(corpo));
  return Buffer.concat([cabeca, corpo, rodape]);
}

/**
 * PNG sintético (degradê RGB determinístico), sem arquivo no repositório e sem dependência.
 * Serve de "foto" fictícia para o cortador de imagem.
 */
export function criarPng(largura: number, altura: number): Buffer {
  const linhas: Buffer[] = [];
  for (let y = 0; y < altura; y += 1) {
    const linha = Buffer.alloc(1 + largura * 3); // byte de filtro 0 + pixels RGB
    for (let x = 0; x < largura; x += 1) {
      linha[1 + x * 3] = Math.round((x / largura) * 255);
      linha[2 + x * 3] = Math.round((y / altura) * 255);
      linha[3 + x * 3] = 160;
    }
    linhas.push(linha);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(largura, 0);
  ihdr.writeUInt32BE(altura, 4);
  ihdr[8] = 8; // 8 bits por canal
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloco('IHDR', ihdr),
    bloco('IDAT', deflateSync(Buffer.concat(linhas))),
    bloco('IEND', Buffer.alloc(0)),
  ]);
}
