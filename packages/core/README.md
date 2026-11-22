# @efds-ui/core

CSS puro do efDS.ui (Empresarial Framework Design System): tokens, base, layout e componentes. Sem JavaScript, sem dependência de runtime e sem conhecer React.

> **Versão 0.1.1.** Licença MIT. A API pode mudar até a 1.0. Documentação: https://efds-ui.com.br

## Instalação

```sh
npm install @efds-ui/core
# ou: pnpm add @efds-ui/core
```

## Uso mínimo

```ts
import '@efds-ui/core/index.css';
```

```html
<button class="eds-button eds-button-primary">Salvar</button>
```

Temas e eixos (`data-theme`, `data-mode`, `data-density`, `data-shape`) vêm de [`@efds-ui/themes`](https://www.npmjs.com/package/@efds-ui/themes).

## Por CDN (sem instalar)

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@efds-ui/core@0.1.1/dist/index.css" />
```

Em produção, prefira servir o arquivo do seu servidor: o CDN recebe o IP de quem acessa. Hashes de integridade (SRI) em https://efds-ui.com.br/#/comecar/instalacao.

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

- [Tokens](https://efds-ui.com.br/#/fundamentos/tokens)
- [Site de documentação](https://efds-ui.com.br)
