# Changelog

Todas as mudanças relevantes do efDS.ui. Mantido à mão. Versão única para `@efds-ui/core`, `@efds-ui/themes`, `@efds-ui/react`, `@efds-ui/icons`, `@efds-ui/behavior` e `@efds-ui/editor`.

## 0.1.2 (24/11/2026)

Primeira versão publicada pelo GitHub Actions, com proveniência (selo que liga cada pacote ao commit e ao build que o geraram). Sem mudança de API.

### @efds-ui/core

- Sidebar: título de seção em caixa alta pequena e espaçada (`--eds-font-size-overline`, `--eds-letter-spacing-caps`), com filete entre seções; na Sidebar expandida o título quebra linha em vez de ser cortado.
- Tokens novos: primitivos `--eds-font-size-11` e `--eds-letter-spacing-wide`; semânticos `--eds-font-size-overline` e `--eds-letter-spacing-caps`.

### Todos os pacotes

- Código-fonte público: campos `repository` e `bugs` no `package.json` e seção "Código-fonte" no README, com link para https://github.com/mrclpantoja/efds-ui.

## 0.1.1 (22/11/2026)

Só documentação dos pacotes; nenhuma mudança de código, CSS ou API.

- READMEs revistos para a página do npm: links para o site de documentação e para os pacotes no npm (os relativos ao repositório não funcionavam lá), instalação por `npm install` ou `pnpm add`, uso por CDN no core e no themes, endereço real do CDN no editor.

## 0.1.0 (22/11/2026)

Primeira versão publicada no npm (organização `efds-ui`) e no jsDelivr/unpkg. Licença: MIT. Documentação: https://efds-ui.com.br.

### @efds-ui/core

- Tokens em três níveis (Primitive, Semantic, Component), gerados de JSON (`pnpm tokens`).
- Eixos do Adaptive Surface por atributo: `data-theme`, `data-mode`, `data-density`, `data-shape`.
- Base (reset, tipografia por classes `.eds-text-*`, acessibilidade) e layout (Container, Grid por container queries, Stack, app shell).
- 25 componentes base, um CSS por componente: Foundation, Actions (Button), Forms, Surfaces (Card, Modal, Drawer), Navigation (Navbar, Sidebar, Tabs, Breadcrumb), Feedback (Alert, Toast, Badge, Spinner, Skeleton) e Data (Table com Pagination e Empty State).
- CSS completo (`index.css`) e importação seletiva por arquivo, cada um começando pela ordem de `@layer`.
- Fase 6e: `alert-dialog.css` (diálogos rápidos sobre `.eds-modal`: ícone por tipo, ações empilhadas abaixo de 400px, sem animação de entrada ou saída), `sortable.css` (item, pegador, placeholder, fantasma, alvo de soltar, quadro) e `tree.css` (linha, guias por nível, chevron, ações "⋯", indicadores de soltar, fantasma); `.eds-toast-action` no Toast.
- Máscara de entrada: `.eds-input[data-eds-mask='moeda'|'numero']` alinha o valor ao fim, com algarismos tabulares (seletor por atributo; só tokens semânticos).

### @efds-ui/themes

- Temas blue, green, purple, orange e neutral; modos light e dark; densidades compact, comfortable e spacious; formas sharp, soft e rounded. Cores com contraste WCAG 2.2 AA calculado.

### @efds-ui/react

