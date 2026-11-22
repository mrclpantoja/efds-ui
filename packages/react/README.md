# @efds-ui/react

Componentes React do efDS.ui. São wrappers finos: montam as classes `.eds-*` do `@efds-ui/core` e os atributos HTML/ARIA. Não têm identidade visual própria nem CSS.

> **Versão 0.1.1.** Licença MIT. A API pode mudar até a 1.0. Documentação: https://efds-ui.com.br

## Instalação

```sh
npm install @efds-ui/react @efds-ui/core
# ou: pnpm add @efds-ui/react @efds-ui/core
```

Peer dependencies: `react` e `react-dom`, versões 18 ou 19. Os ícones ficam em [`@efds-ui/icons`](https://www.npmjs.com/package/@efds-ui/icons); temas, em [`@efds-ui/themes`](https://www.npmjs.com/package/@efds-ui/themes).

## Uso mínimo

```tsx
import '@efds-ui/core/index.css';
import { Button } from '@efds-ui/react';

export function App() {
  return <Button variant="primary">Salvar</Button>;
}
```

## CSS fica com o consumidor

O pacote **não importa CSS**. Assim você escolhe o `index.css` completo ou a importação seletiva (ver [`@efds-ui/core`](https://www.npmjs.com/package/@efds-ui/core)), controla a ordem e a tematização, e o `sideEffects: false` mantém o tree shaking limpo. Sem o CSS do core, os componentes aparecem sem estilo.

## Fonte

O efDS.ui usa Inter; carregue-a no seu app.

## Quem mantém

Desenvolvido e mantido pela [Innovation Tech](https://innovationtech.com.br/).

## Documentação

- [Uso com React](https://efds-ui.com.br/#/comecar/uso-com-react)
- [Acessibilidade](https://efds-ui.com.br/#/comecar/acessibilidade)
