# @efds-ui/core

CSS do efDS.ui (Empresarial Framework Design System): tokens, base, layout e mais de 60 arquivos de componente. Sem JavaScript, sem dependência de runtime e sem conhecer o React. Serve a qualquer stack: HTML puro, PHP, Java, .NET, Vue, Angular ou React.

> **Versão 0.1.2.** Licença MIT. Documentação: https://efds-ui.com.br

## O core faz parte de um conjunto

O core é só o visual. Comportamento, temas, ícones, React e editor são pacotes à parte, da mesma versão:

| Pacote                                                                 | O que traz                                                                                    |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| **`@efds-ui/core`** (este)                                             | CSS: tokens, base, layout e componentes                                                       |
| [`@efds-ui/themes`](https://www.npmjs.com/package/@efds-ui/themes)     | Temas, modo claro/escuro, densidade e forma, por atributos `data-*`                           |
| [`@efds-ui/behavior`](https://www.npmjs.com/package/@efds-ui/behavior) | JavaScript puro, sem dependência, para quem usa só HTML: modal, abas, toast, tabela, datas... |
| [`@efds-ui/react`](https://www.npmjs.com/package/@efds-ui/react)       | Componentes React sobre as classes do core                                                    |
| [`@efds-ui/icons`](https://www.npmjs.com/package/@efds-ui/icons)       | Ícones SVG como componentes React                                                             |
| [`@efds-ui/editor`](https://www.npmjs.com/package/@efds-ui/editor)     | Editor de conteúdo (HTML e React)                                                             |

## O que o core cobre

- **Tokens** em três níveis (primitivo, semântico, componente), com prefixo `--eds-*`. Os componentes usam só tokens semânticos.
- **Temas e eixos** por atributo: `data-theme`, `data-mode`, `data-density`, `data-shape`. Trocar o tema muda tokens, nunca componentes.
- **Layout:** Container, Grid (por container queries), Stack e app shell com Sidebar e Navbar.
- **Componentes:** botões, formulários (inclui data, upload, autocomplete e seleção múltipla), tabelas, modais e drawers, abas, alertas e toasts, cards, árvore, galeria de imagens e outros. Lista completa na [documentação](https://efds-ui.com.br/componentes/button).
- **Acessibilidade WCAG 2.2 AA** como requisito: HTML semântico, foco visível, contraste calculado nas escalas de cor, `prefers-contrast`, `forced-colors` e impressão.

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

Para tema, modo, densidade e forma, instale o [`@efds-ui/themes`](https://www.npmjs.com/package/@efds-ui/themes). Para o comportamento (abrir um modal, trocar de aba) sem React, use o [`@efds-ui/behavior`](https://www.npmjs.com/package/@efds-ui/behavior).

## Por CDN (sem instalar)

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@efds-ui/core@0.1.2/dist/index.css" />
```

Em produção, prefira servir o arquivo do seu servidor: o CDN recebe o IP de quem acessa. Hashes de integridade (SRI) em https://efds-ui.com.br/comecar/instalacao.

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

## Acessibilidade e testes

Cada componente segue os padrões de teclado e ARIA da WAI-ARIA Authoring Practices e é revisado contra a WCAG 2.2 AA. O conjunto foi validado em Chrome, Edge e Firefox, com NVDA e em toque. A [página de acessibilidade](https://efds-ui.com.br/comecar/acessibilidade) lista o que cada componente garante. O markup do core é o contrato testado pelos pacotes `react` e `behavior`.

## Documentação

- [Instalação](https://efds-ui.com.br/comecar/instalacao) e [Uso com HTML](https://efds-ui.com.br/comecar/uso-com-html)
- [Tokens](https://efds-ui.com.br/fundamentos/tokens) e [Temas e eixos](https://efds-ui.com.br/fundamentos/temas-e-eixos)
- [Políticas](https://efds-ui.com.br/comecar/politicas): versionamento, navegadores suportados e estabilidade de cada componente
- [Site de documentação](https://efds-ui.com.br)

## Código-fonte e contribuição

[github.com/mrclpantoja/efds-ui](https://github.com/mrclpantoja/efds-ui). Problemas e sugestões: [issues](https://github.com/mrclpantoja/efds-ui/issues). Guia: [CONTRIBUTING.md](https://github.com/mrclpantoja/efds-ui/blob/main/CONTRIBUTING.md). Falhas de segurança: [SECURITY.md](https://github.com/mrclpantoja/efds-ui/blob/main/SECURITY.md).

## Licença

MIT. Desenvolvido e mantido pela [Innovation Tech](https://innovationtech.com.br/).