- Wrappers `forwardRef` sobre as classes do core para todos os componentes (42 diretórios de componente), sem CSS próprio; peer React 18 ou 19.
- Exigências de acessibilidade no tipo (por exemplo `iconOnly` exige `aria-label`).
- Modal e Drawer sobre `<dialog>`; Dropdown como disclosure; Toast via `ToastProvider` e `useToast`.
- Fase 6e: `DialogProvider` e `useDialog()` (`alert`, `confirm`, `prompt` por Promise, textos configuráveis), `Sortable` e `SortableGroup` (arrastar e soltar com alternativa por teclado, quadro entre listas, `name` para formulário) e `Tree` (APG, edição, mover por teclado e arrasto, filhos sob demanda por `loadChildren`, desfazer exclusão); `ToastOptions.action` (botão no toast).
- Exportação de tabelas: `TableExport` (botão "Exportar" com menu em Dropdown, formatos `csv`, `xlsx`, `json`, `pdf`; a fonte é o estado, por `data` ou `getData`; `onBeforeExport` altera os dados (mascarar CPF, retirar colunas) ou cancela com `false`; `onExport`; textos e rótulos substituíveis; anúncio do resultado em `role="status"`) e as funções `exportData`, `toCsv`, `toJson`, `toXlsx` e `toPdf` com seus tipos. **Passa a depender de `@efds-ui/behavior`** (`workspace:*`), mas importa só o subcaminho `@efds-ui/behavior/export` (sem `init`, sem auto-init, sem os outros módulos).
- Máscara de entrada no `Input`: `mask` (`telefone`, `cpf`, `cnpj` com letras, `cpf-cnpj`, `cep`, `moeda`, `numero` ou um padrão como `"00.000-AAA"`), `maskOptions` (`decimals`, `prefix`, `negative`), `unmask` (hidden com o valor limpo quando há `name`) e `onValueChange(masked, raw)`. Controlado e não controlado; `onChange` recebe o valor já mascarado; emite `data-eds-mask`, `inputmode`, `autocomplete` (telefone e CEP) e `maxlength` sem sobrescrever os do autor. Usa o núcleo `@efds-ui/behavior/mask`.

### @efds-ui/icons

- 24 ícones próprios como componentes React (SVG, `currentColor`), com tree shaking; catálogo com busca e cópia (React ou SVG para HTML) na página Fundamentos › Ícones.

### Empacotamento

- Tarballs só com `dist/` (mais `package.json`, `README.md` e `LICENSE`); `pnpm pack:check` valida o conteúdo, exige o `LICENSE`, confere os alvos de `exports` e a ausência de `workspace:`.
- Licença MIT: `LICENSE` na raiz e em cada pacote publicável; `"license": "MIT"` em todos os `package.json`.
- A fonte Inter e o CSS do core ficam por conta do consumidor.

### @efds-ui/behavior

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
- Fase 6e, Sortable (`data-eds-sortable`, `initSortable`): reordenar e trocar itens entre contêineres do mesmo `data-eds-group` por Pointer Events (toque sem pegador exige segurar 400 ms) e por teclado (WCAG 2.5.7), orientação vertical/horizontal/grade, `data-eds-name` (hidden por item), `data-eds-disabled`; evento `eds:sortable-change` com `order` (distinto do `eds:table-sort` da Table).
- Fase 6e, Tree (`data-eds-tree`, `initTree`): APG Tree View com type-ahead e multisseleção; edição (`data-eds-editable`: renomear, adicionar filho/irmão/pai, excluir com confirmação e "Desfazer" por 8 s, mover por Alt+setas ou arrastando por zonas, menu "⋯"); fonte por JSON (`data-eds-source`) e filhos sob demanda (`data-eds-children-url`); eventos `eds:tree-change`, `-beforechange` (cancelável), `-select`, `-activate`, `-toggle`.
- Toast: opção `action: { label, onClick }` (botão que executa e fecha).
- Exportação de tabelas, sem dependência: CSV (`;`, BOM, CRLF, proteção contra injeção de fórmula), JSON, XLSX (ZIP e OOXML escritos à mão: cabeçalho congelado em negrito, autofiltro, formatos de número, moeda, percentual e data) e PDF (A4, Helvetica padrão com larguras AFM, retrato ou paisagem, fonte reduzida a 7 pt quando as colunas não cabem, várias páginas com cabeçalho repetido e rodapé "Página N de M"). Ligação HTML por `data-eds-export` (+ `-target`, `-filename`, `-title`, `-subtitle`, `-scope`), `th[data-type]`, `td[data-value]` e `data-eds-export-ignore`; eventos `eds:table-beforeexport` (cancelável; `detail.data` pode ser alterado para mascarar) e `eds:table-export`. Datas anteriores a 01/03/1900 saem como texto no XLSX (o Excel desloca ou não representa essas séries).
- Subcaminho `@efds-ui/behavior/export` (só os geradores e os tipos, sem DOM além do download), usado pelo `@efds-ui/react`; `exports` com a condição `development` apontando ao código-fonte e `publishConfig.exports` para o `dist/`.
- Máscara de entrada (`input[data-eds-mask]`, `initMask`): máscaras prontas `telefone` (8 ou 9 dígitos), `cpf`, `cnpj` (alfanumérico: 12 primeiras posições aceitam A-Z e 0-9, letras viram maiúsculas), `cpf-cnpj` (alterna pelo tamanho), `cep`, `moeda` (centavos primeiro; `data-eds-mask-decimals`, `-prefix`, `-negative`) e `numero`; padrão personalizado (`0` dígito, `A` letra, `*` letra ou dígito, `\\` escapa). Cursor preservado ao digitar, apagar no meio e apagar literal (Backspace/Delete sobre o literal apagam o dígito vizinho); colar com ou sem máscara nunca é bloqueado (o `maxlength` não corta o texto colado; "+55" some do telefone; moeda lê o texto colado como número); `data-eds-mask-unmask` troca o `name` por um hidden com o valor limpo (moeda: `1234.56`); valor atribuído por script é refeito no blur, no `change` e no envio; evento `eds:mask-change`; sem anúncio por tecla e sem validação.
- Subcaminho `@efds-ui/behavior/mask` (só o núcleo da máscara, sem DOM), usado pelo `@efds-ui/react` para os dois se comportarem igual.

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

