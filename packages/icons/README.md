# @efds-ui/icons

Ícones do efDS.ui como componentes React (SVG inline, herdam `currentColor`).

> **Pré-lançamento (0.1.0).** O pacote ainda não foi publicado no npm: o escopo `@efds-ui` ainda será criado. Licença MIT. A API pode mudar até a 1.0.

## Instalação

```sh
pnpm add @efds-ui/icons
```

Peer dependency: `react` 18 ou 19. Não depende de `@efds-ui/core` nem de `@efds-ui/react`.

## Uso mínimo

```tsx
import { SearchIcon } from '@efds-ui/icons';

// Decorativo (aria-hidden) por padrão; com title vira role="img" nomeado.
<SearchIcon title="Buscar" />;
```

Exports nomeados: só os ícones importados entram no bundle (`sideEffects: false`).

## Documentação

- [Convenções do pacote React](../../docs/architecture/react.md)
- [README do monorepo](../../README.md)
