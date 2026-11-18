# @eds-ui/react — convenções

O React não tem identidade visual: cada componente monta `className` com as classes `.eds-*` do core e define atributos HTML/ARIA. Sem CSS, sem `style`, sem dependência de runtime além de `react` (peer). Contrato de markup: CSS em `packages/core/src/**` e `apps/playground/src/demos/*.tsx`; obrigações de comportamento: `comportamento.md`.

## Estrutura

```
packages/react/src/
  index.ts                  reexport nomeado (componentes + tipos)
  utils/cx.ts
  internal/                 privado, nunca exportado: Glyph/glyphs (fechar, chevrons, setas, check), tipos de layout
  components/<Nome>/
    <Nome>.tsx  <Nome>.test.tsx  index.ts
```

Ícones públicos ficam em `@eds-ui/icons` (que só tem `react` como peer; `@eds-ui/react` não depende dele). Glifos que um componente precisa por dentro (fechar do Modal, chevron do Select/Pagination, setas de ordenação) saem de `internal/glyphs.tsx`.

## Convenções de props

- Mesmo vocabulário do core: `variant="primary"` ⇄ `.eds-button-primary`. Unions de string literais, sem `enum`, sem `any`.
- Só props semânticas (`variant`, `size`, `loading`, `invalid`, `gap`, `span`...). Nunca aparência (`color`, `radius`, `padding`, `style`).
- Estender os atributos nativos do elemento raiz; `className` é mesclado por `cx` (classes do core primeiro, a do consumidor por último); `...rest` vem **antes** das props controladas (o componente não deixa o consumidor desfazer `aria-busy`, `role`, `type`).
- `forwardRef` + `displayName` (compatível com React 18 e 19, conforme o peer). Quando migrarmos o peer para 19, troca-se por `ref` como prop em todos de uma vez.
- Padrão de classe: omitir a classe do valor padrão do core (`md` não emite `eds-button-md`; `xl` não emite `eds-container-xl`); props sem valor não emitem classe vazia.
- Estado é atributo (`disabled`, `aria-busy`, `aria-invalid`, `aria-current`, `open`), porque é neles que o CSS do core se apoia.
- Exigência de acessibilidade vai para o tipo: `iconOnly` ⇒ `aria-label` obrigatório; `ButtonGroup` ⇒ `aria-label` ou `aria-labelledby`. Teste com `// @ts-expect-error`.
- Polimorfismo barato: `as` com união fechada de tags (`LayoutElement`) via `createElement`, só no layout. Polimorfismo de verdade (Button↔`<a>`) é por uma prop discriminante (`href`), com sobrecarga no tipo do componente.
- Textos internos (ex.: "Fechar") sempre substituíveis por prop. IDs com `useId`. Sem `dangerouslySetInnerHTML`. Sem efeito colateral no topo do módulo.
- Controlado e não controlado quando houver valor/abertura (`value`/`defaultValue`, `open`/`defaultOpen` + `onOpenChange`).

## Testes

Vitest + Testing Library + `user-event` + matchers do jest-dom (já no setup do preset). Seletores por `getByRole`/`getByLabelText`. Cobrir: classes por variante/tamanho, `ref`, `className` e props nativas repassados, atributos ARIA, teclado e callbacks. Visuais puros: um teste de fumaça basta. Dados fictícios.

## Verificação do pacote

`pnpm typecheck · lint · test · build · format:check`; `grep -rn "style=" packages/react/src` vazio; `dist` sem CSS; `sideEffects` correto (tree shaking).

## Componentes

| Componente                                                                 | Status | Lote |
| -------------------------------------------------------------------------- | ------ | ---- |
| Container, Grid (+ GridItem), Stack                                        | pronto | A    |
| Button, ButtonGroup                                                        | pronto | A    |
| Dropdown                                                                   | pronto | C    |
| Input, Textarea, Select, Checkbox, Radio, Switch, Field (label/ajuda/erro) | pronto | B    |
| Card, Modal, Drawer                                                        | pronto | C/D  |
| App shell, Navbar, Sidebar, Tabs, Breadcrumb                               | pronto | C/D  |
| Alert, Toast, Badge, Spinner, Skeleton                                     | pronto | B/C  |
| Table, Pagination, EmptyState                                              | pronto | D    |

Ícones (`@eds-ui/icons`): 18 prontos (busca, filtro, mais, editar, excluir, 4 chevrons, fechar, check, setas, menu, sino, usuário, download, adicionar). Demais sob demanda.
