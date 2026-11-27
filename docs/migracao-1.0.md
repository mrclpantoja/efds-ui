# Guia de migração para a 1.0.0

Este guia lista tudo o que mudou de nome ou foi removido entre a 0.1.2 e a 1.0.0. Não há camada de
compatibilidade: o nome antigo deixa de existir. As tabelas estão agrupadas por categoria; use a
busca do editor pelo nome antigo.

As seções "React: props", "React: tipos e exports", "Tom (HTML e React)" e "Abertura" ficam no fim
do guia. As anteriores cobrem o HTML, o `@efds-ui/behavior` e o `@efds-ui/core`, e o efeito mecânico
disso no React (nomes que o React lê ou emite).

## Eventos

| Antes                                                                                              | Depois                                                                                                                                |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `eds:copy`                                                                                         | `eds:copy-success`                                                                                                                    |
| `eds:copy-fail`                                                                                    | `eds:copy-error`                                                                                                                      |
| `eds:table-filtered` (sem `detail`) e `eds:table-filter` (disparado no `<input>`, só pelo usuário) | um só evento, `eds:table-filter`, disparado na **tabela** com `detail { query, count }` sempre que as linhas visíveis mudam           |
| `eds:alert-dismiss`                                                                                | `eds:alert-close` (segue cancelável)                                                                                                  |
| `eds:loader-show`                                                                                  | `eds:loader-open`                                                                                                                     |
| `eds:loader-hide`                                                                                  | `eds:loader-close`                                                                                                                    |
| `eds:sidebar-collapse`                                                                             | `eds:sidebar-toggle` (`detail.collapsed`; também dispara ao expandir)                                                                 |
| `eds:cep-result`                                                                                   | `eds:cep-lookup`                                                                                                                      |
| `eds:password-strength`                                                                            | `eds:password-strength-change`                                                                                                        |
| `eds:dirty-reset` (ouvido pelo behavior)                                                           | removido. Chame `EDS.markClean(form)` (ou `markClean` no ESM). O estado de envio `data-eds-submit` já chama sozinho depois do sucesso |

A página Eventos da documentação passou a listar todos os eventos disparados, inclusive
`eds:form-submit` e `eds:lookup-create`, que são canceláveis.

## Atributos HTML

### Booleanos: presença liga, `="false"` desliga

Um só ajudante (`flag`) lê todos os atributos booleanos. O valor `"off"` deixou de valer; a exceção é
`data-eds-loader="off"` no `<form>`, link ou botão, que é um **modo**, não um booleano.

| Antes                                | Depois                                 |
| ------------------------------------ | -------------------------------------- |
| `data-eds-lookup-autocomplete="off"` | `data-eds-lookup-autocomplete="false"` |
| `data-eds-banner-remember="off"`     | `data-eds-banner-remember="false"`     |
| `data-eds-command-shortcut="off"`    | `data-eds-command-shortcut="false"`    |
| `data-eds-command-recent="off"`      | `data-eds-command-recent="false"`      |

Também passaram a aceitar `="false"` (antes só a presença contava): `data-eds-multiple`,
`data-eds-free-text`, `data-eds-dismissible`, `data-eds-mask-unmask`, `data-eds-mask-validate`,
`data-eds-mask-negative`, `data-eds-number-unmask`, `data-eds-password-strength`,
`data-eds-table-resize`, `data-eds-table-reorder`, `data-eds-export-hidden-columns`,
`data-eds-lookup-create-always`, `data-eds-disable-weekends`, `data-eds-native-alert` e
`data-eds-manual` (na tag do script).

### Nomes

| Antes                                                                 | Depois                                                                                                             |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `data-eds-multiselect` (Tree)                                         | `data-eds-multiple`                                                                                                |
| `data-eds-number-min`, `-max`, `-step`                                | `data-eds-min`, `data-eds-max`, `data-eds-step` (`data-eds-number-decimals` não mudou)                             |
| `data-eds-time-step` (TimePicker)                                     | `data-eds-step`                                                                                                    |
| `data-eds-dismiss` (Alert)                                            | `data-eds-close`                                                                                                   |
| `data-eds-banner-close`                                               | `data-eds-close`                                                                                                   |
| `data-eds-lookup-source`                                              | `data-eds-source` (sempre uma URL)                                                                                 |
| `data-eds-lookup-items='[…]'` (JSON no atributo)                      | `<script type="application/json" data-eds-lookup-items>` dentro do `.eds-lookup`                                   |
| Tree com os nós em JSON                                               | `<script type="application/json" data-eds-tree-items>` dentro do `.eds-tree`; `data-eds-source` continua sendo URL |
| `data-eds-error="texto"` (mensagem do autor)                          | `data-eds-error-message`                                                                                           |
| `data-eds-validate-message`                                           | `data-eds-error-message`                                                                                           |
| `data-eds-validate-tipo="fixo"` ou `"celular"`                        | `data-eds-validate-phone-type="landline"` ou `"mobile"`                                                            |
| `data-eds-confirm-variant`                                            | `data-eds-confirm-tone`                                                                                            |
| `data-eds-copy-done`                                                  | `data-eds-copy-done-text`                                                                                          |
| `data-eds-filter-label`                                               | `data-eds-filter-label-text`                                                                                       |
| `data-eds-loader="auto"`, `"manual"` ou `"off"` **na tag `<script>`** | `data-eds-loader-mode` (o `data-eds-loader="off"` em form, link e botão não mudou)                                 |
| `data-eds-month` (apelido da Agenda)                                  | removido; use `data-eds-agenda-month`                                                                              |

