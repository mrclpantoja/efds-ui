# @efds-ui/icons

Ícones do efDS.ui como componentes React: SVG inline, herdam `currentColor`, um export por ícone. São ícones próprios do projeto (nenhuma biblioteca de terceiros).

> **Versão 0.1.2.** Licença MIT. Documentação: https://efds-ui.com.br

## Como se encaixa no conjunto

| Pacote                                                                 | O que traz                                         |
| ---------------------------------------------------------------------- | -------------------------------------------------- |
| [`@efds-ui/core`](https://www.npmjs.com/package/@efds-ui/core)         | CSS: tokens, base, layout e componentes            |
| [`@efds-ui/themes`](https://www.npmjs.com/package/@efds-ui/themes)     | Temas, modo, densidade e forma                     |
| [`@efds-ui/behavior`](https://www.npmjs.com/package/@efds-ui/behavior) | JavaScript puro para HTML (modal, abas, tabela...) |
| [`@efds-ui/react`](https://www.npmjs.com/package/@efds-ui/react)       | Componentes React sobre as classes do core         |
| **`@efds-ui/icons`** (este)                                            | Ícones SVG para React                              |
| [`@efds-ui/editor`](https://www.npmjs.com/package/@efds-ui/editor)     | Editor de conteúdo (HTML e React)                  |

O pacote só depende do `react` (peer, 18 ou 19). Não depende de `@efds-ui/core` nem de `@efds-ui/react`. Quem usa só HTML copia o SVG pelo catálogo da documentação.

## Instalação

```sh
npm install @efds-ui/icons
# ou: pnpm add @efds-ui/icons
```

## Uso mínimo

```tsx
import { SearchIcon } from '@efds-ui/icons';

// Decorativo (aria-hidden) por padrão; com title vira role="img" nomeado.
<SearchIcon title="Buscar" />;
```

Exports nomeados: só os ícones importados entram no bundle (`sideEffects: false`).

## Acessibilidade e testes

Sem `title`, o ícone é decorativo e fica oculto para leitores de tela. Com `title`, ganha `role="img"` e nome acessível. O pacote tem testes automatizados (Vitest e Testing Library). Num botão só de ícone, use o `aria-label` do `Button` do `@efds-ui/react`.

## Documentação

- [Ícones](https://efds-ui.com.br/fundamentos/icones): catálogo com busca e cópia do código React ou do SVG para HTML
- [Políticas](https://efds-ui.com.br/comecar/politicas)

## Código-fonte e contribuição

[github.com/mrclpantoja/efds-ui](https://github.com/mrclpantoja/efds-ui). Problemas e sugestões: [issues](https://github.com/mrclpantoja/efds-ui/issues). Guia: [CONTRIBUTING.md](https://github.com/mrclpantoja/efds-ui/blob/main/CONTRIBUTING.md). Falhas de segurança: [SECURITY.md](https://github.com/mrclpantoja/efds-ui/blob/main/SECURITY.md).

## Licença

MIT. Desenvolvido e mantido pela [Innovation Tech](https://innovationtech.com.br/).
