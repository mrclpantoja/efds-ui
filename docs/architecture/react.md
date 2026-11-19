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

## Notas de comportamento (Fase 6)

- **Toast sem `title`**: a severidade vai num `<span class="eds-visually-hidden">` ("Informação:", "Sucesso:", "Atenção:", "Erro:"), como no `severityLabel` do Alert. Com `title`, nada é acrescentado. Para i18n: `<ToastProvider severityLabels={{ danger: 'Error:' }} />` (`Partial<Record<ToastVariant, string>>`).
- **Sidebar**: o botão de colapsar leva `aria-expanded` e `aria-controls` apontando para o `id` da `<nav>` (do consumidor, do shell no slot `sidebar` ou o gerado localmente); a `<nav>` sempre tem id.
- **Modal/Drawer (DialogBase)**: se o consumidor mantém `open` e ignora `onClose`, o dialog é reaberto 50 ms após o fechamento nativo (2º Esc). O foco volta ao último elemento focado dentro do dialog (rastreado por `focusin`), não ao botão Fechar.

## Notas de comportamento (Fase 6b)

- **Combobox**: foco sempre no `<input>` (`aria-activedescendant`); popup `popover="manual"` posicionado por `--_combobox-x/-y/-width` via `style.setProperty` (único estilo inline permitido, só posição; com `data-placement="top"`, `-y` é o `top` do campo e o CSS sobe o popup). Texto sem opção escolhida gera `setCustomValidity` (`freeText` desliga); `selectedLabel` cobre valor controlado cuja opção ainda não foi carregada; a lista é nomeada por `listLabel`/`aria-label` ou, dentro de `Field`, pelo `labelId` do contexto.
- **PageLoaderProvider**: motor sem React com `attach`/`detach` simétricos no efeito (compatível com StrictMode). `auto` (padrão ligado) faz patch de `fetch`/XHR enquanto montado e só cobre SPA (não form/link). `trigger="user"` ignora requisições sem `navigator.userActivation.isActive`. Depois de `slowAfter` (20 s) o diálogo oferece "Fechar" (libera a página e silencia as pendências até terminarem) e "Continuar aguardando". `<dialog>` fechado pelo navegador sem pedido do código é reaberto.

## Notas de comportamento (Fase 6c)

- **Lógica compartilhada do Combobox**: `internal/combobox-shared.ts` (tipo `ComboboxOption`, filtro sem acento, `usePopupPosition`, `useScrollActiveIntoView`, atrasos de status) é usada por Combobox e MultiSelect. Quem novo usar o popup posiciona pelo `anchorRef` (o Combobox ancora no input; o MultiSelect, no `.eds-combobox-control`).
- **MultiSelect**: foco sempre no `<input class="eds-combobox-input">`; `aria-multiselectable`, `aria-selected` = escolhida e `data-active` = destaque. Enter/clique alterna e mantém aberto; Backspace com texto vazio remove a última; Esc fecha e, fechado, limpa só o texto. Um `hidden` por escolha (`name` usado como veio; passe `cidades[]` se o servidor espera lista). `required` vira `aria-required` + `setCustomValidity` (nunca o `required` nativo no input de texto). Status neutro em gênero ("Pelotas: selecionado. 3 itens selecionados."). O tamanho vai no controle (`.eds-combobox-control-sm|lg`).
- **FileInput**: `<input type="file" class="eds-file">`, sem JS, integra com `Field` como o Input.
- **FileUpload**: o `<input class="eds-upload-input">` fica no DOM e a dropzone é um `<label for>` (teclado nativo). Não emite `data-eds-upload` (reservado ao `@eds-ui/behavior`). Modo formulário: os arquivos válidos ficam no input via `DataTransfer` (efeito sobre a lista), então o envio normal leva tudo. Modo imediato (`upload`): o input perde o `name` e limpa o `value`; cada envio ganha `AbortController` (remover aborta), `hidden name=id` ao terminar e `setCustomValidity("Aguarde o envio dos arquivos.")` enquanto houver envio. O progresso aparece no `<progress>` mas não é anunciado. Foco após remover: próximo botão, anterior, input. Drag só no contêiner `.eds-upload`, com contador de profundidade.

## Notas de comportamento (Fase 6d)

