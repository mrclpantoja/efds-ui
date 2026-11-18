import { readdirSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';

// Mesma declaração de ordem das camadas do core: cada CSS isolado a repete no início.
const LAYER_ORDER = '@layer eds.reset,eds.tokens,eds.base,eds.layout,eds.components,eds.utilities;';

// Entradas: index (todos os eixos) + um arquivo por eixo-valor (src/tokens/<eixo>-<valor>.css),
// descobertos por glob e emitidos em dist/<eixo>-<valor>.css.
const input: Record<string, string> = { index: 'src/index.css' };
for (const file of readdirSync('src/tokens')
  .filter((f) => f.endsWith('.css'))
  .sort()) {
  input[file.slice(0, -4)] = `src/tokens/${file}`;
}

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

// CSS puro, sem runtime.
export default defineConfig({
  plugins: [layerOrder()],
  build: {
    rolldownOptions: {
      input,
      output: { assetFileNames: '[name][extname]' },
    },
  },
});