### Lista de melhorias, onda A (contrato e correções)

**@efds-ui/core e @efds-ui/themes**

- Densidade varia toda a escala de controles: sm/md/lg = 28/32/36 px (compacto), 32/38/44 (confortável), 38/44/52 (espaçoso); `inset-sm/md/lg` semânticos no lugar de `space-4` variável; degraus de espaço de 2 e 20 px.
- Tokens novos: `z-*` (camadas), `motion-duration-slow`, `border-width` e `border-width-strong`, `icon-size-sm..xl`, `target-min` (2,75 rem, alvo de toque), `layout-dialog-*`, `layout-table-min`, `layout-breakpoint-*`; `radius-xl` varia com `data-shape`. Literais de z-index, duração, borda e ícone saíram dos componentes.
- Tipografia: primitivo `font-size-18` disponível; `h4` segue 16 px (Especificação Visual).
- Estilos de impressão (`base/print.css`, `.eds-no-print`): sem navegação, toasts nem colunas de seleção e ações; app shell sem rolagem interna; cores legíveis em papel também a partir do modo escuro; tabelas com cabeçalho repetido e linhas inteiras; links externos com o endereço.
- Toque: campos com 16 px em `pointer: coarse` (evita o zoom do iOS) e alvo mínimo em checkbox, radio, switch e seleção da Table.
- Modal `.eds-modal-full`: tela cheia sem margem nem raio abaixo de 768 px, cabeçalho e rodapé fixos e corpo rolável; a partir de 768 px volta a margem e o raio do diálogo.
- Select, Combobox e MultiSelect em somente leitura (`aria-readonly="true"`): fundo do Input readonly, sem hover, seta atenuada.
- Seleção da Table: o checkbox dentro de `<label class="eds-check">` faz da célula inteira o alvo (mínimo `--eds-target-min` em ponteiro grosso), sem mudar a largura da coluna; o checkbox direto continua aceito.
- Estado `:active` discreto (só tokens) em Navbar, Breadcrumb, opção do Combobox, dia do calendário, linha da Tree e ordenação da Table; tamanhos `-sm`/`-lg` de Textarea, Radio, Switch e Badge documentados.

**@efds-ui/behavior**

