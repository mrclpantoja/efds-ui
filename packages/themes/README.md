# @efds-ui/themes

Temas e eixos do efDS.ui: `theme`, `mode`, `density` e `shape`. Alteram apenas tokens, nunca componentes. Depende de `@efds-ui/core`.

> **Versão 0.1.2.** Licença MIT. A API pode mudar até a 1.0. Documentação: https://efds-ui.com.br

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

Para trocar, altere o atributo; nenhum JavaScript do pacote é necessário.

## Por CDN (sem instalar)

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@efds-ui/core@0.1.1/dist/index.css" />
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@efds-ui/themes@0.1.1/dist/index.css" />
```

## Importação seletiva

Importe só os valores de eixo que o app usa:

```ts
import '@efds-ui/themes/theme-blue.css';
import '@efds-ui/themes/mode-dark.css';
import '@efds-ui/themes/density-compact.css';
import '@efds-ui/themes/shape-soft.css';
```

Valores disponíveis: `theme-{blue,green,purple,orange,neutral}`, `mode-{light,dark}`, `density-{compact,comfortable,spacious}`, `shape-{sharp,soft,rounded}`.

## Fonte

A fonte Inter fica por conta do consumidor.

## Código-fonte

[github.com/mrclpantoja/efds-ui](https://github.com/mrclpantoja/efds-ui) (MIT). Problemas e sugestões: [issues](https://github.com/mrclpantoja/efds-ui/issues).

## Quem mantém

Desenvolvido e mantido pela [Innovation Tech](https://innovationtech.com.br/).

## Documentação

- [Temas e eixos](https://efds-ui.com.br/#/fundamentos/temas-e-eixos)
- [Site de documentação](https://efds-ui.com.br)
