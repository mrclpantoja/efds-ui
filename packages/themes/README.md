# @efds-ui/themes

Temas e eixos de aparência do efDS.ui: `theme`, `mode`, `density` e `shape`. Eles alteram apenas tokens, nunca componentes, e se aplicam por atributos `data-*` no HTML, sem JavaScript. Depende de `@efds-ui/core`.

> **Versão 0.1.2.** Licença MIT. Documentação: https://efds-ui.com.br

## Como se encaixa no conjunto

| Pacote                                                                 | O que traz                                         |
| ---------------------------------------------------------------------- | -------------------------------------------------- |
| [`@efds-ui/core`](https://www.npmjs.com/package/@efds-ui/core)         | CSS: tokens, base, layout e componentes            |
| **`@efds-ui/themes`** (este)                                           | Valores dos eixos de aparência                     |
| [`@efds-ui/behavior`](https://www.npmjs.com/package/@efds-ui/behavior) | JavaScript puro para HTML (modal, abas, tabela...) |
| [`@efds-ui/react`](https://www.npmjs.com/package/@efds-ui/react)       | Componentes React sobre as classes do core         |
| [`@efds-ui/icons`](https://www.npmjs.com/package/@efds-ui/icons)       | Ícones SVG para React                              |
| [`@efds-ui/editor`](https://www.npmjs.com/package/@efds-ui/editor)     | Editor de conteúdo (HTML e React)                  |

## Os eixos

| Atributo       | Valores                                        |
| -------------- | ---------------------------------------------- |
| `data-theme`   | `blue`, `green`, `purple`, `orange`, `neutral` |
| `data-mode`    | `light`, `dark`                                |
| `data-density` | `compact`, `comfortable`, `spacious`           |
| `data-shape`   | `sharp`, `soft`, `rounded`                     |

As escalas de cor têm contraste WCAG 2.2 AA calculado, em todos os temas e nos dois modos. O pacote também cobre `prefers-contrast: more` e `forced-colors`.

## Instalação

```sh
npm install @efds-ui/core @efds-ui/themes
# ou: pnpm add @efds-ui/core @efds-ui/themes
```

## Uso mínimo

```ts
import '@efds-ui/core/index.css';
import '@efds-ui/themes/index.css'; // todos os eixos
```

```html
<html data-theme="blue" data-mode="light" data-density="comfortable" data-shape="soft"></html>
```

Para trocar, altere o atributo. Nenhum JavaScript do pacote é necessário. Um tema em subárvore exige `data-theme` e `data-mode` no mesmo elemento.

## Por CDN (sem instalar)

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@efds-ui/core@0.1.2/dist/index.css" />
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@efds-ui/themes@0.1.2/dist/index.css" />
```

Hashes de integridade (SRI) em https://efds-ui.com.br/comecar/instalacao.

## Importação seletiva

Importe só os valores de eixo que o app usa:

```ts
import '@efds-ui/themes/theme-blue.css';
import '@efds-ui/themes/mode-dark.css';
import '@efds-ui/themes/density-compact.css';
import '@efds-ui/themes/shape-soft.css';
```

Arquivos disponíveis: `theme-{blue,green,purple,orange,neutral}`, `mode-{light,dark}`, `density-{compact,comfortable,spacious}`, `shape-{sharp,soft,rounded}`.

## Tema por cor da sua marca

O `@efds-ui/behavior` traz `createTheme` (subcaminho `@efds-ui/behavior/theme`): gera um tema a partir de uma cor, com o contraste AA garantido. Veja [Temas e eixos](https://efds-ui.com.br/fundamentos/temas-e-eixos).

## Fonte

A fonte Inter fica por conta do consumidor.

## Documentação

- [Temas e eixos](https://efds-ui.com.br/fundamentos/temas-e-eixos)
- [Tokens](https://efds-ui.com.br/fundamentos/tokens)
- [Políticas](https://efds-ui.com.br/comecar/politicas)

## Código-fonte e contribuição

[github.com/mrclpantoja/efds-ui](https://github.com/mrclpantoja/efds-ui). Problemas e sugestões: [issues](https://github.com/mrclpantoja/efds-ui/issues). Guia: [CONTRIBUTING.md](https://github.com/mrclpantoja/efds-ui/blob/main/CONTRIBUTING.md). Falhas de segurança: [SECURITY.md](https://github.com/mrclpantoja/efds-ui/blob/main/SECURITY.md).

## Licença

MIT. Desenvolvido e mantido pela [Innovation Tech](https://innovationtech.com.br/).
