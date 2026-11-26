/**
 * Orçamento de tamanho dos pacotes: mede o gzip dos arquivos de `dist/` e compara com os limites
 * versionados em `size-limits.json`. Sem dependência (só `node:zlib`). Roda depois de `pnpm build`.
 *
 *   node scripts/check-size.ts            confere; sai com erro se algum arquivo passar do limite
 *   node scripts/check-size.ts --write    regrava os limites: tamanho atual + 10% de folga
 *
 * Duas medidas por pacote:
 *   - arquivos que o consumidor carrega direto (IIFE, CSS agregado, ponto de entrada ESM);
 *   - "total": soma do gzip de cada arquivo .js/.css do `dist/` (cada um comprimido separado,
 *     como o navegador baixa). Pega o crescimento de módulos e chunks que nenhuma entrada isolada mostra.
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import process from 'node:process';
import { gzipSync } from 'node:zlib';

const root = join(import.meta.dirname, '..');
const LIMITS_FILE = join(root, 'size-limits.json');
/** Folga aplicada sobre o tamanho atual ao regravar os limites. */
const FOLGA = 0.1;

/** Arquivos medidos individualmente, por pacote (caminhos relativos a `packages/<pacote>/dist`). */
const ARQUIVOS: Record<string, string[]> = {
  core: ['index.css'],
  themes: ['index.css'],
  behavior: ['eds-behavior.js', 'eds-behavior-core.js', 'index.js'],
  editor: ['eds-editor.js', 'index.js'],
  react: ['index.js'],
  icons: ['index.js'],
};

interface Limites {
  /** Texto de apoio para quem abrir o arquivo. */
  _comentario: string;
  /** Limite de gzip em bytes, por chave `pacote/arquivo` ou `pacote (total)`. */
  limites: Record<string, number>;
}

function listar(pasta: string): string[] {
  const achados: string[] = [];
  for (const nome of readdirSync(pasta)) {
    const caminho = join(pasta, nome);
    if (statSync(caminho).isDirectory()) achados.push(...listar(caminho));
    else if (/\.(js|mjs|css)$/.test(nome)) achados.push(caminho);
  }
  return achados;
}

const gzip = (arquivo: string): number => gzipSync(readFileSync(arquivo), { level: 9 }).length;

/** Mede tudo o que o orçamento acompanha: { chave → bytes gzip }. */
function medir(): Record<string, number> {
  const medidas: Record<string, number> = {};
  for (const [pacote, arquivos] of Object.entries(ARQUIVOS)) {
    const dist = join(root, 'packages', pacote, 'dist');
    if (!existsSync(dist)) {
      console.error(`packages/${pacote}/dist ausente: rode "pnpm build" antes.`);
      process.exit(1);
    }
    for (const arquivo of arquivos) {
      const caminho = join(dist, arquivo);
      if (!existsSync(caminho)) {
        console.error(
          `${relative(root, caminho)} ausente: o build mudou? Ajuste scripts/check-size.ts.`,
        );
        process.exit(1);
      }
      medidas[`${pacote}/${arquivo}`] = gzip(caminho);
    }
    medidas[`${pacote} (total)`] = listar(dist).reduce((soma, f) => soma + gzip(f), 0);
  }
  return medidas;
}

const kb = (bytes: number) => `${(bytes / 1024).toFixed(1)} kB`;

const medidas = medir();

if (process.argv.includes('--write')) {
  const limites: Record<string, number> = {};
  for (const [chave, bytes] of Object.entries(medidas)) {
    // Arredonda para cima, a múltiplos de 10 bytes, para o arquivo não oscilar à toa.
    limites[chave] = Math.ceil((bytes * (1 + FOLGA)) / 10) * 10;
  }
  const conteudo: Limites = {
    _comentario:
      'Limites de gzip (bytes) por arquivo de dist/ e total por pacote. Gerado por "node scripts/check-size.ts --write" (tamanho atual + 10%). Subir um limite é decisão de revisão: explique no PR.',
    limites,
  };
  writeFileSync(LIMITS_FILE, `${JSON.stringify(conteudo, null, 2)}\n`);
  console.log(
    `Limites gravados em ${relative(root, LIMITS_FILE)} (${Object.keys(limites).length} entradas).`,
  );
  process.exit(0);
}

if (!existsSync(LIMITS_FILE)) {
  console.error('size-limits.json ausente: rode "node scripts/check-size.ts --write".');
  process.exit(1);
}
const { limites } = JSON.parse(readFileSync(LIMITS_FILE, 'utf8')) as Limites;

let falhas = 0;
const largura = Math.max(...Object.keys(medidas).map((c) => c.length));
for (const [chave, bytes] of Object.entries(medidas)) {
  const limite = limites[chave];
  if (limite === undefined) {
    console.error(`FALTA  ${chave.padEnd(largura)}  ${kb(bytes)}  sem limite em size-limits.json`);
    falhas += 1;
    continue;
  }
  const ok = bytes <= limite;
  if (!ok) falhas += 1;
  console.log(
    `${ok ? 'ok    ' : 'ACIMA '} ${chave.padEnd(largura)}  ${kb(bytes).padStart(9)} de ${kb(limite).padStart(9)}  (${Math.round((bytes / limite) * 100)}%)`,
  );
}
for (const chave of Object.keys(limites)) {
  if (!(chave in medidas)) {
    console.error(`SOBRA  ${chave}: limite de um arquivo que não é mais medido; remova-o.`);
    falhas += 1;
  }
}

if (falhas > 0) {
  console.error(
    `\n${falhas} problema(s) no orçamento de tamanho. Reduza o bundle ou, se o crescimento é intencional, rode "node scripts/check-size.ts --write" e explique no PR.`,
  );
  process.exit(1);
}
console.log('\nOrçamento de tamanho respeitado.');
