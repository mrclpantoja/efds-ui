# Changelog

Todas as mudanças relevantes do eDS.ui. Mantido à mão. Versão única para `@eds-ui/core`, `@eds-ui/themes`, `@eds-ui/react`, `@eds-ui/icons` e `@eds-ui/behavior`.

## 0.1.0 (MVP, ainda não publicado)

Pré-lançamento: os pacotes seguem `private` até a verificação do nome/escopo `@eds-ui`. Licença: MIT.

### @eds-ui/core

- Tokens em três níveis (Primitive, Semantic, Component), gerados de JSON (`pnpm tokens`).
- Eixos do Adaptive Surface por atributo: `data-theme`, `data-mode`, `data-density`, `data-shape`.
- Base (reset, tipografia por classes `.eds-text-*`, acessibilidade) e layout (Container, Grid por container queries, Stack, app shell).
- 25 componentes do MVP, um CSS por componente: Foundation, Actions (Button), Forms, Surfaces (Card, Modal, Drawer), Navigation (Navbar, Sidebar, Tabs, Breadcrumb), Feedback (Alert, Toast, Badge, Spinner, Skeleton) e Data (Table com Pagination e Empty State).
- CSS completo (`index.css`) e importação seletiva por arquivo, cada um começando pela ordem de `@layer`.
- Fase 6e: `alert-dialog.css` (diálogos rápidos sobre `.eds-modal`: ícone por tipo, ações empilhadas abaixo de 400px, entrada por escala), `sortable.css` (item, pegador, placeholder, fantasma, alvo de soltar, quadro) e `tree.css` (linha, guias por nível, chevron, ações "⋯", indicadores de soltar, fantasma); `.eds-toast-action` no Toast.

### @eds-ui/themes

- Temas blue, green, purple, orange e neutral; modos light e dark; densidades compact, comfortable e spacious; formas sharp, soft e rounded. Cores com contraste WCAG 2.2 AA calculado.

### @eds-ui/react

- 26 componentes `forwardRef` sobre as classes do core, sem CSS próprio; peer React 18 ou 19.
- Exigências de acessibilidade no tipo (por exemplo `iconOnly` exige `aria-label`).
- Modal e Drawer sobre `<dialog>`; Dropdown como disclosure; Toast via `ToastProvider` e `useToast`.
- Fase 6e: `DialogProvider` e `useDialog()` (`alert`, `confirm`, `prompt` por Promise, textos configuráveis), `Sortable` e `SortableGroup` (arrastar e soltar com alternativa por teclado, quadro entre listas, `name` para formulário) e `Tree` (APG, edição, mover por teclado e arrasto, filhos sob demanda por `loadChildren`, desfazer exclusão); `ToastOptions.action` (botão no toast).
- Exportação de tabelas: `TableExport` (botão "Exportar" com menu em Dropdown, formatos `csv`, `xlsx`, `json`, `pdf`; a fonte é o estado, por `data` ou `getData`; `onBeforeExport` altera os dados (mascarar CPF, retirar colunas) ou cancela com `false`; `onExport`; textos e rótulos substituíveis; anúncio do resultado em `role="status"`) e as funções `exportData`, `toCsv`, `toJson`, `toXlsx` e `toPdf` com seus tipos. **Passa a depender de `@eds-ui/behavior`** (`workspace:*`), mas importa só o subcaminho `@eds-ui/behavior/export` (sem `init`, sem auto-init, sem os outros módulos).

### @eds-ui/icons

- 24 ícones como componentes React (SVG, `currentColor`), com tree shaking.

### Empacotamento

- Tarballs só com `dist/` (mais `package.json`, `README.md` e `LICENSE`); `pnpm pack:check` valida o conteúdo, exige o `LICENSE`, confere os alvos de `exports` e a ausência de `workspace:`.
- Licença MIT: `LICENSE` na raiz e em cada pacote publicável; `"license": "MIT"` em todos os `package.json`.
- A fonte Inter e o CSS do core ficam por conta do consumidor.

### @eds-ui/behavior