- Eventos no padrão `eds:<componente>-<ação>`: `eds:table-sort`, `eds:table-select-change` e `eds:alert-dismiss` (antes sem o prefixo do componente, sem camada de compatibilidade); novos `eds:modal-close`, `eds:drawer-open`, `eds:drawer-close`, `eds:dropdown-open` e `eds:dropdown-close`. `eds:modal-open` sai também quando o diálogo é aberto por `showModal()` no código (`detail.trigger = null`); os de fechamento saem por qualquer caminho, com `detail.returnValue`.
- `configure({ locale })` (padrão `pt-BR`) e `resetLocale()`: collator da Table, nomes de mês e dia do calendário e exportador (ordem da data, separadores, formato de data do XLSX e `/Lang` do PDF); `ExportOptions.locale`. `Messages.dateLocale` removida.
- `readonly` em Combobox, MultiSelect, DatePicker e DateRangePicker: não abrem a lista nem mudam o valor (também por colagem); `aria-readonly`.
- Desempenho: auto-init com um seletor combinado por nó adicionado, e na remoção só os elementos ligados dentro dos nós removidos; Table com texto normalizado por linha em cache no filtro, cada valor interpretado uma vez e reinserção numa só operação na ordenação; Combobox com rótulos normalizados em cache, espera de 80 ms acima de 200 opções e reposicionamento no máximo uma vez por quadro; Tree com renumeração e JSON uma vez por lote e itens visíveis em cache; PageLoader sem criar objetos em chamadas excluídas. Tetos práticos documentados (Table ~1.000 linhas, Tree ~2.000 nós, Combobox local ~500 opções).
- Novo `dist/eds-behavior-core.js`: o mesmo `window.EDS` sem o exportador e sem a máscara (~41 kB com gzip, contra ~54 kB do `eds-behavior.js` completo, medidos após a onda B).
- Subentradas `@efds-ui/behavior/export/{csv,json,xlsx,pdf}` (`exportFile(dados, opções)`) para carregar um formato sob demanda; `@efds-ui/behavior/export` continua igual.

**@efds-ui/react**

- Textos internos: todos os componentes usam a prop `texts` (objeto parcial, padrões em pt-BR); saem `severityLabel(s)`, `closeLabel`, `labels`, `messages`, `formatLabels`, `skipLinkLabel`, `collapseLabel` e as props soltas de mensagem do Combobox, MultiSelect e PageLoaderProvider.
- `LocaleProvider` / `useLocale()` definem o idioma do `Intl` (DatePicker, DateRangePicker, TableExport); a prop `locale` do componente vence o provider.
- Table: ordenação controlada (`sort`, `onSortChange`, `TableHeaderCell sortKey`, anúncio no status), utilitários `sortTableData` e `filterTableData` e o hook `useTableFilter`, com as mesmas regras do behavior (`core/data.ts`). Coluna de seleção com `<label class="eds-check">` ampliando o alvo.
- `ConfirmButton` (equivalente do `data-eds-confirm`, exige `DialogProvider`); `readOnly` em Select, Combobox, MultiSelect e DateRangePicker; `size` em Textarea, Checkbox, Radio, Switch e Badge; Modal `size="full"`.
- Publicado com um arquivo por módulo (`preserveModules`) para tree-shaking real; `dist/index.js` só reexporta.
- `TableExport` carrega o gerador de cada formato sob demanda (`import()` no clique; hover e foco pré-carregam).

**Revisão de UX da onda A**

- `<select aria-readonly="true">` em HTML puro passa a ser de fato somente leitura (`initSelectReadonly` no behavior: a lista não abre e a escolha não muda; o campo segue focável e vai no envio).
- Impressão: botões sólidos, caixas marcadas, chaves ligadas e o dia escolhido do calendário imprimem o fundo (`print-color-adjust: exact`), sem rótulo branco sobre papel branco.
- Documentação: página Ícones com nome acessível nos botões de copiar ("React: copiar importação de X") e duas colunas a 320 px.

### Lista de melhorias, onda B (componentes de tela)

**@efds-ui/core**

- Accordion (`<details>` nativo, grupo exclusivo por `name`, variante `-flush`, item desabilitado por `aria-disabled`).
- Tooltip e Popover (`popover` nativo, posicionados pelo JS via `--_tooltip-x/-y` e `--_popover-x/-y` com `data-placement`; ponte para o ponteiro passar ao tooltip).
- Stepper (marcadores numerados por CSS counter, check e "!" por estado, vertical, etapa clicável, resumo "Etapa N de M" em contêiner estreito).
- Stat e StatGrid (indicadores com tendência e tom independentes, estado carregando com Skeleton; usar com `.eds-card`).
- Barra de filtros com `.eds-chip` (contêiner, "Mais filtros" em `<details>` que fica sempre aberto em contêiner largo onde há `::details-content`).
- Page, PageHeader, toolbar, body e footer (`.eds-page`, ações descem abaixo de 40rem, cabeçalho opcionalmente fixo).
- Table carregando (`aria-busy`, `.eds-table-loading`, `.eds-table-overlay`).
- O `:active` do item de Dropdown e da ordenação da Table não usa mais ícone muted sobre o fundo pressionado (ficava abaixo de 3:1 no escuro). Sem tokens novos.
- `[hidden]` passa a vencer o `display` dos componentes (regra na camada `eds.utilities`); antes um `<button class="eds-button" hidden>` continuava visível.

