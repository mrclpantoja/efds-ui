# @efds-ui/react

Componentes React do efDS.ui. São wrappers finos: montam as classes `.eds-*` do `@efds-ui/core` e os atributos HTML/ARIA. Não têm identidade visual própria nem CSS.

> **Pré-lançamento (0.1.0).** O pacote ainda não foi publicado no npm: o escopo `@efds-ui` ainda será criado. Licença MIT. A API pode mudar até a 1.0.

## Instalação

```sh
pnpm add @efds-ui/react @efds-ui/core
```

Peer dependencies: `react` e `react-dom`, versões 18 ou 19. Os ícones ficam em [`@efds-ui/icons`](../icons/README.md); temas, em [`@efds-ui/themes`](../themes/README.md).

## Uso mínimo

```tsx
import '@efds-ui/core/index.css';
import { Button } from '@efds-ui/react';

export function App() {
  return <Button variant="primary">Salvar</Button>;
}
```

## CSS fica com o consumidor

O pacote **não importa CSS**. Assim você escolhe o `index.css` completo ou a importação seletiva (ver [`@efds-ui/core`](../core/README.md)), controla a ordem e a tematização, e o `sideEffects: false` mantém o tree shaking limpo. Sem o CSS do core, os componentes aparecem sem estilo.

## Fonte

O efDS.ui usa Inter; carregue-a no seu app.

## Documentação

- [Convenções do pacote React](../../docs/architecture/react.md)
- [Comportamento e acessibilidade](../../docs/architecture/comportamento.md)
