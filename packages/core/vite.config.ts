import { readdirSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';

// Declaração de ordem das camadas: todo CSS isolado começa com ela, para que a
// cascata não dependa da ordem de import do consumidor.
const LAYER_ORDER = '@layer eds.reset,eds.tokens,eds.base,eds.layout,eds.components,eds.utilities;';

const cssIn = (dir: string): string[] =>
  readdirSync(`src/${dir}`)
    .filter((file) => file.endsWith('.css'))
    .map((file) => file.slice(0, -4))
    .sort();

// Entradas descobertas por glob: index (tudo), tokens, base, layout/*, components/*.
const input: Record<string, string> = {
  index: 'src/index.css',
  tokens: 'src/tokens.css',
  base: 'src/base.css',
};
for (const dir of ['layout', 'components']) {
  for (const name of cssIn(dir)) input[`${dir}/${name}`] = `src/${dir}/${name}.css`;
}

// Garante a declaração de camadas no início de cada CSS emitido.
const layerOrder = (): Plugin => ({
  name: 'eds-layer-order',
  generateBundle(_options, bundle) {
    for (const file of Object.values(bundle)) {
      if (file.type !== 'asset' || !file.fileName.endsWith('.css')) continue;
      const css = String(file.source);
      if (!css.startsWith(LAYER_ORDER)) file.source = LAYER_ORDER + css;
    }
  },
});

// CSS puro, sem runtime: cada entrada vira um arquivo em dist/ (mesmo caminho relativo).
export default defineConfig({
  plugins: [layerOrder()],
  build: {
    rolldownOptions: {
      input,
      output: { assetFileNames: '[name][extname]' },
    },
  },
});