### Estado escrito pelo JS: sem o prefixo `eds`

Se o seu CSS ou o seu código lê estes atributos, troque o nome. Os que o core estiliza já foram
atualizados no CSS.

| Antes                                                                 | Depois                                          |
| --------------------------------------------------------------------- | ----------------------------------------------- |
| `data-eds-dragging` (colunas da Table)                                | `data-dragging`                                 |
| `data-eds-drop="before"` ou `"after"` (colunas da Table)              | `data-drop-target="before"` ou `"after"`        |
| `data-drop="before"`, `"inside"` ou `"after"` (linha da Tree)         | `data-drop-target` (mesmos valores)             |
| `data-eds-resizing`                                                   | `data-resizing`                                 |
| `data-eds-filtered` (th com filtro por coluna)                        | `data-filtered`                                 |
| `data-eds-cond-hidden`, `data-eds-cond-off`                           | `data-cond-hidden`, `data-cond-off`             |
| `data-eds-lazy` (nó da Tree com filhos por carregar)                  | `data-lazy`                                     |
| `data-eds-max` (opção do MultiSelect bloqueada pelo limite)           | `data-max`                                      |
| `data-eds-create` (opção "Cadastrar novo" do Lookup)                  | `data-create`                                   |
| `data-eds-total` (Table remota)                                       | `data-total`                                    |
| `data-eds-sort-dir`, `data-eds-sort-order` (ordenação múltipla)       | `data-sort-dir`, `data-sort-order`              |
| `data-eds-generated` (resumo gerado do Stepper)                       | `data-generated`                                |
| `data-eds-act` (botões do painel "Colunas")                           | `data-act`                                      |
| `data-eds-mask-raw`, `data-eds-number-raw` (hidden com o valor limpo) | `data-mask-raw`, `data-number-raw`              |
| `data-eds-bound` (PageLoader)                                         | removido (marcador interno, agora em `WeakSet`) |
| `data-eds-original` (campo de renomear da Tree)                       | removido (marcador interno, agora em `WeakMap`) |
| `data-eds-error` (Table remota com erro)                              | `data-state="error"`                            |

### Estados booleanos: presença, não `="true"`

| Antes                                           | Depois                      |
| ----------------------------------------------- | --------------------------- |
| `data-valid="true"`                             | `data-valid`                |
| `data-unread="true"`                            | `data-unread`               |
| `data-copied="true"`                            | `data-copied`               |
| `data-met="true"` e `data-met="false"`          | `data-met` e sem o atributo |
| `data-empty="true"` (saída do Lookup)           | `data-empty`                |
| `data-dirty="true"` (formulário com alterações) | `data-dirty`                |

## Classes e estado CSS

| Antes                                                                                                                       | Depois                                                                                                               |
| --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `.eds-table-sticky-col` (na `<table>`)                                                                                      | `.eds-table-pin-start` nas células da primeira coluna (`th` e `td`), com `.eds-table-pin-edge` na última coluna fixa |
| `data-state="complete"` (Stepper e Wizard)                                                                                  | `data-state="done"`                                                                                                  |
| seletores `[data-valid='true']`, `[data-copied='true']`, `[data-unread='true']`, `[data-met='true']`, `[data-empty='true']` | `[data-valid]`, `[data-copied]`, `[data-unread]`, `[data-met]`, `[data-empty]`                                       |
| seletores `[data-eds-drop]`, `[data-eds-dragging]`, `[data-eds-resizing]`                                                   | `[data-drop-target]`, `[data-dragging]`, `[data-resizing]`                                                           |
| `[data-drop='before']` na Tree                                                                                              | `[data-drop-target='before']`                                                                                        |
| `[data-eds-sort-dir]`                                                                                                       | `[data-sort-dir]`                                                                                                    |

As classes de tom (`-danger`, `-success`…) não mudaram: isso fica para a segunda rodada.

## Mensagens (`configure({ messages })`)

Regras novas: o plural é sempre `<base>One` e `<base>Many` (mais `<base>None` quando há texto para
zero); o prefixo é o do componente; `*Label` é sempre um nome acessível. Quem traduziu as mensagens
precisa renomear as chaves abaixo (as não listadas não mudaram).