- Comportamento em JavaScript puro (zero dependências) para quem usa só HTML: Tabs, Modal/Drawer, Dropdown, Toast, Alert fechável, Table (ordenação e seleção), Sidebar e Combobox.
- `init(root, options)` devolve `destroy()`, observa o `root` (MutationObserver) e não liga nada fora dele. ESM tree-shakeable (`initTabs`, `initCombobox`...) e IIFE `dist/eds-behavior.js` com `window.EDS` e auto-init (`data-eds-manual` desliga).
- PageLoader automático (ligado por padrão): intercepta fetch, XHR, envio de form e navegação por link; `data-eds-loader="auto|manual|off"` na tag do script ou `loader` nas opções; exceções por atributo, opção de fetch, cabeçalho e lista `exclude`; `destroy` restaura `fetch` e XHR.
- Combobox (APG list autocomplete) com filtro local e fonte remota (`data-eds-source`).
- PageLoader: saída após demora (`slowAfter`, 20 s: "Continuar aguardando" / "Fechar"), `navigationTimeout` 10 s, navegação cancelada detectada por `beforeunload`, downloads ignorados, reabre se fechado por fora, `trigger: "all" | "user"`; Combobox com validação de escolha (`setCustomValidity`, `data-eds-free-text`), anúncios de carregando/seleção e destaque por ponteiro.
- Combobox múltiplo (`data-eds-multiple`, MultiSelect): etiquetas removíveis, Enter/clique alternam com a lista aberta, Backspace remove a última, hidden `name[]` por valor, `data-eds-max-selected`, obrigatório por `aria-required`, `eds:combobox-change` com `{ values, labels }`.
- FileUpload (`data-eds-upload`, `initUpload`): arrastar e soltar, acumula seleções, validação de `accept`/tamanho/quantidade, modo formulário (`input.files` via `DataTransfer`) e modo imediato por XHR (`data-eds-upload-url`: progresso, abortar ao remover, tentar de novo, hidden com o id, submit bloqueado durante o envio); eventos `eds:upload-*`.
- DatePicker (`data-eds-datepicker`) e DateRangePicker (`data-eds-daterange`, `initDatepicker`): calendário APG em diálogo montado pelo JS, máscara dd/mm/aaaa, colar ISO, validação nativa, min/max/datas bloqueadas/fins de semana, período com prévia e `data-eds-max-days`, `eds:date-change` e `eds:daterange-change`. Datas sem fuso.
- Table: filtro local de linhas por `data-eds-table-filter` (sem acento e sem caixa, `data-eds-filter-columns`, `data-eds-filter-ignore`, linha de vazio, status e evento `eds:table-filter`). Com filtro, "selecionar todos" e a contagem de selecionados olham só as linhas visíveis.
- Fase 6e, diálogos rápidos: `alert(texto, título?, tipo?)`, `confirm(...)` e `prompt(texto, padrão?, título?)` por Promise (também em `window.EDS`), cinco tipos, fila de um diálogo por vez, prompt com `required`/`validate` e erro visível, `options` (`okText`, `cancelText`, `placeholder`, `inputType`...). `window.alert` só é trocado por opt-in (`data-eds-native-alert` ou `init(root, { nativeAlert: true })`) e **não bloqueia**.
- Confirmação declarativa: `data-eds-confirm` (+ `-title`, `-variant`, `-ok`) em `button`, `a` e `form` (`initConfirm`): só prossegue confirmado; botão de envio usa `form.requestSubmit(submitter)`; não reentra no próprio interceptador.
- Fase 6e, Sortable (`data-eds-sortable`, `initSortable`): reordenar e trocar itens entre contêineres do mesmo `data-eds-group` por Pointer Events (toque sem pegador exige segurar 400 ms) e por teclado (WCAG 2.5.7), orientação vertical/horizontal/grade, `data-eds-name` (hidden por item), `data-eds-disabled`; evento `eds:sortable-change` com `order` (mesmo nome do evento da Table).
- Fase 6e, Tree (`data-eds-tree`, `initTree`): APG Tree View com type-ahead e multisseleção; edição (`data-eds-editable`: renomear, adicionar filho/irmão/pai, excluir com confirmação e "Desfazer" por 8 s, mover por Alt+setas ou arrastando por zonas, menu "⋯"); fonte por JSON (`data-eds-source`) e filhos sob demanda (`data-eds-children-url`); eventos `eds:tree-change`, `-beforechange` (cancelável), `-select`, `-activate`, `-toggle`.
- Toast: opção `action: { label, onClick }` (botão que executa e fecha).
- Exportação de tabelas, sem dependência: CSV (`;`, BOM, CRLF, proteção contra injeção de fórmula), JSON, XLSX (ZIP e OOXML escritos à mão: cabeçalho congelado em negrito, autofiltro, formatos de número, moeda, percentual e data) e PDF (A4, Helvetica padrão com larguras AFM, retrato ou paisagem, fonte reduzida a 7 pt quando as colunas não cabem, várias páginas com cabeçalho repetido e rodapé "Página N de M"). Ligação HTML por `data-eds-export` (+ `-target`, `-filename`, `-title`, `-subtitle`, `-scope`), `th[data-type]`, `td[data-value]` e `data-eds-export-ignore`; eventos `eds:table-beforeexport` (cancelável; `detail.data` pode ser alterado para mascarar) e `eds:table-export`. Datas anteriores a 01/03/1900 saem como texto no XLSX (o Excel desloca ou não representa essas séries).
- Subcaminho `@eds-ui/behavior/export` (só os geradores e os tipos, sem DOM além do download), usado pelo `@eds-ui/react`; `exports` com a condição `development` apontando ao código-fonte e `publishConfig.exports` para o `dist/`.

