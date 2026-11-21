# @efds-ui/themes

Temas e eixos do efDS.ui: `theme`, `mode`, `density` e `shape`. Alteram apenas tokens, nunca componentes. Depende de `@efds-ui/core`.

> **Pré-lançamento (0.1.0).** O pacote ainda não foi publicado no npm: o escopo `@efds-ui` ainda será criado. Licença MIT. A API pode mudar até a 1.0.

## Instalação

```sh
pnpm add @efds-ui/core @efds-ui/themes
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

## Documentação

- [Tokens e eixos](../../docs/architecture/tokens.md)
- [README do monorepo](../../README.md)