| Antes                                                   | Depois                          |
| ------------------------------------------------------- | ------------------------------- |
| `sortedBy`                                              | `tableSortedBy`                 |
| `sortedByMany`                                          | `tableSortedByMany`             |
| `sortAscending`                                         | `tableSortAscending`            |
| `sortDescending`                                        | `tableSortDescending`           |
| `sortThen`                                              | `tableSortThen`                 |
| `sortRemoved`                                           | `tableSortRemoved`              |
| `sortCleared`                                           | `tableSortCleared`              |
| `sortHint`                                              | `tableSortHint`                 |
| `sortMaxReached`                                        | `tableSortMaxReached`           |
| `sortOrderLabel`                                        | `tableSortOrderLabel`           |
| `selectedNone`                                          | `tableSelectedNone`             |
| `selectedOne`                                           | `tableSelectedOne`              |
| `selectedMany`                                          | `tableSelectedMany`             |
| `selectedInSearchNone`                                  | `tableSelectedInSearchNone`     |
| `selectedInSearchOne`                                   | `tableSelectedInSearchOne`      |
| `selectedInSearchMany`                                  | `tableSelectedInSearchMany`     |
| `tableFilterCleared`                                    | `tableFilterClearedMany`        |
| `comboResultsMany`                                      | `comboboxResultsMany`           |
| `comboResultsOne`                                       | `comboboxResultsOne`            |
| `comboNoResults`                                        | `comboboxResultsNone`           |
| `comboError`                                            | `comboboxError`                 |
| `comboLoading`                                          | `comboboxLoading`               |
| `comboSelected`                                         | `comboboxSelected`              |
| `comboMultiSelected`                                    | `comboboxMultiSelected`         |
| `comboMultiRemoved`                                     | `comboboxMultiRemoved`          |
| `comboMultiRequired`                                    | `comboboxMultiRequired`         |
| `comboMaxReached`                                       | `comboboxMaxReachedMany`        |
| `comboMaxReachedOne`                                    | `comboboxMaxReachedOne`         |
| `comboTagRemove`                                        | `comboboxTagRemove`             |
| `rangeChoose`                                           | `daterangeChoose`               |
| `rangeStart`                                            | `daterangeStart`                |
| `rangePeriod`                                           | `daterangePeriod`               |
| `rangeEndBeforeStart`                                   | `daterangeEndBeforeStart`       |
| `rangeMaxDays`                                          | `daterangeMaxDaysMany`          |
| `rangeMaxDaysOne`                                       | `daterangeMaxDaysOne`           |
| `rangeNeedStart`                                        | `daterangeNeedStart`            |
| `rangeNeedEnd`                                          | `daterangeNeedEnd`              |
| `rangeCurrent`                                          | `daterangeCurrent`              |
| `rangeStartLabel`                                       | `daterangeStartLabel`           |
| `rangeEndLabel`                                         | `daterangeEndLabel`             |
| `uploadMaxFiles`                                        | `uploadMaxFilesMany`            |
| `exportDone`                                            | `exportDoneMany`                |
| `treeDeletedOneChild`                                   | `treeDeletedChildrenOne`        |
| `treeDeletedChildren`                                   | `treeDeletedChildrenMany`       |
| `sessionSecond`                                         | `sessionSecondOne`              |
| `sessionSeconds`                                        | `sessionSecondMany`             |
| `sessionMinute`                                         | `sessionMinuteOne`              |
| `sessionMinutes`                                        | `sessionMinuteMany`             |
| `passwordLevel1`                                        | `passwordLevelWeak`             |
| `passwordLevel2`                                        | `passwordLevelFair`             |
| `passwordLevel3`                                        | `passwordLevelGood`             |
| `passwordLevel4`                                        | `passwordLevelStrong`           |
| `filterRemove`                                          | `filterChipRemoveHint`          |
| `filterRemoved`                                         | `filterBarRemoved`              |
| `filterCleared`                                         | `filterBarCleared`              |
| `filterCountNone`                                       | `filterBarCountNone`            |
| `filterCountOne`                                        | `filterBarCountOne`             |
| `filterCountMany`                                       | `filterBarCountMany`            |
| `filterMoreCount`                                       | `filterBarMoreCount`            |
| `columnFilterLabel`                                     | `tableColumnFilterLabel`        |
| `columnFilterActive`                                    | `tableColumnFilterActive`       |
| `columnFilterApply`                                     | `tableColumnFilterApply`        |
| `columnFilterClear`                                     | `tableColumnFilterClear`        |
| `columnFilterApplied`                                   | `tableColumnFilterApplied`      |
| `columnFilterCleared`                                   | `tableColumnFilterCleared`      |
| `columnFilterRangeInvalid`                              | `tableColumnFilterRangeInvalid` |
| `columnFilterMin`                                       | `tableColumnFilterMin`          |
| `columnFilterMax`                                       | `tableColumnFilterMax`          |
| `columnFilterFrom`                                      | `tableColumnFilterFrom`         |
| `columnFilterTo`                                        | `tableColumnFilterTo`           |
| `columnsButton`                                         | `tableColumnsButton`            |
| `columnsTitle`                                          | `tableColumnsTitle`             |
| `columnsRestore`                                        | `tableColumnsRestore`           |
| `columnsRestored`                                       | `tableColumnsRestored`          |
| `columnHidden`                                          | `tableColumnHidden`             |
| `columnShown`                                           | `tableColumnShown`              |
| `columnLastVisible`                                     | `tableColumnLastVisible`        |
| `columnHandleLabel`                                     | `tableColumnHandleLabel`        |
| `columnHandleHelp`                                      | `tableColumnHandleHelp`         |
| `columnGrab`                                            | `tableColumnGrab`               |
| `columnMoved`                                           | `tableColumnMoved`              |
| `columnResized`                                         | `tableColumnResized`            |
| `columnDrop`                                            | `tableColumnDrop`               |
| `columnCancel`                                          | `tableColumnCancel`             |
| `columnMoveBefore`                                      | `tableColumnMoveBefore`         |
| `columnMoveAfter`                                       | `tableColumnMoveAfter`          |
| `columnNarrow`                                          | `tableColumnNarrow`             |
| `columnWiden`                                           | `tableColumnWiden`              |
| `bulkCount`                                             | `tableBulkCountMany`            |
| `bulkCountOne`                                          | `tableBulkCountOne`             |
| `bulkAllResults`                                        | `tableBulkAllResults`           |
| `bulkAllSelected`                                       | `tableBulkAllSelected`          |
| `bulkClear`                                             | `tableBulkClear`                |
| `bulkLabel`                                             | `tableBulkLabel`                |
| `editLabel`                                             | `tableEditLabel`                |
| `editFieldLabel`                                        | `tableEditFieldLabel`           |
| `editHint`                                              | `tableEditHint`                 |
| `editSaved`                                             | `tableEditSaved`                |
| `editSaving`                                            | `tableEditSaving`               |
| `editError`                                             | `tableEditError`                |
| `validateTelefone`                                      | `validatePhone`                 |
| `validateTitulo`                                        | `validateVoterId`               |
| `validatePlaca`                                         | `validatePlate`                 |
| `validateData`                                          | `validateDate`                  |
| `validateDataMin`                                       | `validateDateMin`               |
| `validateDataMax`                                       | `validateDateMax`               |
| `validateDataRange`                                     | `validateDateRange`             |
| `maskInvalidCompetence`                                 | `maskInvalidPeriod`             |
| `filterChips` e `filterChipsLabel` (dois textos iguais) | um só: `filterChipsLabel`       |