**@efds-ui/behavior**

- Novos comportamentos no `init` e nos dois IIFE: Tooltip (`data-eds-tooltip`, WCAG 1.4.13: hover com atraso de 300 ms, foco, Esc dispensa sem fechar o diálogo em volta, pairável), Popover (`data-eds-popover`: posição, `aria-expanded`, foco de volta ao gatilho, `eds:popover-open` e `eds:popover-close`), Wizard (`form[data-eds-wizard]`: validação por painel, foco no título da etapa, anúncio "Etapa 2 de 4: Endereço.", atualiza o `.eds-stepper`, `eds:wizard-beforechange` cancelável e `eds:wizard-change`), Barra de filtros (`form[data-eds-filter-bar]`: chips dos campos aplicados, remover, limpar de verdade, contador de "Mais filtros", `eds:filter-change`) e Accordion (item `aria-disabled` não alterna).
- Select somente leitura no toque também bloqueia `pointerdown` e `touchend`.
- Subcaminho `@efds-ui/behavior/balloon` (posicionamento de Tooltip e Popover, usado pelo React). Textos novos em `configure({ messages })`: `wizard*` e `filter*`.

**@efds-ui/react**

- Novos componentes: `Accordion` e `AccordionItem`, `Tooltip`, `Popover`, `Stepper`, `Wizard`, `Stat` e `StatGrid`, `FilterBar`, `Page`, `PageHeader`, `PageToolbar`, `PageBody`, `PageFooter`. Tooltip e Popover usam o mesmo código do behavior.
- `Table` ganha `loading` (`aria-busy` e anúncio `texts.loading`), `loadingOverlay` e `TableLoadingRows`.

**Documentação e playground**

- Páginas Accordion, Tooltip, Popover, Stepper e Wizard, Indicador (Stat), Barra de filtros, Cabeçalho de página, Máscara de entrada, Exportação de tabelas, Referência de eventos e Acessibilidade; Table com exemplos de carregamento e "Excluir linha + Desfazer" (Toast `action`).
- Telas de referência: Listagem com `FilterBar`, Dashboard com `StatGrid`, as três com `PageHeader`.

**Revisão de UX da onda B**

- Tooltip: só aparece com foco visível (clique e toque não o prendem) e fica dentro da viewport no eixo transversal (`--_tooltip-dx/-dy`).
- Stepper em contêiner estreito: o marcador da etapa atual mostra o número certo (os itens ocultos seguem contando, fora do foco e da árvore).
- Popover com `role="dialog"` (não modal), para o `aria-labelledby` valer.
- Wizard alinha Avançar e Concluir ao fim com o utilitário novo `.eds-push-end`.
- Página Acessibilidade: cabeçalho fixo exige `scroll-padding-block-start` do app (o core só reserva espaço para toasts).
- Wizard (behavior e React): campos inválidos ao avançar ou concluir mostram erro persistente e associado (`aria-invalid`, `p.eds-error` por `aria-describedby`, mensagem nativa ou `data-eds-error`); foco no primeiro inválido; o erro some ao corrigir; sem balão nativo (WCAG 3.3.1/3.3.3).
- `StatGrid` anuncia o carregamento num único `role="status"` (`texts.loading`, `texts.loaded`); o `Stat` isolado mantém o próprio.
- Table `loadingOverlay`: a sobreposição cobre toda a área rolável, a tabela fica `inert` enquanto carrega e o foco volta ao sair; classe nova `.eds-table-overlay-box` (centraliza o Spinner na área visível). No HTML puro, ponha `inert` na `<table>`.
- Playground: o filtro de Situação da Listagem volta a ser de seleção múltipla, com um chip por valor.