### Correções da Fase 7 (validação)

- PageLoader: o `keydown` Esc recebe `preventDefault`, então o segundo Esc seguido do Chrome (que não gera `cancel` cancelável) já não fecha o diálogo.
- Table: ao limpar o filtro, o anúncio inclui as linhas marcadas que continuam selecionadas ("Filtro removido. 8 linhas. 2 selecionados."). Em alto contraste (`forced-colors`), a linha selecionada usa `outline` (a barra inset em `box-shadow` é anulada).
- Button em carregamento (`aria-busy`): `initButtonBusy` ignora também Enter e Espaço (não só o clique do mouse) e mantém o foco no botão.
- Combobox, MultiSelect e DatePicker/DateRangePicker: o erro de validação nativa (`invalid`, envio com campo obrigatório vazio ou valor inválido) passa a aparecer na tela, em `p.eds-error` ligado por `aria-describedby` e `aria-invalid`, e não só no balão do navegador.
- Toast: com um Modal aberto a região vai para dentro do `dialog`; ao mudar de lugar com toasts dentro, fica com `aria-live="off"` por 60 ms para o leitor de tela não reler os que já estavam visíveis.
- Tabs: o `tabindex="0"` fica sempre na aba selecionada (a aba desabilitada focada por seta não vira parada de Tab), no behavior e no React.
- FileUpload: depois de "Tentar de novo" o foco vai ao botão Remover do mesmo item (o de reenviar some).
- Anunciador de status do React: o texto é enfileirado por microtask, como no behavior, em vez de `setTimeout` (abas em segundo plano atrasam timers e juntariam anúncios de ações diferentes).
- Breadcrumb: item mais largo que o contêiner quebra linha em vez de ganhar reticências (nada é cortado).

### Revisão de UX da Fase 6e

- Sortable (behavior): o `destroy` remove `aria-describedby`, `tabindex`, `role` e `aria-disabled` que o JS adicionou; ao reinicializar, a instrução de teclado volta a ser referenciada.
- Tree (behavior e React): Ctrl/Cmd+Z desfaz a última exclusão enquanto o toast "Desfazer" estiver na tela, e a fala da exclusão cita o atalho. Falha ao carregar filhos aparece no nó (`.eds-tree-error`, `data-error`) e é anunciada com o nome do nó. Falas neutras: "Item excluído/adicionado/renomeado/restaurado: X", com a contagem de subitens na exclusão; o primeiro nome de um item novo fala "adicionado". Mensagens novas no behavior: `treeDeletedOneChild`, `treeDeletedChildren`, `treeUndoHint`, `treeAddedNamed`, `treeNodeLoadError`, `treeNodeLoadErrorInline`.
- React: `TreeTexts.deleted(label, descendants)`, `undoHint`, `addedNamed`, `loadErrorInline`; `loadError` passa a ser `(label) => string`. `ToastOptions.onClose` novo.
- Diálogos: `confirm` e `prompt` do tipo `danger` usam o prefixo oculto "Atenção:" ("Erro:" só no `alert`); o rótulo oculto do prompt é o título (ou o texto, sem título) e o campo usa `aria-required`, no behavior e no React.
- Core: `.eds-error[hidden]`/`.eds-success[hidden]` ficam ocultos (o `display:flex` vencia o atributo); linhas da Tree sem seleção de texto ao arrastar; menu "⋯" da Tree ancorado ao botão com folga das bordas (sem anchor positioning, cai no centro); diálogos rápidos com título h3 e texto body-lg; lista vazia do Sortable tracejada (texto opcional `data-eds-empty`); item "pego" com fundo, sombra e elevação; destino proibido da Tree com contorno tracejado e ícone.