- **Data nativa**: `<Input type="date|time|datetime-local|month">` já serve (o core ajusta o visual); não há componente novo.
- **DatePicker / DateRangePicker**: campo de texto com máscara dd/mm/aaaa (cola dd/mm/aaaa ou aaaa-mm-dd) + botão que abre um diálogo `popover="manual"` (APG "Date Picker Dialog"), posicionado só por `--_calendar-x/-y` (com `data-placement="top"`, `-y` é o `top` do campo). Datas são locais, sem fuso (nunca `new Date('aaaa-mm-dd')`); o valor público é ISO `aaaa-mm-dd`.
- **Grade compartilhada** em `internal/` (`CalendarPanel`, `calendar-shared`, `useDateField`; não exportada). O conteúdo do diálogo só existe aberto. Roving tabindex; ←/→/↑/↓, Home/End (semana, domingo a sábado), PageUp/PageDown (mês) e Shift+PageUp/PageDown (ano, ajustando ao fim do mês); Enter/Espaço escolhe; Esc fecha, devolve o foco ao botão e dá `stopPropagation` (não fecha Modal em volta); Tab circula no diálogo; clique fora fecha; Alt+↓ no campo abre. Dia indisponível recebe foco mas não é escolhido (anuncia "Data indisponível."). Foco inicial: dia escolhido, senão hoje, ajustado a min/max.
- **Nome do dia**: `aria-label` no `td`, começando pelo número visível ("15 de março de 2026, domingo"; 2.5.3). O título do mês é `aria-live="polite"`. Dia fora do mês é `<td>` vazio.
- **Validação**: erro (data inválida, fora de min/max, bloqueada, final antes da inicial, `maxDays`) vira `setCustomValidity` sempre e `aria-invalid` + anúncio só depois do blur/Enter. O hidden (`name`, `nameStart`/`nameEnd`) recebe ISO ou fica vazio se houver erro. `required` é nativo no campo de texto. A mensagem não é desenhada pelo componente: mostre-a via `Field error` se quiser texto visível.
- **Bloqueios**: `min`/`max` (ISO), `isDateDisabled(date)`, `disableWeekends`. DateRangePicker: `maxDays` (dias corridos, início e fim contam); dias bloqueados podem ficar no meio do período, não ser início/fim.
- **DateRangePicker**: 1º dia = início, 2º = fim (anterior ao início vira o novo início); fecha após o fim. Dias do período têm `aria-selected="true"` e `data-range="start|middle|end|single"` (`single` = só o início ou início = fim); a prévia (`data-range-preview`, sem `aria-selected`) vai do início ao dia sob o ponteiro/foco. Status: "Início: dd/mm/aaaa. Escolha a data final." e "Período: dd/mm/aaaa a dd/mm/aaaa.". Dentro de `Field`, o rótulo nomeia o grupo (`aria-labelledby`) e o `id` vai ao campo inicial. O `ref` vai para o grupo; no DatePicker, para o `<input>`.
- **Textos e idioma**: `texts` (todos os rótulos e mensagens, em função quando recebem dados) e `locale` (padrão `pt-BR`, via `Intl`; a semana começa no domingo e a máscara continua dd/mm/aaaa). O tamanho (`size`) vai no input (`eds-input-sm|lg`).
- **Testes**: jsdom esconde `[popover]` fechado e não tem `showPopover`; os testes usam `installPopoverStyle()` (`test-utils/dom-polyfills.ts`) para tratar o popup como visível.

### Correções da auditoria UX (Fase 6d)

- **Erro visível**: sem erro vindo do `Field`/`invalid`, o componente renderiza `<p class="eds-error">` logo após `.eds-datepicker` e o liga ao `aria-describedby` do campo afetado (no período, um por campo). O erro do `Field` prevalece (nada duplicado). Aparece só depois de blur/Enter (no período, ao sair do grupo); o status live continua como reforço.
- **Máscara** preserva o cursor ao editar no meio (dígitos antes do cursor, restaurado em `useLayoutEffect`).
- **Período incompleto** (só início ou só fim) é erro mesmo sem `required` ("Informe também a data final." / "…inicial."; `texts.missingEnd`/`missingStart`).
- **Mensagens**: "{data}: data indisponível." (`texts.unavailable(data)`), "O período pode ter no máximo N dias.", ano de 2 dígitos pede 4 dígitos. Status ao escolher: "Data selecionada: 26 de dezembro de 2026, sábado.".
- **Calendário**: `aria-modal="true"`; prévia do período limitada a `maxDays` e min/max; entre ponteiro e foco vale o último a mudar. Alt+↓ no campo final abre no mês da data final. Nome do botão com valor ("Escolher data. Atual: 15/03/2026"; `texts.toggleWithValue`).
- **`id` explícito** num DatePicker dentro de `Field` com `controlId` diferente: o `for` do rótulo não chega ao campo, então o nome vem por `aria-labelledby` do rótulo do Field (o `Input` não faz isso).
