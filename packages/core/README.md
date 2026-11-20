# @eds-ui/core

CSS puro do eDS.ui (Empresarial Design System): tokens, base, layout e componentes. Sem JavaScript, sem dependência de runtime e sem conhecer React.

> **Pré-lançamento (0.1.0).** O pacote ainda não foi publicado no npm: o escopo `@eds-ui` ainda será verificado. Licença MIT. A API pode mudar até a 1.0.

## Instalação

```sh
pnpm add @eds-ui/core
```

## Uso mínimo

```ts
import '@eds-ui/core/index.css';
```

```html
<button class="eds-button eds-button-primary">Salvar</button>
```

Temas e eixos (`data-theme`, `data-mode`, `data-density`, `data-shape`) vêm de [`@eds-ui/themes`](../themes/README.md).

## Importação seletiva

Cada arquivo-fonte vira um CSS isolado e começa com a declaração de ordem de `@layer`, então a cascata não depende da ordem dos imports.

```ts
import '@eds-ui/core/tokens.css'; // todos os tokens
import '@eds-ui/core/base.css'; // reset, root, tipografia, acessibilidade
import '@eds-ui/core/layout/stack.css'; // um arquivo de layout
import '@eds-ui/core/components/button.css'; // um componente
```

## Fonte

O core não carrega fonte. A tipografia usa Inter: carregue-a no seu app (por exemplo `@fontsource-variable/inter`).

## Documentação

- [Tokens](../../docs/architecture/tokens.md)
- [README do monorepo](../../README.md)