Observação: `filterRemove` virou `filterChipRemoveHint` (texto oculto " — remover" do chip do
FilterBar) e `filterChipRemove` ("Remover filtro {label}", na Table) não mudou.

## Funções e tipos do behavior

| Antes                                                                                                                                                                                                                                                                          | Depois                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `isCpfOuCnpj`                                                                                                                                                                                                                                                                  | `isCpfCnpj`                                                                          |
| `isDataValida`                                                                                                                                                                                                                                                                 | `isDate`                                                                             |
| `isIntervaloDatas(inicio, fim)`                                                                                                                                                                                                                                                | `isDateRange(start, end)`                                                            |
| `isTelefone`                                                                                                                                                                                                                                                                   | `isPhone`                                                                            |
| `isTituloEleitor`                                                                                                                                                                                                                                                              | `isVoterId`                                                                          |
| `isPlaca`                                                                                                                                                                                                                                                                      | `isPlate`                                                                            |
| `parseData`                                                                                                                                                                                                                                                                    | `parseDateParts`                                                                     |
| tipo `TelefoneOptions` (`{ tipo: 'fixo', 'celular' ou 'qualquer' }`)                                                                                                                                                                                                           | `PhoneOptions` (`{ type: 'landline', 'mobile' ou 'any' }`)                           |
| tipo `DataOptions`                                                                                                                                                                                                                                                             | `DateOptions`                                                                        |
| `EDS.submitState(form)` (ESM: `submitState`)                                                                                                                                                                                                                                   | `EDS.submit(form)` (ESM: `submit`); devolve `null` se o elemento não for um `<form>` |
| `EDS.tableController` e `EDS.lookupController`                                                                                                                                                                                                                                 | `EDS.table` e `EDS.lookup` (devolvem `null` se o elemento não for do tipo)           |
| `toast.dismiss(id)`                                                                                                                                                                                                                                                            | `toast.close(id)`                                                                    |
| `toast.dismissAll()`                                                                                                                                                                                                                                                           | `toast.closeAll()`                                                                   |
| `format` em `@efds-ui/behavior/export`                                                                                                                                                                                                                                         | `formatMessage`                                                                      |
| `@efds-ui/behavior/balloon` (`tooltipBehavior`, `popoverBehavior`, `placeMenuFallback`, `followScrollTop`, `supportsAnchorPositioning`, `supportsAnchorScope`)                                                                                                                 | `@efds-ui/behavior/internal` (sem garantia de SemVer)                                |
| ajudantes de erro de formulário em `@efds-ui/behavior/validate`: `applyValidator`, `applyValidatorBy`, `isFormControl`, `representativeOf`, `validatableControls`, `composeErrorText`, `fieldLabel`, `fieldMessage`, `summaryTitle`, `validatorMessage` e o tipo `FormControl` | `@efds-ui/behavior/internal`                                                         |
| `announcement`, `clampIndex`, `indexForKey`, `neighborIndexes`, `swipeDirection` e `createCropperController` em `@efds-ui/behavior/image`                                                                                                                                      | `@efds-ui/behavior/internal`                                                         |

