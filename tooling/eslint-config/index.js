import js from '@eslint/js';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      'documentos do projeto/**',
      'templates/*/html/vendor/**',
    ],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended, jsxA11y.flatConfigs.recommended],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['**/*.{js,mjs,cjs}', '**/*.config.{ts,mts}'],
    languageOptions: { globals: globals.node },
  },
  {
    // Páginas HTML dos templates: scripts clássicos no navegador (sem módulos).
    files: ['templates/*/html/**/*.js'],
    languageOptions: { globals: globals.browser, sourceType: 'script' },
  },
);
