# @efds-ui/react

Componentes React do efDS.ui, em TypeScript. São wrappers finos: montam as classes `.eds-*` do `@efds-ui/core` e os atributos HTML/ARIA. Não têm identidade visual própria nem CSS, então o resultado é idêntico ao do HTML puro.

> **Versão 0.1.2.** Licença MIT. Documentação: https://efds-ui.com.br

## Como se encaixa no conjunto

| Pacote                                                                 | O que traz                                                                 |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| [`@efds-ui/core`](https://www.npmjs.com/package/@efds-ui/core)         | CSS: tokens, base, layout e componentes (obrigatório)                      |
| [`@efds-ui/themes`](https://www.npmjs.com/package/@efds-ui/themes)     | Temas, modo, densidade e forma                                             |
| [`@efds-ui/behavior`](https://www.npmjs.com/package/@efds-ui/behavior) | JavaScript puro para HTML. No React, só o subcaminho de exportação é usado |
| **`@efds-ui/react`** (este)                                            | Componentes React                                                          |
| [`@efds-ui/icons`](https://www.npmjs.com/package/@efds-ui/icons)       | Ícones SVG para React                                                      |
| [`@efds-ui/editor`](https://www.npmjs.com/package/@efds-ui/editor)     | Editor de conteúdo (`@efds-ui/editor/react`)                               |

## O que traz

- Um componente para cada componente do core: Button, Input, Select, Modal, Drawer, Dropdown, Tabs, Table, Toast, Card, Alert, Sidebar, App Shell e todos os demais da [documentação](https://efds-ui.com.br/componentes/button).
- Campos completos: máscaras de entrada (CPF, CNPJ, telefone, moeda), senha, OTP, Combobox, MultiSelect, DatePicker, DateRangePicker, TimePicker, FileUpload.
- Providers: `ToastProvider`, `DialogProvider` (`alert`, `confirm`, `prompt` por Promise), `PageLoaderProvider`, `LocaleProvider`.
- Tabela com ordenação, filtro, seleção e exportação (`TableExport`: CSV, Excel, JSON, PDF).
- **Acessibilidade forçada nos tipos:** um botão só de ícone exige `aria-label`; uma tabela exige `caption`; o diálogo exige `title`.
- API pequena e semântica (`variant`, `size`); nada de aparência por prop. Todo texto interno é substituível por `texts` (padrões em português).
- Todos os componentes aceitam `ref` e `className` e repassam os atributos nativos.

## Instalação

```sh
npm install @efds-ui/react @efds-ui/core
# ou: pnpm add @efds-ui/react @efds-ui/core
```

Peer dependencies: `react` e `react-dom`, versões 18 ou 19. Para temas: [`@efds-ui/themes`](https://www.npmjs.com/package/@efds-ui/themes). Para ícones: [`@efds-ui/icons`](https://www.npmjs.com/package/@efds-ui/icons).

## Uso mínimo

```tsx
import '@efds-ui/core/index.css';
import { Button } from '@efds-ui/react';

export function App() {
  return <Button variant="primary">Salvar</Button>;
}
```

## CSS fica com o consumidor

O pacote **não importa CSS**. Assim você escolhe o `index.css` completo ou a importação seletiva (veja [`@efds-ui/core`](https://www.npmjs.com/package/@efds-ui/core)), controla a ordem e a tematização, e o `sideEffects: false` mantém o tree shaking limpo. Sem o CSS do core, os componentes aparecem sem estilo.

## Fonte

O efDS.ui usa Inter; carregue-a no seu app.

## Acessibilidade e testes

Os componentes seguem os padrões de teclado e ARIA da WAI-ARIA Authoring Practices e a WCAG 2.2 AA. Modal e Drawer usam o `<dialog>` nativo. O pacote tem uma suíte de testes automatizados (Vitest e Testing Library, com seletores por papel e `userEvent`) que cobre teclado, ARIA e contrato do markup para cada componente interativo. Veja a página de [Acessibilidade](https://efds-ui.com.br/comecar/acessibilidade).

## Documentação

- [Uso com React](https://efds-ui.com.br/comecar/uso-com-react)
- [Acessibilidade](https://efds-ui.com.br/comecar/acessibilidade)
- [Referência de eventos](https://efds-ui.com.br/comecar/eventos)
- [Políticas](https://efds-ui.com.br/comecar/politicas): versionamento, depreciação e estabilidade (estável ou experimental) de cada componente

## Código-fonte e contribuição

[github.com/mrclpantoja/efds-ui](https://github.com/mrclpantoja/efds-ui). Problemas e sugestões: [issues](https://github.com/mrclpantoja/efds-ui/issues). Guia: [CONTRIBUTING.md](https://github.com/mrclpantoja/efds-ui/blob/main/CONTRIBUTING.md). Falhas de segurança: [SECURITY.md](https://github.com/mrclpantoja/efds-ui/blob/main/SECURITY.md).

## Licença

MIT. Desenvolvido e mantido pela [Innovation Tech](https://innovationtech.com.br/).