A entrada `@efds-ui/behavior/internal` é só para o `@efds-ui/react`. Quem usa HTML ou os componentes
React não precisa importar dela. Se você configura aliases (Vite, Vitest), ponha
`@efds-ui/behavior/internal` antes de `@efds-ui/behavior`.

### Novo

- Exportados: `initCopy`, `initNotifications`, `initConditional`, `initDirtyGuard`, os tipos
  `SessionOptions` e `SessionHandle`, `resetLoaderConfig` e `resetSubmitConfig`.
- `toast.close(id)` e `toast.closeAll()` (também em `window.EDS.toast`).
- `"./package.json"` entre os `exports` do pacote.
- `<script type="application/json" data-eds-tree-items>` para montar a Tree com dados locais.

## Removidos

| O quê                                                                           | Use no lugar                       |
| ------------------------------------------------------------------------------- | ---------------------------------- |
| Formato `mask-cpf` (apelido)                                                    | `cpf-mask`                         |
| Fallback `data-eds-month` da Agenda                                             | `data-eds-agenda-month`            |
| `tableController` e `lookupController` como nomes do pacote completo e de `EDS` | `table` e `lookup`                 |
| `data-state="complete"`                                                         | `data-state="done"`                |
| `.eds-table-sticky-col`                                                         | `.eds-table-pin-start` nas células |
| Evento `eds:dirty-reset`                                                        | `markClean(form)`                  |
| Evento `eds:table-filtered`                                                     | `eds:table-filter`                 |
| Valor `"off"` em atributos booleanos                                            | `="false"`                         |
| `toast.dismiss`, `toast.dismissAll`                                             | `toast.close`, `toast.closeAll`    |
| Entrada `@efds-ui/behavior/balloon`                                             | `@efds-ui/behavior/internal`       |

## Efeito mecânico no React

Sem mudar a API dos componentes React, o pacote precisou acompanhar os nomes acima:

- Reexporta os validadores com os nomes novos (`isCpfCnpj`, `isDate`, `isDateRange`, `isPhone`,
  `isVoterId`, `isPlate`, `validateBy`).
- Emite `data-valid`, `data-copied`, `data-unread`, `data-met` e `data-empty` por presença,
  `data-sort-dir` e `data-sort-order`, `data-drop-target` (Tree) e `data-max` (MultiSelect), e lê
  `data-eds-error-message` e `data-eds-validate-phone-type`.
- O `data-state` do Stepper sai como `done` (a prop `state="complete"` foi removida: veja
  "React: props").
- Importa os ajudantes internos de `@efds-ui/behavior/internal` e `formatMessage` de
  `@efds-ui/behavior/export`; lê as chaves de `Messages` pelos nomes novos.

## React: props

Sem camada de compatibilidade: o nome antigo deixa de existir.

### Retorno de valor: `onValueChange`

Todo controle de formulário passa a avisar por `onValueChange(valor, extra?)`. `onChange` fica só para o evento nativo (Input, Textarea, Select, Checkbox, Radio, Switch); os controles compostos deixam de aceitá-lo. Sortable e Tree seguem com `onChange(itens, mudança)`: trocam coleções, é a exceção documentada.

