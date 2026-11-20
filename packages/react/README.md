# @eds-ui/react

Componentes React do eDS.ui. São wrappers finos: montam as classes `.eds-*` do `@eds-ui/core` e os atributos HTML/ARIA. Não têm identidade visual própria nem CSS.

> **Pré-lançamento (0.1.0).** O pacote ainda não foi publicado no npm: o escopo `@eds-ui` ainda será verificado. Licença MIT. A API pode mudar até a 1.0.

## Instalação

```sh
pnpm add @eds-ui/react @eds-ui/core
```

Peer dependencies: `react` e `react-dom`, versões 18 ou 19. Os ícones ficam em [`@eds-ui/icons`](../icons/README.md); temas, em [`@eds-ui/themes`](../themes/README.md).

## Uso mínimo

```tsx
import '@eds-ui/core/index.css';
import { Button } from '@eds-ui/react';

export function App() {
  return <Button variant="primary">Salvar</Button>;
}
```

## CSS fica com o consumidor

O pacote **não importa CSS**. Assim você escolhe o `index.css` completo ou a importação seletiva (ver [`@eds-ui/core`](../core/README.md)), controla a ordem e a tematização, e o `sideEffects: false` mantém o tree shaking limpo. Sem o CSS do core, os componentes aparecem sem estilo.

## Fonte

O eDS.ui usa Inter; carregue-a no seu app.

## Documentação

- [Convenções do pacote React](../../docs/architecture/react.md)
- [Comportamento e acessibilidade](../../docs/architecture/comportamento.md)
