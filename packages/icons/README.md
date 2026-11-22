# @efds-ui/icons

Ícones do efDS.ui como componentes React (SVG inline, herdam `currentColor`).

> **Versão 0.1.1.** Licença MIT. A API pode mudar até a 1.0. Documentação: https://efds-ui.com.br

## Instalação

```sh
npm install @efds-ui/icons
# ou: pnpm add @efds-ui/icons
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

- [Uso com React](https://efds-ui.com.br/#/comecar/uso-com-react)
- [Site de documentação](https://efds-ui.com.br)