| Antes                                                       | Depois                                           |
| ----------------------------------------------------------- | ------------------------------------------------ |
| `<Combobox onChange={(valor, opção) => …}>`                 | `<Combobox onValueChange={(valor, opção) => …}>` |
| `<MultiSelect onChange={(valores, opções) => …}>`           | `<MultiSelect onValueChange={…}>`                |
| `<DatePicker onChange={(iso, data) => …}>`                  | `<DatePicker onValueChange={…}>`                 |
| `<DateRangePicker onChange={(período) => …}>`               | `<DateRangePicker onValueChange={…}>`            |
| `<NumberInput onChange={(valor) => …}>`                     | `<NumberInput onValueChange={…}>`                |
| `<OtpInput onChange={(código) => …}>`                       | `<OtpInput onValueChange={…}>`                   |
| `<SegmentedControl onChange={(valor) => …}>`                | `<SegmentedControl onValueChange={…}>`           |
| `<TimePicker onChange={(hora) => …}>`                       | `<TimePicker onValueChange={…}>`                 |
| `<Lookup onChange={(código, item) => …}>`                   | `<Lookup onValueChange={…}>`                     |
| `<FileUpload onChange={(arquivos) => …}>`                   | `<FileUpload onValueChange={…}>`                 |
| `<AvatarUpload onChange={(arquivo, corte) => …}>`           | `<AvatarUpload onValueChange={…}>`               |
| `<ImageCropper onChange={(estado) => …}>`                   | `<ImageCropper onValueChange={…}>`               |
| `<TableColumnFilter onChange={(valor) => …}>`               | `<TableColumnFilter onValueChange={…}>`          |
| `<Editor onChange={(html) => …}>` (`@efds-ui/editor/react`) | `<Editor onValueChange={…}>`                     |

### Tom, abertura e demais nomes

| Antes                                                                                                                                                           | Depois                                                                                                                                                            |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `<Alert variant="danger">`                                                                                                                                      | `<Alert tone="danger">`                                                                                                                                           |
| `<Alert onClose={(evento) => …}>`                                                                                                                               | `<Alert onDismiss={() => …}>` (mostra o botão de fechar)                                                                                                          |
| `<Badge variant="success">`                                                                                                                                     | `<Badge tone="success">`                                                                                                                                          |
| `toast.show({ variant: 'success', … })` (`useToast`)                                                                                                            | `toast.show({ tone: 'success', … })`                                                                                                                              |
| `dialog.alert(texto, título, variant)`, `DialogOptions.variant`                                                                                                 | `dialog.alert(texto, título, tone)`, `DialogOptions.tone`                                                                                                         |
| só a forma posicional `(texto, título?, tipo?, opções?)`                                                                                                        | a posicional continua, e há a forma `(texto, opções)`; `DialogOptions` ganha `title`, `tone` e `defaultValue` (prompt)                                            |
| `<ConfirmButton confirmTitle confirmVariant confirmOkText>`                                                                                                     | `<ConfirmButton confirmOptions={{ title, tone, okText }}>`                                                                                                        |
| `<Stat tone="positive">` e `"negative"`                                                                                                                         | `<Stat tone="success">` e `"danger"` (`warning` e `neutral` não mudam)                                                                                            |
| `<Stepper vertical>`                                                                                                                                            | `<Stepper orientation="vertical">`                                                                                                                                |
| `<DescriptionList horizontal>`                                                                                                                                  | `<DescriptionList orientation="horizontal">`                                                                                                                      |
| `<Avatar circle>`                                                                                                                                               | `<Avatar round>`                                                                                                                                                  |
| `<Image circle>`                                                                                                                                                | `<Image round>`                                                                                                                                                   |
| `<Button status="success">`                                                                                                                                     | `<Button result="success">`                                                                                                                                       |
| `useSubmit().busy`                                                                                                                                              | `useSubmit().loading`                                                                                                                                             |
| `useSubmit().buttonProps.status`                                                                                                                                | `useSubmit().buttonProps.result`                                                                                                                                  |
| `<Tree onSelect={…}>`                                                                                                                                           | `<Tree onSelectedChange={…}>`                                                                                                                                     |
| `<Combobox selectedLabel="Rótulo">`                                                                                                                             | `<Combobox selectedOption={{ value, label }}>`                                                                                                                    |
| `<Lookup buttonLabel dialogTitle>`                                                                                                                              | `<Lookup texts={{ open, title }}>`                                                                                                                                |
| `<Input maskInvalidMessage validateMessage>`                                                                                                                    | `<Input texts={{ maskInvalid, validate }}>`                                                                                                                       |
| `<Breadcrumb>` com "Trilha" fixo no código                                                                                                                      | `texts.label` (o `aria-label` da instância continua valendo)                                                                                                      |
| `<Sidebar>` com "Principal" fixo no código                                                                                                                      | `texts.label` (o `aria-label` da instância continua valendo)                                                                                                      |
| `<PageLoader text="…">`                                                                                                                                         | `<PageLoader texts={{ text: '…' }}>` (`title` continua prop e vence `texts.title`)                                                                                |
| `<PageLoader onClose={(evento) => …}>` (evento nativo)                                                                                                          | `<PageLoader onClose={() => …}>` (o navegador fechou sem o código pedir)                                                                                          |
| "Campo obrigatório." fixo no `TableEditableCell`                                                                                                                | `texts.required`                                                                                                                                                  |
| sufixo ". Atual:" fixo no nome do botão do `DatePicker` e do `DateRangePicker`                                                                                  | `texts.current` (padrão "Atual")                                                                                                                                  |
| `StepperStep.state: 'complete'`                                                                                                                                 | `'done'` (o texto oculto continua em `texts.complete`)                                                                                                            |
| `<Wizard defaultStep>` só não controlado                                                                                                                        | `<Wizard step onStepChange>` controlado, ao lado de `defaultStep`                                                                                                 |
| `<Gallery onIndexChange>` só abria e trocava                                                                                                                    | `<Gallery index defaultIndex onIndexChange>`; `onIndexChange` recebe `null` ao fechar                                                                             |
| `<Dropdown>` sem estado de abertura por prop                                                                                                                    | `open`, `defaultOpen` e `onOpenChange`                                                                                                                            |
| `<Popover>` sem `defaultOpen` nem `ref`                                                                                                                         | `defaultOpen` e `ref` (aponta o painel)                                                                                                                           |
| `CopyButton`, `Field`, `NotificationBell`, `Popover`, `SessionTimeout`, `TableBulkBar`, `TableColumnFilter`, `TableColumnsMenu`, `ImageCropperDialog` sem `ref` | `forwardRef` + `displayName` (o `ref` aponta: botão, `div` do campo, botão do sino, painel, `dialog`, `div` da barra, painel do filtro, painel do menu, `dialog`) |
| providers sem `displayName`                                                                                                                                     | `ToastProvider`, `DialogProvider`, `LocaleProvider`, `PageLoaderProvider` com `displayName`                                                                       |
| `TableHeaderCell sort`/`onSort` sem distinção                                                                                                                   | documentados como caminho manual (avançado); o normal é `sortKey` com `<Table sort onSortChange>`                                                                 |

