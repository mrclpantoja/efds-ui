/*
 * Varredura do site: zero `style=` / `style={` e zero cor literal no CSS próprio.
 * Uso: pnpm --filter @eds-ui/docs check:visual
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const src = join(root, 'src');

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const files = walk(src);
const problems = [];

for (const file of files) {
  const text = readFileSync(file, 'utf8');
  const name = relative(root, file);
  if (/\.(tsx|html)$/.test(file) && /\bstyle\s*=/.test(text)) {
    problems.push(`${name}: atributo style`);
  }
  if (file.endsWith('.css')) {
    const code = text.replace(/\/\*[\s\S]*?\*\//g, '');
    const color = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(/;
    code.split('\n').forEach((line, index) => {
      if (color.test(line)) problems.push(`${name}:${index + 1}: cor literal: ${line.trim()}`);
    });
  }
}

if (problems.length > 0) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`check:visual ok (${files.length} arquivos varridos: zero style= e zero cor literal)`);