### Lista de melhorias, onda C (campos, feedback e comportamentos de página)

**@efds-ui/core**

- InputGroup (prefixo/sufixo de texto e botões encaixados, foco e erro no grupo, carregando com Spinner), NumberInput (`.eds-number`, botões − e +), medidor de força e regras de senha (`.eds-password-strength`, `.eds-password-rules`), OTP (`.eds-otp` com células ou `.eds-otp-single`), Lookup (código + busca + descrição).
- Progress (`progress.eds-progress` nativo estilizado, indeterminado com listras fixas em reduced-motion, sm/md e `data-tone`), ErrorState (`.eds-empty-error`), Copy (`data-copied`) e Secret, Timeline (marcador com tom, compacta e agrupada por dia), Notificações (sino com contagem e lista no Popover, não lida por texto + ponto) e `.eds-session-countdown`.
- Utilitários de texto `.eds-text-mono` e `.eds-text-tabular`.

**@efds-ui/behavior (página e feedback)**

- Copiar: `data-eds-copy` / `data-eds-copy-text` (Clipboard API com reserva `execCommand`), rótulo "Copiado" por 2 s, anúncio, eventos `eds:copy` e `eds:copy-fail`; `EDS.copyText`.
- Notificações (sino sobre o Popover): leitura individual e "Marcar todas como lidas", contagem no nome do botão, eventos `eds:notifications-read` e `eds:notifications-read-all`.
- Alterações não salvas: `form[data-eds-dirty-guard]` com `beforeunload`, confirmação ao sair por link (inclui rotas por hash), `eds:dirty-change`, `eds:dirty-reset` e `EDS.markClean`.
- Sessão por inatividade: `EDS.session()` ou `data-eds-session-timeout`; aviso em `alertdialog` com contagem acessível (anúncio por minuto e aos 10 s; WCAG 2.2.1 e 2.2.6), sincronização entre abas, sem rede salvo `keepAliveUrl`; eventos `eds:session-extend` e `eds:session-expire`.
- Campos condicionais: `data-eds-show-if` / `data-eds-require-if` (`=`, `!=`, presença, `!campo`, `a|b`), oculto com `hidden` e campos `disabled`, compatível com CSP; `eds:conditional-change`.
- Tema por cor da organização: `@efds-ui/behavior/theme` (`createTheme`, `applyTheme`, `contrastRatio`) gera a escala de acento em OKLCH com contraste AA garantido nos dois modos; `data-eds-theme-color` para demonstração (só no pacote completo).

**@efds-ui/react (página e feedback)**

- `Progress`, `ErrorState`, `CopyButton` (e `copyToClipboard`), `SecretField`, `Timeline` (com `groups`), `NotificationBell`, `SessionTimeout` / `useSessionTimeout` e `useUnsavedChanges`; campos condicionais por estado (padrão documentado, sem API nova).

**@efds-ui/behavior (campos)**

- Senha (`data-eds-password`): mostrar/ocultar com `aria-pressed`, força 0–4 por heurística local, regras atendidas/pendentes em texto, anúncio no blur ou após pausa; evento `eds:password-strength`.
- Código de verificação (`data-eds-otp`): células com colar e preenchimento por SMS, campo único como reserva sem JS; eventos `eds:otp-change` e `eds:otp-complete`.
- NumberInput (`data-eds-number`): padrão spinbutton (setas, PageUp/PageDown, Home/End, repetição ao segurar), máscara `numero` nas casas decimais; `eds:number-change`.
- Lookup (`data-eds-lookup`): código + descrição + busca em modal, fonte remota ou local; `eds:lookup-change`.
- Máscaras `hora`, `competencia` e `processo` (CNJ), com `data-eds-mask-validate` opcional (faixa e dígito verificador).
- Formatadores (`@efds-ui/behavior/format`, `data-eds-format`): moeda, número, data, data e hora, relativo, CPF, CNPJ, telefone, CEP e `maskCpf` (LGPD).
- CEP (`data-eds-cep`, `data-eds-cep-fill`): `cepUrl` vazio por padrão, sem chamada externa até o autor configurar; estados carregando, não encontrado e falha com tentar de novo; `eds:cep-result`.
- Subentrada `@efds-ui/behavior/fields` (regras puras compartilhadas com o React). Tamanhos do IIFE após a onda C: `eds-behavior.js` ~221 kB (72 kB gzip), `eds-behavior-core.js` ~177 kB (56 kB gzip; sem CEP, formatadores, exportação e tema).