### API JS (behavior) que o React espelha

| Antes                                             | Depois                                                                           |
| ------------------------------------------------- | -------------------------------------------------------------------------------- |
| `EDS.toast({ variant: 'success', … })`            | `EDS.toast({ tone: 'success', … })`                                              |
| `EDS.alert/confirm/prompt(…, { variant })`        | `EDS.alert/confirm/prompt(…, { tone })`                                          |
| tipos `ToastVariant` e `DialogVariant`            | `ToastTone` e `DialogTone`                                                       |
| `data-eds-confirm-variant` nos exemplos e READMEs | `data-eds-confirm-tone` (o atributo já era este; só a documentação estava velha) |

## React: tipos e exports

| Antes                                                                                                | Depois                                                                                                                                       |
| ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `AlertVariant`, `BadgeVariant`, `ToastVariant`, `DialogVariant`                                      | `AlertTone`, `BadgeTone`, `ToastTone`, `DialogTone`                                                                                          |
| `ButtonStatus`                                                                                       | `ButtonResult`                                                                                                                               |
| `TableSort`                                                                                          | `TableAriaSort`                                                                                                                              |
| `StepState` (`complete`, `done`, `current`, `upcoming`, `error`)                                     | `StepperStepState` (`done`, `current`, `upcoming`, `error`); novo `StepperOrientation`                                                       |
| `PasswordTexts`                                                                                      | `PasswordInputTexts`                                                                                                                         |
| `OtpTexts`                                                                                           | `OtpInputTexts`                                                                                                                              |
| `SegmentedOption`                                                                                    | `SegmentedControlOption`                                                                                                                     |
| `SegmentedSize`                                                                                      | `SegmentedControlSize`                                                                                                                       |
| `DescriptionItem`                                                                                    | `DescriptionListItem`                                                                                                                        |
| `ActiveFilter`                                                                                       | `FilterBarActiveFilter`                                                                                                                      |
| `FormValidationProps`                                                                                | `FormValidationFormProps`                                                                                                                    |
| `EditorMessages` (`@efds-ui/editor` e `@efds-ui/editor/react`)                                       | `EditorTexts`                                                                                                                                |
| `EditorRef`                                                                                          | `EditorHandle`                                                                                                                               |
| `SessionTimeoutOptions`                                                                              | `UseSessionTimeoutOptions`                                                                                                                   |
| `SessionTimeoutState`                                                                                | `UseSessionTimeoutResult`                                                                                                                    |
| `UnsavedChangesOptions`                                                                              | `UseUnsavedChangesOptions`                                                                                                                   |
| `SectionProgressOptions`                                                                             | `UseSectionProgressOptions`                                                                                                                  |
| `SectionProgress`                                                                                    | `UseSectionProgressResult`                                                                                                                   |
| `StatTone` = `positive \| negative \| warning \| neutral`                                            | `StatTone` = `success \| danger \| warning \| neutral`                                                                                       |
| `BannerTone`, `TagTone`, `ProgressTone`, `TimelineTone`, `AgendaTone`, `IconDiscTone` escritos à mão | derivados de `Tone` com `Extract<>` (a lista de valores não mudou; `TimelineTone` ganha `neutral` e `ProgressTone` ganha `accent`, o padrão) |
| `DialogOptions` sem `title`, `tone` e `defaultValue`                                                 | com os três; `DialogApi` vira `DialogAlert`, `DialogConfirm` e `DialogPrompt` (duas formas de chamada)                                       |
| tipos usados em props e não exportados                                                               | `OtpKind`, `PasswordLevel`, `ComboboxFilter`, `FilterValue`, `Placement`, `DialogShellTexts` e `CalendarTexts` passam a sair da raiz         |
| apelidos de tamanho ausentes                                                                         | `LookupSize`, `NumberInputSize` e `AvatarUploadSize`                                                                                         |
| textos de Input, Breadcrumb e PageLoader sem tipo                                                    | `InputTexts`, `BreadcrumbTexts` e `PageLoaderDialogTexts`                                                                                    |
| `defaultImageCropperTexts` e `DEFAULT_LOCALE` nos índices dos componentes (nunca saíram da raiz)     | removidos dos índices, como os demais `default*Texts` (os padrões ficam internos; troque-os por `texts`)                                     |

