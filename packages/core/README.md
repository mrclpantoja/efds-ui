# @efds-ui/core

CSS puro do efDS.ui (Empresarial Framework Design System): tokens, base, layout e componentes. Sem JavaScript, sem dependência de runtime e sem conhecer React.

> **Versão 0.1.0 (primeira publicação).** Licença MIT. A API pode mudar até a 1.0. Documentação: https://efds-ui.com.br

## Instalação

```sh
pnpm add @efds-ui/core
```

## Uso mínimo

```ts
import '@efds-ui/core/index.css';
```

```html
<button class="eds-button eds-button-primary">Salvar</button>
```

Temas e eixos (`data-theme`, `data-mode`, `data-density`, `data-shape`) vêm de [`@efds-ui/themes`](../themes/README.md).

## Importação seletiva

Cada arquivo-fonte vira um CSS isolado e começa com a declaração de ordem de `@layer`, então a cascata não depende da ordem dos imports.

```ts
import '@efds-ui/core/tokens.css'; // todos os tokens
import '@efds-ui/core/base.css'; // reset, root, tipografia, acessibilidade
import '@efds-ui/core/layout/stack.css'; // um arquivo de layout
import '@efds-ui/core/components/button.css'; // um componente
```

## Fonte

O core não carrega fonte. A tipografia usa Inter: carregue-a no seu app (por exemplo `@fontsource-variable/inter`).

## Documentação

- [Tokens](../../docs/architecture/tokens.md)
- [README do monorepo](../../README.md)