**@efds-ui/react (campos)**

- `PasswordInput`, `OtpInput`, `InputGroup`, `NumberInput`, `Lookup` (nunca chama a rede sozinho) e `useCep`.
- `Input`: máscaras `hora`, `competencia` e `processo`; `maskValidate` e `maskInvalidMessage`.
- Formatadores reexportados (`formatCurrency`, `formatDate`, `formatRelative`, `formatCpf`, `maskCpf`, `parseNumber`, …).

**Revisão de UX da onda C**

- Alterações não salvas: funcionava mal com máscara no formulário (o estado inicial era lido antes de a máscara reformatar); a confirmação de saída passa a `danger`, com foco inicial em "Continuar editando".
- Lookup: resultados cabem a 320 px (`.eds-lookup-results`) e o travessão do estado vazio não é mais lido.
- NumberInput e campos condicionais devolvem o foco quando um botão se desabilita ou um bloco some.
- `.eds-input-group` recorta os cantos (`overflow: clip`); o "Tentar de novo" do CEP fica junto da mensagem; o OTP de exemplo liga a ajuda ao grupo.
- Tema por cor: relatório segue o modo claro/escuro, deixa de ser região viva, diz "ajustada" (não "escurecida") e checa o acento sobre o cinza 800 do escuro.
- Documentação: o botão Copiar dos exemplos voltou a achar o alvo; tamanhos do IIFE atualizados (`eds-behavior.js` ~222 kB / 72 kB gzip, `eds-behavior-core.js` ~178 kB / 56 kB gzip).

### Lista de melhorias, onda D (complementos)

**@efds-ui/core**

- Avatar e AvatarGroup (tons `.eds-avatar-tone-1..6` com contraste AA nos 5 temas e 2 modos, mínimo 4,79:1; status com forma além da cor), Tag (`.eds-tag` com `data-tone` e remoção), Divider (horizontal, vertical e com rótulo).
- Paleta de comandos (`.eds-command` sobre o Modal), Agenda mensal (grade que vira lista por dia em contêiner estreito), TimePicker (lista de horários no padrão combobox; `type=time` nativo estilizado), SegmentedControl (rádios nativos), DescriptionList (colunas por contêiner, horizontal, divided, striped) e Banner de sistema (área própria no app shell).
- `.eds-copy` reserva largura mínima para o botão não se deslocar ao virar "Copiado".
- `prefers-contrast: more`: Badge, Tag, Avatar e Banner ganham borda legível (o ajuste de tokens já existia em `base/accessibility.css`).
- Correção: controles dentro de `.eds-card` não perdem mais o `position` próprio (o botão do DatePicker num Card ficava fora do lugar).

**@efds-ui/behavior**

- Paleta de comandos (`data-eds-command`): Ctrl/Cmd+K configurável (`data-eds-command-shortcut`, `off` desliga), padrão APG combobox/listbox, grupos, itens da marcação, JSON ou fonte remota, "Recentes" opcional (só ids em localStorage), `eds:command-select` cancelável. Só no IIFE completo.
- Agenda mensal (`data-eds-agenda`): navegação por mês, "+N mais" com Popover, eventos por JSON ou fonte remota (`{from}`/`{to}`), `eds:agenda-month-change` e `eds:agenda-event-click`. Só no IIFE completo.
- TimePicker (`data-eds-timepicker`): máscara hh:mm própria, lista de horários (`data-eds-time-step`, `-min`, `-max`), valor `HH:MM` em hidden, `eds:time-change`.
- Banner (`data-eds-banner`): fechar com lembrança por id em localStorage (desligável por `data-eds-banner-remember="off"`), `eds:banner-close`.
- Avatar: tom pelo hash do nome quando o autor não define; iniciais por `data-name`; `avatarTone` e `avatarInitials` exportados.
- Notificações: "Marcar todas como lidas" fica `disabled` sem não lidas.
- Idiomas: `defaultMessages` exportado como modelo de tradução; página "Idiomas e textos" lista as chaves. Sem pacotes de idioma prontos (dependem de revisão de falante nativo).
- Tamanhos após a onda D: `eds-behavior.js` ~251 kB (81 kB gzip), `eds-behavior-core.js` ~189 kB (59 kB gzip).