## Tom (HTML e React)

Uma regra só: a **classe modificadora** `eds-<componente>-<tom>`, como Alert, Badge, Banner e Toast já faziam. O tom padrão de cada componente não emite classe. `data-tone` e `data-variant` deixam de existir no core.

| Antes                                                                                                                           | Depois                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `.eds-tag[data-tone="info"]`                                                                                                    | `.eds-tag.eds-tag-info` (`accent`, `info`, `success`, `warning`, `danger`; `neutral` é o padrão)                                   |
| `.eds-timeline-item[data-tone="success"]`                                                                                       | `.eds-timeline-item.eds-timeline-item-success`                                                                                     |
| `.eds-progress[data-tone="danger"]`                                                                                             | `.eds-progress.eds-progress-danger` (`info`, `success`, `warning`, `danger`)                                                       |
| `.eds-stat-delta[data-tone="positive"]`                                                                                         | `.eds-stat-delta.eds-stat-delta-success`                                                                                           |
| `.eds-stat-delta[data-tone="negative"]`                                                                                         | `.eds-stat-delta.eds-stat-delta-danger`                                                                                            |
| `.eds-stat-delta[data-tone="warning"]`                                                                                          | `.eds-stat-delta.eds-stat-delta-warning` (`neutral` é o padrão, sem classe)                                                        |
| `.eds-icon-disc[data-tone="success"]`                                                                                           | `.eds-icon-disc.eds-icon-disc-success` (`neutral`, `info`, `success`, `warning`, `danger`; `accent` é o padrão)                    |
| `.eds-agenda-event[data-tone="info"]`                                                                                           | `.eds-agenda-event.eds-agenda-event-info` (`neutral`, `info`, `success`, `warning`, `danger`; `accent` é o padrão)                 |
| `.eds-alert-dialog[data-variant="danger"]`                                                                                      | `.eds-alert-dialog.eds-alert-dialog-danger` (`success`, `warning`, `danger`; `info` e `question` usam o visual padrão)             |
| `.eds-avatar-circle`                                                                                                            | `.eds-avatar-round`                                                                                                                |
| `.eds-image-circle`                                                                                                             | `.eds-image-round`                                                                                                                 |
| `AgendaEvent.tone` no behavior emitia `data-tone`                                                                               | o behavior acrescenta a classe `eds-agenda-event-<tom>` (sem classe para `accent`)                                                 |
| diálogos rápidos do behavior e o aviso de sessão com `data-variant`                                                             | classe `eds-alert-dialog-<tom>` (o aviso de sessão usa `eds-alert-dialog-warning`)                                                 |
| `<Tag tone>`, `<Timeline items[].tone>`, `<Progress tone>`, `<Stat tone>`, `<IconDisc tone>`, `<Agenda events[].tone>` no React | mesma prop, agora emitem a classe; `<Alert>`, `<Badge>`, `<Toast>` e `<Dialog>` passam de `variant` a `tone` (veja "React: props") |

O `neutral` não foi acrescentado ao Alert, ao Toast nem ao Dialog: não há visual neutro no CSS desses componentes.

## Abertura

Regra (também em `docs/architecture/react.md`): **diálogos** (Modal, Drawer, ImageCropperDialog, PageLoader) são controlados por `open` e avisam o pedido de fechar por `onClose`; **disclosures** (Accordion, CommandPalette, Popover, Dropdown) usam `open`, `defaultOpen` e `onOpenChange`.

| Antes                                                          | Depois                                                                                                   |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `<Dropdown>` só com `onOpenChange` (o estado era do `popover`) | `<Dropdown open defaultOpen onOpenChange>`                                                               |
| `<Popover open onOpenChange>` sem `defaultOpen`                | `<Popover open defaultOpen onOpenChange>`                                                                |
| `<PageLoader onClose={(evento) => …}>` (evento `close` nativo) | `<PageLoader onClose={() => …}>`, o pedido de fechar (Esc duplo); o componente se reabre enquanto `open` |
| `<Gallery>` abria só por clique                                | `<Gallery index defaultIndex>` abre o visualizador por prop (`null` = fechado)                           |