**@efds-ui/react**

- `Avatar`, `AvatarGroup` (`aria-label` obrigatório), `Tag`, `Divider`, `SegmentedControl`, `DescriptionList`, `Banner`, `TimePicker`, `CommandPalette` e `Agenda`; `AppShell` ganha o slot `banner`; `NotificationBell` com "Marcar todas" desabilitado sem não lidas.

**Documentação e playground**

- Páginas dos 9 componentes novos, "Idiomas e textos" e a seção "Contraste aumentado" em Temas e eixos; Badge × Tag × Chip na página Tag.
- Playground: Avatar no cabeçalho, Banner de homologação no topo das três telas e DescriptionList no resumo do formulário.

**Revisão de UX da onda D**

- Agenda: o nome acessível do "+N mais" contém o texto visível (WCAG 2.5.3); o hover dos eventos sublinha o título em vez de escurecer o fundo (contraste ≥ 4,5:1); o "+N mais" da grade escrita pelo servidor passa a ser posicionado; exemplo novo "Grade montada pelo JS".
- TimePicker (behavior e React): o cursor fica no fim ao digitar "9" (vira "09").
- Paleta de comandos anuncia "Carregando…" na busca remota.
- Banner: o foco, ao fechar, pula candidatos que não aceitam foco. NotificationBell (React) só move o foco se "Marcar todas" ficou desabilitado.
- Documentação: filtro de Idiomas anuncia a contagem e tem estado vazio; exemplo de Tag removível devolve o foco; correções de exemplos (link em `li`/`td` pintado pelo site, `name` de rádio repetido no Segmented, lembrança do Banner escondendo o exemplo, ajuda do TimePicker sem `aria-describedby`).

### Imagem

- `@efds-ui/core`: `image.css` (Image com proporções `-1x1 -4x3 -3x2 -16x9 -21x9 -3x4 -4x5`, `-contain`, `-circle`, estados de carregamento e erro com fallback; Figure com legenda e crédito), `gallery.css` (grade de miniaturas e Lightbox) e `cropper.css` (corte de foto).
- `@efds-ui/behavior`: subcaminho `@efds-ui/behavior/image` (`loadImage`, `resizeImage`, `cropImage`, `buildSrcset`, `isImageFile`, `createCropperController`); estado do Image automático; galeria com Lightbox (setas, Home/End, deslizar, foco de volta à miniatura); corte de foto em `input[type=file][data-eds-cropper]` que entrega o arquivo recortado e comprimido no próprio campo (WebP, com JPEG de reserva), com botões de mover como alternativa ao arraste (WCAG 2.5.7).
- `@efds-ui/react`: `Image`, `Figure`, `Gallery`, `ImageCropper`, `ImageCropperDialog` e `AvatarUpload`.

### @efds-ui/editor (novo, edição Básica)

- Editor de conteúdo sobre ProseMirror: parágrafo, títulos 2 a 4, negrito, itálico, sublinhado, tachado, listas, alinhamento, link, desfazer/refazer, limpar formatação, três fontes (sem serifa, com serifa, monoespaçada) e tabela simples; colar do Word com limpeza.
- HTML por `textarea[data-eds-editor]` (script `eds-editor.js`, que convive com o `window.EDS` do behavior em qualquer ordem) e React em `@efds-ui/editor/react`. Saída sem `style=`; `sanitizeHtml` no navegador (o servidor deve sanitizar também).
- `@efds-ui/core`: `editor.css`, `prose.css` (tipografia do conteúdo dentro e fora do editor) e o token `--eds-font-family-serif`.
- Barra no padrão APG Toolbar (Alt+F10, Esc), `required` com erro visível, somente leitura focável, cabeçalho de tabela com `scope="col"`.
