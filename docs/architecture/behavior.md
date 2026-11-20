# `@eds-ui/behavior`: comportamento para quem usa só HTML

JavaScript puro (TypeScript no código-fonte), **zero dependências**, sem conhecer React nem o core (o consumidor carrega o CSS). Implementa em DOM as mesmas obrigações que `@eds-ui/react` cumpre, levantadas em [`comportamento.md`](./comportamento.md). O markup é o contrato do core (`apps/docs/src/examples/**/*.html`).

## Saídas

| Arquivo                                      | Uso                                                                                             |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `dist/index.js` + `.d.ts`                    | ESM tree-shakeable (`import { init, initTabs, toast, loader } from '@eds-ui/behavior'`).        |
| `dist/eds-behavior.js`                       | IIFE para `<script src defer>`: `window.EDS` e `init(document)` automático.                     |
| `dist/eds-behavior-core.js`                  | IIFE "core": o mesmo, sem exportação, máscara de campos, CEP, formatadores e tema por cor.      |
| `dist/export/formats/{csv,json,xlsx,pdf}.js` | ESM, um gerador por formato (`@eds-ui/behavior/export/<formato>`), para `import()` sob demanda. |

`package.json`: `exports["."]` (ESM) e `exports["./eds-behavior.js"]` (IIFE); `unpkg`/`jsdelivr` apontam para o IIFE. O IIFE completo tem cerca de 222 kB (72 kB com gzip). O `eds-behavior-core.js` (`exports["./eds-behavior-core.js"]`) tem cerca de 178 kB (56 kB com gzip): mesmo `window.EDS`, mesmos atributos e a mesma configuração pela tag, e inclui tudo da onda C que não depende de serviço externo ou de arquivo (senha, OTP, NumberInput, Lookup, copiar, notificações, alterações não salvas, sessão por inatividade e campos condicionais). Ficam de fora, e não fazem nada nele: `data-eds-export` (exportação CSV/Excel/JSON/PDF), `data-eds-mask` (máscara de entrada em campos comuns), `data-eds-cep`, `data-eds-format` e `data-eds-theme-color`; também não existem `EDS.exportData`, `EDS.createMask`, `lookupCep`, os formatadores nem `createTheme` (este continua no subcaminho `@eds-ui/behavior/theme`). **Atenção:** o NumberInput usa o núcleo da máscara por dentro (`createMask` está no bundle do core), então ele formata os próprios decimais também no core; já um `data-eds-mask` no campo dele só edita o texto durante a digitação no completo (quem reescreve o texto é o `maskBehavior`, que o core não liga). Os dois saem do mesmo código (`src/setup.ts` comum; `index.ts` acrescenta exportação, máscara, CEP, formatadores e tema; `index-core.ts` não). `iife-boot.ts` lê as `data-*` da tag nas duas.

O `@eds-ui/react` carrega cada gerador de arquivo por `import()` no clique (`@eds-ui/behavior/export/csv|json|xlsx|pdf`, cada um com `exportFile(dados, opções)`). O `@eds-ui/behavior/export` continua exportando tudo.

### Desempenho

- O auto-init junta tudo num seletor combinado (uma varredura por nó adicionado, sem varrer tudo a cada remoção). Os registros do `MutationObserver` já chegam em lote por microtask; não há adiamento por `requestAnimationFrame` para o comportamento estar ligado antes da primeira pintura.
- Table: a ordenação lê o valor de cada linha uma vez e reinsere as linhas num `DocumentFragment`; o filtro guarda o texto normalizado por linha (`WeakMap`, invalidado por mutação na linha).
- Combobox local: texto normalizado das opções em cache; acima de 200 opções o filtro espera 80 ms; scroll/resize reposicionam no máximo uma vez por quadro.
- Tree: renumeração e JSON uma vez por lote de mutação (`takeRecords` descarta o que o próprio refresh causou); lista de itens visíveis em cache, invalidada por mudança de estrutura ou de `aria-expanded`.
- PageLoader: chamadas excluídas (`edsLoader:false`, `exclude`, cabeçalho) não criam `Headers` nem `Request` extra. `pnpm pack:check` valida o tarball e confere que o IIFE é script clássico com `EDS` e auto-init.

## API

```ts
init(root?: ParentNode = document, options?: BehaviorOptions): () => void  // destroy()
configure({ locale?, messages?, loader? }): void
toast(options): number;  toast.dismiss(id);  toast.dismissAll()
loader.start(opts?): () => void;  loader.track(promise, opts?): Promise;  loader.reset()
initTabs | initModal | initDropdown | initAlert | initTable | initTableFilter | initSidebar | initCombobox | initDatepicker | initButtonBusy | initMask (root?) => destroy
initToast() | initLoader() => destroy   // sistemas globais, contados por referência
```

- `init` liga tudo que existe em `root` e observa `root` com `MutationObserver`: elementos que entram são ligados, os que saem (de fato fora do `root`) são desligados. **Nada fora do `root` é ligado.** Cada elemento é ligado uma única vez por comportamento (guarda interna em `WeakMap`, sem atributo no DOM), mesmo com `init` repetido ou `root`s sobrepostos.
- `destroy()` remove ouvintes, para o observador, aborta requisições do Combobox e, quando é o último `init`, desmonta o toast e o PageLoader (restaurando `fetch` e `XMLHttpRequest`). É idempotente.
- Markup renderizado pelo `@eds-ui/react` não deve ser ligado por este pacote: chame `init` só no `root` do HTML cru (o site de docs usa `init(previewEl)`).
- **Eventos**: padrão único `eds:<componente>-<ação>` (`eds:table-sort`, `eds:table-select-change`, `eds:alert-dismiss`, `eds:modal-open`, `eds:dropdown-close`…), `CustomEvent` com bubble; os que antecedem uma ação aceitam `preventDefault()` (`eds:table-sort`, `eds:alert-dismiss`, `eds:tree-beforechange`, `eds:table-beforeexport`). Os nomes sem o prefixo do componente foram renomeados antes da 0.1.0, sem camada de compatibilidade (os pacotes não foram publicados).
- **Locale**: `configure({ locale })` (padrão `pt-BR`; tag inválida é ignorada) vale para o collator da Table (`sortRows`), os nomes de mês e dia do DatePicker e o exportador (ordem da data, separadores decimal e de milhar e o `/Lang` do PDF; `exportData(…, { locale })` vale só para a chamada). Os textos continuam em `messages`. `resetLocale()` volta ao padrão. A leitura de números e datas escritos na tabela (`parseNumber`, `parseDate`) aceita pt-BR e ponto decimal, qualquer que seja o locale.
- Textos em pt-BR; `configure({ messages })` troca qualquer um (chaves em `Messages`: `toastClose`, `severity*`, `sortedBy`, `sortAscending`, `sortDescending`, `selectedNone|One|Many`, `tableFilterMany|One|None|Cleared|ClearedOne|Empty`, `comboResultsMany|One`, `comboNoResults`, `comboError`, `loaderTitle`, `loaderText`; os de diálogos, Sortable e Tree estão nas suas seções). Os modelos usam `{count}`, `{column}` e `{direction}`.

## Componentes

Eventos são `CustomEvent` com prefixo `eds:` e `bubbles`.

### Tabs

`.eds-tabs > .eds-tablist[role=tablist] > .eds-tab[role=tab][aria-controls]`, painéis `role=tabpanel`. `tabindex="0"` **sempre na aba selecionada** (as demais `-1`; a aba desabilitada focada por seta fica `-1`, então Tab ao sair e Shift+Tab ao voltar entram pela selecionada), ←/→ com volta (invertidas em RTL), Home/End. Aba `aria-disabled="true"` ou `disabled` recebe foco por seta, mas não é ativada. Painéis inativos recebem `hidden`. Ativação automática. A aba ativa inicial é a de `aria-selected="true"` (ou a primeira habilitada).
Evento `eds:tabs-change` em `.eds-tabs`: `detail { tab, panel, id }`.

### Modal e Drawer

- `<button data-eds-open="ID">` chama `showModal()` no `dialog` e foca `[data-autofocus]` se houver (o foco inicial padrão é o nativo). Eventos no dialog (com bubble): `eds:modal-open` (`detail { trigger }`, `trigger: null` se aberto por `showModal()` do código) e `eds:modal-close` (`detail { returnValue }`, por qualquer caminho: Esc, `[data-eds-close]`, fundo ou `close()`). No `.eds-drawer` os nomes são `eds:drawer-open` e `eds:drawer-close`.
- `dialog.eds-modal` / `dialog.eds-drawer`: fecha pelo backdrop só se `pointerdown` e `click` ocorreram no próprio `<dialog>` (WCAG 2.5.2); `data-eds-backdrop="static"` desliga. `[data-eds-close]` dentro do dialog fecha (`value` do atributo vira `returnValue`). Esc, foco preso e retorno de foco são nativos. O corpo (`.eds-modal-body`/`.eds-drawer-body`) vira `role=region` focável com `aria-labelledby` do título só quando rola.

### Dropdown

`.eds-dropdown[popover]` (padrão disclosure, sem `role="menu"`). Sincroniza `aria-expanded` de todos os `[popovertarget]` que apontam para ele (fora do menu) pelo evento `toggle`; fecha quando o foco sai do menu e do gatilho (Tab); item `aria-disabled="true"` não age. Itens que fecham o menu usam `popovertargetaction="hide"` (nativo). Emite `eds:dropdown-open` e `eds:dropdown-close` no menu (com bubble).

### Toast

`toast({ variant?, title?, message, duration?, action? })` devolve o id. `action: { label, onClick }` acrescenta o botão `.eds-button.eds-button-ghost.eds-button-sm.eds-toast-action` (entre o conteúdo e o de fechar): ao ativar, o toast fecha e `onClick` roda; dê um `duration` generoso (a Tree usa 8000) e nunca deixe a ação ser o único jeito de recuperar o dado. A região `.eds-toast-region[aria-live=polite]` é criada vazia na primeira chamada e o primeiro toast entra ~50 ms depois (live region nascida preenchida não é anunciada). Há uma só região (o mesmo nó, nunca recriado) por documento. Com `dialog:modal` aberto ela vai para dentro dele; ao fechá-lo volta ao `body`. Mover uma região com toasts reinseriria os nós e o leitor de tela releria tudo: nesse caso ela fica com `aria-live="off"` durante a troca, volta a `polite` ~60 ms depois e os toasts novos desse intervalo esperam (região vazia se move sem isso). `info`/`success`: máx(5 s, ~1 s a cada 10 palavras); `warning`/`danger` não fecham sozinhos; `duration` (ms) sobrepõe, `0` mantém. Pausa em hover e foco (o tempo restante é preservado). Esc com o foco no toast fecha só o toast. Ao fechar um toast que tinha o foco, o foco volta a quem estava focado ao disparar (ou ao 1º controle do dialog, ou ao `<main>`). `danger` tem `role="alert"`. Sem `title`, a severidade vai num prefixo oculto. Máximo de 3 visíveis; os demais esperam. `eds:toast-close` no toast: `detail { id }`.

### Alert fechável

`[data-eds-dismiss]` dentro de `.eds-alert` remove o aviso e move o foco para o próximo focável após ele (na falta, o anterior; por fim o `<main>`). `eds:alert-dismiss` (cancelável, no alert) sai antes: com `preventDefault` o aviso fica.

### Button em carregamento

`.eds-button[aria-busy="true"]` (estado `loading` em HTML): o CSS do core só barra o mouse (`pointer-events: none`); Enter e Espaço ainda gerariam `click`. O `init` liga, em `root`, ouvintes de **captura** de `click`, `keydown` e `keyup` (Enter, Espaço) que, para um botão (ou `a.eds-button`) busy, fazem `preventDefault` + `stopImmediatePropagation`: nenhum `click`, nenhum envio de formulário, nenhum ouvinte do consumidor é chamado. O botão **não** recebe `disabled`: continua focável e o leitor lê o `aria-busy`. O atributo é lido a cada evento, então remover `aria-busy` reativa o botão sem religar nada. Só importa `initButtonBusy(root)` quem usa módulos soltos (o React já bloqueia no wrapper).

### Table

`table.eds-table`:

- **Ordenação**: `button.eds-table-sort` em `th`. Ordena o `tbody` no cliente pelo texto da célula ou `data-sort-value` do `td`; reconhece número (pt-BR ou ponto decimal), data (`dd/mm/aaaa` ou ISO) e texto (`Intl.Collator('pt-BR')`, sem diferenciar acento/caixa); vazios por último. Atualiza `aria-sort` (`none` nas demais ordenáveis) e anuncia no `[role=status]`. `eds:table-sort` (cancelável, na tabela, `detail { column, label, direction, th }`) sai antes: com `preventDefault` o consumidor ordena (e atualiza `aria-sort`) no servidor.
- **Seleção**: `input[data-eds-select-all]` e `input[data-eds-select-row]` (dentro de `<label class="eds-check">` na célula `.eds-table-check`, que amplia o alvo; o nome continua o `aria-label` do input): `indeterminate`, linhas desabilitadas ignoradas, contagem com plural no status. `eds:table-select-change`: `detail { count, rows, total }`. **Com filtro**, só as linhas visíveis (sem `hidden`) contam: "selecionar todos", o estado do cabeçalho, `count` e `rows` olham as visíveis; uma linha oculta e marcada continua marcada (e segue no envio do formulário), e `total` traz a contagem de marcadas incluindo as ocultas. **Status com seleção oculta pelo filtro** (4.1.3): quando há marcadas fora das visíveis, o anúncio diz as da busca e o total: "1 item selecionado nesta busca, 3 no total." / "{count} itens selecionados nesta busca, {total} no total." / "Nenhum item selecionado nesta busca, 3 no total." (`selectedInSearchOne|Many|None`); sem linhas ocultas marcadas, o texto simples de sempre.
- **Filtro local**: `input[data-eds-table-filter="ID-DA-TABELA"]` (com `aria-controls` e nome acessível) liga o campo a `<table id>`, mesmo fora dela (ex.: `.eds-table-toolbar`). Filtra as linhas do `tbody` por substring sem acento e sem caixa (`normalizeText`, o mesmo do Combobox) sobre o texto de todas as células, menos as com `data-eds-filter-ignore`; `data-eds-filter-columns="1,2"` (base 1) restringe as colunas. Linha que não casa recebe `hidden`. Debounce de 150 ms no `input`; Esc com texto limpa e reaplica na hora (`stopPropagation`, não fecha um Modal em volta). A ordenação mantém o filtro; linhas acrescentadas ou reordenadas depois passam pelo filtro (`MutationObserver`). Vazio: a linha com `.eds-table-empty` do próprio markup é exibida quando nada casa e oculta caso contrário; sem ela, o JS cria `tr[data-eds-filter-empty] > td.eds-table-empty[colspan] > .eds-empty > p.eds-empty-text` ("Nenhum resultado para "X"."). Status em região `role=status` própria, criada vazia logo depois do campo, só após o debounce: "3 resultados." / "1 resultado." / "Nenhum resultado." e, ao limpar, "Filtro removido. 8 linhas." (com linhas marcadas, acrescenta "3 selecionados." ou "1 selecionado.": `tableFilterSelectedMany|One`). Evento `eds:table-filter` no campo: `detail { query, count }`. **Só alcança as linhas que estão no DOM**: com paginação no servidor, filtre no servidor (o campo deve enviar a consulta). Internamente a Table recebe `eds:table-filtered` (na tabela) para reler a seleção.
- **Região de status**: a indicada por `data-eds-status="ID"` na tabela, o `[role=status]` irmão do `.eds-table-wrap` ou, na falta, um novo (oculto, vazio) logo depois do wrap.
- **Rolagem**: `.eds-table-wrap` ganha `tabindex=0`, `role=region` e `aria-labelledby` (o `caption`) só quando rola (`ResizeObserver`).

### Exportação de tabelas (CSV, JSON, XLSX e PDF)

Sem dependência: os quatro formatos são gerados no navegador, em `src/export/`, por funções puras (sem DOM, testáveis em Node), reutilizáveis por qualquer framework.

**Geradores** (`import { exportData, toCsv, toJson, toXlsx, toPdf } from '@eds-ui/behavior'`; no IIFE, `EDS.exportData(...)`):

```ts
const data = {
  columns: [
    { key: 'cliente', label: 'Cliente' },
    { key: 'total', label: 'Total', type: 'currency' }, // text | number | currency | date | percent
  ],
  rows: [{ cliente: 'Atelier Exemplo', total: 1280.5 }],
};
exportData(data, 'xlsx', { filename: 'pedidos', title: 'Pedidos', subtitle: 'Novembro' }); // baixa pedidos.xlsx
toCsv(data); // string (com BOM)    toJson(data); // string
toXlsx(data, { title }); // Uint8Array    toPdf(data, { title, subtitle }); // Uint8Array
```

`exportData` monta o Blob, usa `<a download>` e libera a URL com `URL.revokeObjectURL` 1 s depois; devolve o nome final. Valores: número (ou texto pt-BR como `"1.280,50"`), `Date`, texto `aaaa-mm-dd[Thh:mm[:ss]]` ou `dd/mm/aaaa[ hh:mm]` (a hora é a do relógio escrito: fuso é ignorado), `boolean`; `null`, `undefined` e `""` são células vazias. Sem `type`, vale o tipo do primeiro valor preenchido. `percent` guarda **pontos percentuais** (`12.5` = 12,5%).

| Formato | O que sai                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CSV     | Separador `;`, BOM UTF-8, quebra CRLF, aspas duplicadas, número com vírgula decimal e **sem** milhar nem `R$` (o Excel pt-BR lê como número), data `dd/mm/aaaa`, percentual `12,5%`. **Injeção de fórmula**: texto que começa com `=`, `+`, `-`, `@`, tabulação ou CR ganha um `'` na frente (o Excel/LibreOffice mostram texto); vale só para texto, então `-3,5` numérico não é alterado.                                                                                                                                                                                                                                                                                                                                                                    |
| JSON    | Array de objetos com as `key`s; número, moeda e percentual como número, data ISO local (`2026-03-15`, ou `2026-03-15T09:05:00` com hora), vazio como `null`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| XLSX    | ZIP próprio (STORE, CRC32, nomes UTF-8) com `[Content_Types].xml`, `_rels`, `workbook`, `styles`, `sharedStrings` e `sheet1`. Cabeçalho em negrito e congelado, autofiltro, largura de coluna pelo conteúdo (8 a 60), `#,##0` / `#,##0.00` / `R$ #,##0.00` / `0.00%` / `dd/mm/yyyy[ hh:mm]` por tipo, data como número de série. Nome da planilha = `sheetName` ou `title`, cortado em 31 caracteres e sem `[ ] : * ? / \`. Texto vai como string compartilhada (nunca como fórmula): sem prefixo `'`. Limites do formato: 1 048 576 linhas e 16 384 colunas (`RangeError`).                                                                                                                                                                                   |
| PDF     | PDF 1.4 próprio, Helvetica e Helvetica-Bold (`WinAnsiEncoding`, sem fonte embutida). A4 retrato; **paisagem automática** se a largura natural das colunas passar da útil do retrato (fonte cai de 8,5 para 7 pt se ainda não couber). Título, subtítulo, "Gerado em dd/mm/aaaa hh:mm", cabeçalho repetido a cada página, linhas zebradas e grade finas, quebra de linha na célula (medida com as larguras AFM da Helvetica embutidas em `afm.ts`), números à direita, rodapé "Página N de M". **Caracteres fora do WinAnsi (emoji, ideogramas, símbolos raros) viram `?`**; acentos do português, `€` e aspas tipográficas do CP1252 funcionam. Uma linha mais alta que a página é cortada com reticências. Sem compressão: arquivos maiores que o necessário. |

**Subcaminho `@eds-ui/behavior/export`**: `exports["./export"]` (`src/export-entry.ts`) reexporta só `exportData`, `toCsv`, `toJson`, `toXlsx`, `toPdf`, os tipos e os textos (`getMessages`, `format`). Não importa `init`, auto-init nem os outros módulos; o `@eds-ui/react` depende do behavior só por ele. Condições: `development` (código-fonte, para typecheck e testes do monorepo, via `customConditions` no tsconfig do react), `types` e `default` (`dist/export-entry.js`); `publishConfig.exports` tira a `development`. Com `sideEffects: false` o bundler leva só o que o consumidor usa.

**Subcaminho `@eds-ui/behavior/mask`**: `exports["./mask"]` (`src/mask-entry.ts`) reexporta só `createMask`, `isMaskName`, `MASK_NAMES` e os tipos; mesmas condições do `/export`. Os apps do monorepo (docs e playground) precisam do alias `@eds-ui/behavior/mask` antes do `@eds-ui/behavior`.

**Limites verificados nos geradores**: XLSX com data anterior a 01/03/1900 grava texto (o Excel conta um 29/02/1900 inexistente e não tem série para antes de 1900); PDF reduz a fonte do corpo de 8,5 para 7 pt, uma vez, quando as colunas não cabem na página (e, se ainda não couberem, a palavra é cortada na largura da coluna); as larguras da Helvetica e da Helvetica-Bold conferem com as tabelas AFM padrão (teste de referência em `export.test.ts`).

**Ligação HTML** (`tableExportBehavior`, no `init`): botões ou itens de menu (normalmente dentro de um `.eds-dropdown`, que fecha ao clicar) com `data-eds-export="csv|xlsx|json|pdf"` e `data-eds-export-target="ID-DA-TABELA"`:

```html
<button type="button" class="eds-button" popovertarget="exp">Exportar</button>
<div id="exp" class="eds-dropdown" popover>
  <button
    type="button"
    class="eds-dropdown-item"
    data-eds-export="xlsx"
    data-eds-export-target="pedidos"
  >
    Excel
  </button>
  <button
    type="button"
    class="eds-dropdown-item"
    data-eds-export="pdf"
    data-eds-export-target="pedidos"
    data-eds-export-title="Pedidos de novembro"
  >
    PDF
  </button>
</div>
```

- Opcionais: `data-eds-export-filename` (sem extensão; padrão: o `caption` sem acento e com hífens, ou "tabela"; sempre ganha `-aaaa-mm-dd`), `data-eds-export-title` (padrão: o `caption`), `data-eds-export-subtitle` (PDF) e `data-eds-export-scope`.
- **Escopo**: `auto` (padrão) = linhas marcadas (`input[data-eds-select-row]`, **inclusive as ocultas pelo filtro**) se houver, senão as visíveis (o filtro local vale); `visible` = sem `hidden`; `selected` = só as marcadas; `all` = todas as do `tbody` no DOM. A ordem é a do DOM (a ordenação vale). A linha de "vazio" nunca entra; `data-eds-export-ignore` em `tr` tira a linha.
- **Colunas**: as `th` da última linha do `thead`; ficam de fora a coluna de seleção (`.eds-table-check` ou com checkbox), a de ações (`.eds-table-actions`) e qualquer `th[data-eds-export-ignore]`. `td[data-eds-export-ignore]` esvazia só aquele valor. Tipo em `th[data-type="text|number|currency|date|percent"]` (padrão: `number` com `.eds-table-num`, senão texto: use `data-type="currency"` para moeda). O valor vem de `td[data-value]` (número cru ou ISO) e, sem ele, do texto da célula. A chave do JSON é `th[data-key]` ou o texto do cabeçalho sem acento (`total`, `data-de-entrega`).
- **Status** (`role=status` da tabela): "Arquivo pedidos-2026-11-20.xlsx gerado (8 linhas)."; sem linhas no escopo: "Não há linhas para exportar." e nada é baixado. Textos em `configure({ messages })` (`export*`).
- **Eventos** (na tabela, `bubbles`): `eds:table-beforeexport` (cancelável; `detail { format, scope, filename, count, data }`) sai antes de gerar; `preventDefault()` aborta (confirmação, auditoria). `eds:table-export` (`detail { format, scope, filename, count }`) sai depois. O ouvinte de `beforeexport` pode **alterar `detail.data`** (por exemplo, mascarar colunas) e o arquivo sai com a alteração.

**LGPD.** A exportação leva **só o que está no DOM**: o que a tela não carregou (paginação no servidor) não sai, e o que está na tela sai inteiro, incluindo colunas que o usuário não vê por CSS. Colunas com dado pessoal ou sensível (CPF, e-mail, telefone, dados de saúde ou financeiros) devem ser **omitidas pelo servidor, mascaradas no servidor** ou marcadas com `data-eds-export-ignore`; mascarar só no CSS não basta, pois o texto continua no DOM. Para registrar quem exportou o quê, use `eds:table-beforeexport` (formato, escopo, quantidade de linhas, nome do arquivo) e envie o registro ao servidor, ou cancele o evento para pedir confirmação ou justificativa. O arquivo é gerado e entregue no navegador: nada é enviado a terceiros.

### Sidebar

- `.eds-app > .eds-sidebar[popover]`: ao abrir, `.eds-app-header`, `.eds-app-main` e `.eds-skip-link` ficam `inert`; sincroniza `aria-expanded` dos gatilhos; foca o item `aria-current="page"` (ou o primeiro); ao fechar remove o `inert` e devolve o foco ao gatilho; clicar num link fecha e foca o `main`.
- `[data-eds-sidebar-collapse]` (botão dentro de `.eds-sidebar`): alterna `data-collapsed` na sidebar e `aria-expanded` (e põe `aria-controls`). `eds:sidebar-collapse`: `detail { collapsed }`.

### Combobox

Padrão APG "combobox com lista, autocomplete=list". Markup em `packages/core/src/components/combobox.css`.

- Teclado: digitar filtra e abre; ↓ abre (e vai para a 1ª) ou avança; ↑ volta (sem dar a volta; fechado, abre na última); Alt+↓ abre sem mover; Alt+↑ fecha; Enter seleciona a destacada (aberto) ou envia o formulário (fechado; aberto sem destaque fecha a lista e o formulário segue); Esc aberto fecha e Esc fechado limpa o texto (ambos com `stopPropagation`, para não fechar um Modal em volta); Tab e perder o foco fecham sem selecionar; Home/End movem o cursor. Opções `aria-disabled="true"` são puladas. O destaque usa `aria-activedescendant` no input + `aria-selected` na opção + scroll. Clique na opção seleciona (o `pointerdown` não tira o foco do input); `pointermove` sobre uma opção habilitada move o destaque, sem rolar a lista. Enquanto o popup está `aria-busy="true"` (busca remota) setas e Enter são ignorados (e Enter não envia o formulário).
- Seleção: o input mostra o rótulo, o `input[type=hidden]` recebe `value` (e `data-value`) e dispara `input`/`change`; a opção escolhida ganha `data-current`. Editar o texto depois limpa o valor. Enquanto houver texto e valor vazio, o input recebe `setCustomValidity(messages.comboboxInvalid)` ("Escolha uma das opções da lista."), então o formulário não envia o rótulo digitado; limpa ao escolher ou esvaziar. **Erro visível (3.3.1)**: no Enter sem destaque ou ao sair do campo com texto que não é opção, e no evento `invalid` do campo (envio do formulário, inclusive `required` vazio), o JS põe `aria-invalid="true"`, cria `<p class="eds-error" id="<input-id>-err">` logo após o `.eds-combobox` com a `validationMessage`, anexa o id ao `aria-describedby` e anuncia a mensagem no status; ao escolher uma opção, esvaziar o texto (ou mudar o motivo do erro) os três somem, e o `destroy` também os remove. Sair do campo vazio e sem `required` não acusa nada. `data-eds-free-text` no `.eds-combobox` é o opt-out para texto livre (o hidden recebe o texto digitado, sem validação). Evento `eds:combobox-change` no `.eds-combobox`: `detail { value, label }` (`value: ''` ao limpar).
- Filtro local: "contém", sem diferenciar acento nem caixa. O estado inicial lê o `value` do hidden.
- `readonly` no input: o campo segue focável e lido (`aria-readonly="true"`), mas a lista não abre, Esc/Backspace não apagam e, no múltiplo, o remover das etiquetas fica desabilitado. O DatePicker/DateRangePicker com `readonly` desabilita o botão do calendário e ignora a colagem.
- Fonte remota: `data-eds-source="/clientes/busca?q="` no `.eds-combobox`. GET com o texto codificado no fim; resposta JSON `[{ "value", "label", "disabled"? }]`; debounce de 300 ms; aborta a requisição anterior; `data-eds-min-chars` (padrão 2); mostra `.eds-combobox-loading` e põe `aria-busy="true"` no popup; erro mostra `comboError` em `.eds-combobox-empty` e anuncia (o erro antigo some ao voltar a digitar). A requisição leva `edsLoader: false`, então **não aciona o PageLoader**.
- Posição: o popup é `popover="manual"` (top layer). O JS define em px no popup `--_combobox-x` (esquerda do input), `--_combobox-width` e `--_combobox-y` (borda de baixo; com `data-placement="top"`, a borda de cima: o CSS sobe com `translate`). Recalcula em `scroll` (captura) e `resize` enquanto aberto; vai para cima quando não cabe embaixo e há mais espaço em cima.
- Status (`role=status`, montado vazio): "N resultados disponíveis." / "1 resultado disponível." / "Nenhum resultado." depois de ~500 ms sem digitar; nada ao navegar por setas; limpo ao fechar. Na busca remota, "Carregando…" (`comboLoading`) só é escrito se passar de ~400 ms; ao escolher por teclado ou clique escreve "{label} selecionado." (`comboSelected`).
- Nome: a listbox sem `aria-label`/`aria-labelledby` recebe `aria-labelledby` com o id do `label[for=input]` (o id é criado se faltar).

### Combobox múltiplo (MultiSelect)

`data-eds-multiple` no `.eds-combobox` (markup em `packages/core/src/components/combobox.css`: `.eds-combobox-control` com `ul.eds-combobox-tags` e o input, hidden, popup). Mesmo popup, filtro, fonte remota e regras de Esc do simples.

- Marcação: `aria-multiselectable="true"` na listbox; `aria-selected` = **escolhida** (`true`/`false` em todas); o **destaque** é `data-active` (e `aria-activedescendant` no input). No simples nada muda.
- Teclado: ↓/↑ movem o destaque; Enter ou clique **alternam** a opção e a lista continua aberta; o texto digitado é limpo ao alternar (o filtro volta a mostrar tudo); Backspace com o texto vazio remove a última etiqueta; Esc aberto fecha, fechado limpa só o texto (nunca as etiquetas); Tab sai. O texto é só busca: não vira valor nem invalida o campo.
- Etiquetas: `li.eds-combobox-tag > span + button.eds-combobox-tag-remove` (`aria-label` "Remover {label}", `comboTagRemove`), geradas pelo JS a partir do estado (o `ul` é criado se faltar e fica `hidden` sem escolhas). Os botões vêm antes do input na ordem de Tab. Depois de remover, o foco vai ao botão de remover que ocupa a mesma posição, senão ao input.
- Valores: um `input[type=hidden]` por escolhido, na ordem de escolha, com `name` de `data-eds-name` ou do hidden inicial (ganha `[]` se faltar). Estado inicial: hiddens com valor + opções com `aria-selected="true"`; o rótulo vem da opção, da etiqueta existente (mesma posição) ou do próprio valor (útil na fonte remota).
- `data-eds-max-selected="N"`: ao atingir, as não escolhidas ficam `aria-disabled="true"` (com `data-eds-max`, removido ao liberar) e o status avisa "Limite de N itens atingido." (`comboMaxReached`).
- Obrigatório: `aria-required="true"` (ou `required`) no input aplica `setCustomValidity(comboMultiRequired)` ("Escolha ao menos uma opção.") enquanto não houver escolha. No `invalid` do campo (envio) aparece o mesmo erro visível do Combobox simples (`p.eds-error` + `aria-invalid` + `aria-describedby`), removido ao escolher uma opção; sair do campo não o mostra (o texto é só busca).
- Status (neutro em gênero): "Pelotas: selecionado. 3 itens selecionados." / "Pelotas: removido. 2 itens selecionados." (`comboMultiSelected`, `comboMultiRemoved` + `selectedNone/One/Many`). A contagem de resultados é a do Combobox.
- Evento `eds:combobox-change` no `.eds-combobox`: `detail { values, labels }` (arrays, na ordem de escolha). `input` e `change` também sobem do `.eds-combobox`. O popup ancora na `.eds-combobox-control` (largura do campo todo).

### DatePicker e DateRangePicker

`[data-eds-datepicker]` (uma data) e `[data-eds-daterange]` (período) no `.eds-datepicker`; `initDatepicker` liga os dois. Markup em `packages/core/src/components/{datepicker,calendar}.css`: campo(s) de texto, `.eds-datepicker-toggle`, hidden(s) ISO, `.eds-calendar[role=dialog][popover=manual]` e `[role=status]`. O JS **monta o conteúdo do `.eds-calendar`** (header `[nav anterior][título h2 aria-live=polite][nav próximo]`, selects de mês e ano, `table.eds-calendar-grid[role=grid]`, rodapé Hoje/Fechar); o markup só traz o contêiner. Sem JS vira um campo de texto (para zero JS use `<input type="date">`).

- Datas sem fuso (`core/date.ts`): calendário `{ano, mês, dia}`, nunca `new Date('aaaa-mm-dd')`. Semana começa no domingo; nomes por `Intl.DateTimeFormat(locale)` (`configure({ locale })`, padrão `pt-BR`). `eds:date-change` entrega `date` como `Date` local.
- Atributos no `.eds-datepicker`: `data-eds-min`, `data-eds-max` (ISO), `data-eds-disabled-dates="aaaa-mm-dd,..."`, `data-eds-disable-weekends`; no período também `data-eds-max-days` (dias corridos, inclusive). Lidos a cada uso.
- Campo de texto: máscara dd/mm/aaaa (só dígitos, barras automáticas, caret preservado); cola dd/mm/aaaa ou aaaa-mm-dd. A cada digitação o hidden ISO e `setCustomValidity` ficam em dia (texto parcial = inválido, o formulário não envia); `aria-invalid="true"` e o evento só no `change`/blur. Mensagens: `dateInvalid`, `dateBetween|From|Until`, `dateBlocked`; período: `rangeEndBeforeStart`, `rangeMaxDays`, `rangeNeedStart|End` (um campo só preenchido, se não for `required`). Hidden vazio quando inválido. No `change`/blur com erro, o JS cria `<p class="eds-error" id="<input-id>-err">` logo após o `.eds-datepicker`, anexa o id ao `aria-describedby` do campo afetado e anuncia a mensagem no status; ao corrigir, remove os três. O evento `invalid` do campo (envio com `required` vazio ou texto inválido) mostra o mesmo erro, com a `validationMessage`, em vez de depender só do balão nativo. Ano com 2 dígitos (dd/mm/aa) tem mensagem própria (`dateInvalidShortYear`). `readonly` ou `disabled` no campo desabilita o botão do calendário.
- Abrir: botão (`aria-expanded`, `aria-haspopup="dialog"`, `aria-controls`) ou Alt+↓ no campo. Foco inicial no dia escolhido, senão hoje, limitado a min/max (no período, o campo de onde abriu). Fechar: Esc (stopPropagation, devolve o foco ao botão, não fecha Modal em volta), escolher, Fechar, botão de novo; clicar fora fecha **sem mover o foco**. Tab circula no diálogo.
- Grade (roving tabindex): ←/→ dia, ↑/↓ semana, Home/End domingo/sábado, PageUp/Down mês, Shift+PageUp/Down ano (dia ajustado ao fim do mês: 29/02 vira 28/02), Enter/Espaço escolhem. O foco não sai de min/max. Dia indisponível (`aria-disabled="true"`) recebe foco, mas não é escolhido: status "{data}: data indisponível.". Nome do dia: "15 de março de 2026, domingo" (número visível primeiro; no período, início e fim ganham ", início do período"/", fim do período" por `rangeStartLabel`/`rangeEndLabel`); o diálogo tem `aria-modal="true"` e o botão ganha o valor no nome ("Escolher data. Atual: 15/03/2026", `dateCurrent`/`rangeCurrent`); `aria-current="date"` em hoje; `aria-selected="true"` no escolhido; fora do mês, `<td>` vazio. Nav fora de min/max fica `aria-disabled` (sem `disabled`, para não perder o foco); meses/anos fora do intervalo ficam fora dos selects.
- Hoje: escolhe a data de hoje; se estiver indisponível, anuncia e leva o foco ao dia de hoje. Anos do select: hoje −100/+50 (ou min/max), fixos até min/max mudarem; o ano da visão entra se estiver fora.
- Período: 1º Enter/clique = início, 2º = fim (anterior ao início vira o novo início); fecha ao escolher o fim; Esc no meio descarta e mantém o período anterior. `aria-selected` em todos os dias do período; `data-range="start|middle|end"` (`single` com só o início ou início = fim); `data-range-preview` (sem `aria-selected`) entre o início e o dia focado/sob o mouse. Dias além de `data-eds-max-days` ficam `aria-disabled` e avisam. Datas bloqueadas podem ficar no meio. Status: "Início: 03/03/2026. Escolha a data final." e "Período: 03/03/2026 a 15/03/2026.".
- Posição: o JS define em px `--_calendar-x` (esquerda do `.eds-datepicker`) e `--_calendar-y` (borda de baixo; com `data-placement="top"`, a de cima). Sem largura (o CSS decide). Recalcula em `scroll` (captura) e `resize`.
- Eventos no `.eds-datepicker`: `eds:date-change` `detail { value: "aaaa-mm-dd" | null, date: Date | null }`; `eds:daterange-change` `detail { start, end }` (ISO ou `null`). Só quando o valor aceito muda. O hidden dispara `input`/`change`.
- Textos (`configure({ messages })`): `dateChoose`, `rangeChoose`, `datePrevMonth`, `dateNextMonth`, `dateMonth`, `dateYear`, `dateToday`, `dateClose`, `dateInvalid`, `dateBetween`, `dateFrom`, `dateUntil`, `dateBlocked`, `dateUnavailable`, `dateSelected`, `rangeStart`, `rangePeriod`, `rangeEndBeforeStart`, `rangeMaxDays`, `rangeMaxDaysOne`, `rangeNeedStart`, `rangeNeedEnd`, `dateInvalidShortYear`, `dateCurrent`, `rangeCurrent`, `rangeStartLabel`, `rangeEndLabel`.

### FileUpload

`[data-eds-upload]` no `.eds-upload` (markup em `packages/core/src/components/upload.css`). Sem JS continua funcionando: o `<label for>` abre o seletor e o form envia o input.

- Seleção: clique ou arrastar; **acumula** entre seleções (o nativo substitui); ignora duplicado (nome + tamanho + `lastModified`). Sem `multiple` no input, a nova seleção substitui a anterior.
- Validação: `accept` do input (extensão, `tipo/*` ou MIME exato), `data-eds-max-size` (bytes), `data-eds-max-files`. Recusados por tipo/tamanho aparecem na lista em `data-state="error"` (sem "Tentar de novo"), não ocupam vaga, não entram no input nem no envio. Passou do limite de arquivos: nem entram na lista; o status avisa.
- **Modo formulário (padrão)**: os arquivos válidos ficam no próprio input (`input.files = DataTransfer.files`), então o envio normal leva tudo e `required` funciona nativamente. Sem `DataTransfer` o input fica com a última seleção nativa.
- **Modo imediato**: `data-eds-upload-url="/arquivos"` (+ `data-eds-upload-field`, padrão `file`). Cada arquivo vai por XHR `POST` (`FormData`, `Accept: application/json`, `X-EDS-Loader: off`, então o PageLoader não bloqueia) com progresso. Resposta 2xx com JSON `{ "id": "..." }` vira `<input type="hidden" name="<name do input>" value="id">` dentro do `.eds-upload`; o input file perde o `name` (não reenvia os binários) e o `required` (substituído por `setCustomValidity(uploadRequired)` até haver um enviado). Remover durante o envio aborta; remover enviado remove o hidden. Falha (rede, status, sem `id`) vira `error` com "Tentar de novo". Enquanto houver envio, o input recebe `setCustomValidity(uploadBusy)` ("Aguarde o envio dos arquivos."), então o submit é bloqueado. `destroy` aborta os envios e devolve `name`/`required`.
- Item: `li.eds-upload-item[data-state=ready|uploading|done|error]` com `svg.eds-upload-item-icon` (aria-hidden), `.eds-upload-item-name`, `.eds-upload-item-meta` (tamanho · Enviando N% / Enviado / causa; `svg` de check ou alerta dentro do meta em done/error, para a cor não ser o único sinal), `progress.eds-upload-progress` (só em `uploading`, `aria-label` "Enviando {nome}"), botão "Tentar de novo" (`aria-label` "Tentar de novo {nome}", texto visível primeiro) e botão Remover (`.eds-button-ghost.eds-button-icon.eds-button-sm`, `aria-label` "Remover {nome}").
- Status (`role=status`): "a.pdf adicionado." / "3 arquivos adicionados." / "a.pdf removido." / "a.pdf enviado." / "a.pdf: arquivo maior que 5 MB." / "Limite de 5 arquivos atingido." O progresso contínuo **não** é anunciado.
- Foco depois de remover: botão Remover do próximo item, senão do anterior, senão o input. Se o item que tinha o foco é redesenhado (ex.: "Tentar de novo"), o foco vai ao Remover dele.
- Arrastar: `dragenter/dragover/dragleave/drop` só na `.eds-upload`, com contador (os `dragleave` dos filhos não apagam o estado) e `data-dragover` enquanto estiver sobre ela; só reage a `Files` (texto arrastado passa) e nunca intercepta o resto da página. Input `disabled` ignora o drop. `reset` do form esvazia a lista.
- Tamanho em pt-BR: "850 KB", "1,2 MB".
- Eventos no `.eds-upload`: `eds:upload-change` (`detail`: `File[]` válidos), `eds:upload-progress` (`{ file, percent }`), `eds:upload-complete` (`{ file, response }`), `eds:upload-error` (`{ file, message }`).
- Textos: `uploadAddedOne/Many`, `uploadRemoved`, `uploadSent`, `uploadRejected`, `uploadMaxFiles`, `uploadTooLarge`, `uploadBadType`, `uploadFailed`, `uploadSending`, `uploadDone`, `uploadRemove`, `uploadRetry`, `uploadRetryLabel`, `uploadDuplicate`, `uploadNotAddedOne/Many`, `uploadSingleOnly`, `uploadFailedPending`, `uploadSendingLabel`, `uploadBusy`, `uploadRequired` (em `configure({ messages })`).

### Máscara de entrada (`data-eds-mask`)

`input[data-eds-mask]` (`maskBehavior`, `initMask`). A lógica está no núcleo puro `core/mask.ts` (sem DOM, `createMask(spec, options)`), exposto no subcaminho `@eds-ui/behavior/mask` para o `@eds-ui/react` não duplicar nada.

- **Modelo**: do texto do campo se extraem os caracteres significativos (dígitos, letras) e o texto mascarado é sempre reescrito a partir deles; a extração é consciente dos literais (um literal que também é dígito não vira significativo) e posicional (a posição 13 do CNPJ só aceita dígito). Os literais entram quando o próximo caractere é digitado e nunca sobram no fim.
- **Cursor**: nas máscaras de padrão, o cursor volta para depois do n-ésimo significativo que havia antes dele (a técnica do `datepicker`); na moeda, conta os dígitos **depois** do cursor, porque os zeros à esquerda aparecem e somem. Edição sem mudar os significativos (`deleteContentBackward`/`Forward` sobre um literal) apaga o significativo vizinho: o Backspace sobre `-` apaga o dígito anterior.
- **Colar**: o `paste` é tratado aqui (não passa pelo corte do `maxlength`) e dispara um `input` para frameworks. Telefone remove o `+55` ao colar no campo todo; moeda lê o texto como número (`1234.56`, `1.234,56` e `R$ 1.234,56` dão o mesmo; um inteiro como `1234` vale R$ 1.234,00, não 12,34).
- **Valor**: por padrão o que aparece. `data-eds-mask-unmask` troca o `name` por um hidden (`data-eds-mask-raw`) que acompanha `disabled`; o `name` volta no `destroy`. Valor posto por script é refeito no `blur`, no `change` e no `submit`; `reset` do formulário refaz o valor inicial. Valor inicial vindo do servidor sem máscara também é formatado.
- **Atributos**: `inputmode` (`tel`, `numeric`, `decimal`; `text` no CNPJ e CPF/CNPJ, pelas letras, e na moeda com negativo, para alcançar o `-`), `autocomplete` (só telefone e CEP) e `maxlength` (nunca na moeda e no número) só se o autor não os pôs; desfeitos no `destroy`.
- **Sem anúncio por tecla** e sem validação; evento `eds:mask-change` (`{ value, raw }`). Composição de IME (`isComposing`) não é mascarada até terminar.
- **Limitações**: o campo cheio não aceita dígito inserido no meio (o `maxlength` impede; selecionar e digitar por cima funciona); letras acentuadas perdem o acento nas posições de letra (`ç` vira `C`); não há máscara de data aqui (use DatePicker ou o campo de data nativo).

### Diálogos rápidos (alert, confirm, prompt)

`alert(texto, título?, tipo?, opções?): Promise<void>`, `confirm(...): Promise<boolean>`, `prompt(texto, valorPadrão?, título?, opções?): Promise<string | null>`, exportados do módulo e em `window.EDS`. `tipo` (`DialogVariant`): `info | success | warning | danger | question`; padrão `info` no alert e `question` no confirm e no prompt. `opções` (`DialogOptions`, último argumento): `okText`, `cancelText`, `placeholder`, `required`, `inputType` (`text | email | number | password | textarea`), `validate(valor) => string`, `variant`.

- Markup (um `<dialog>` criado em `document.body` por chamada e removido ao fechar): `dialog.eds-modal.eds-alert-dialog[data-variant]` com `.eds-alert-dialog-icon` (SVG inline `aria-hidden`: check, !, i, ?), `h2.eds-alert-dialog-title`, `p.eds-alert-dialog-text`, `.eds-alert-dialog-actions` com `.eds-button` (secundário "Cancelar" e principal; `eds-button-danger` quando `danger`). No prompt, `.eds-field` com `label.eds-visually-hidden` (o texto), `.eds-input` ou `.eds-textarea` e `p.eds-error[hidden]`. Com título: `aria-labelledby` = título e `aria-describedby` = texto; sem título o texto é o nome e não há `aria-describedby`. Severidade em prefixo oculto (`severity*`) antes do título (ou do texto); `question` não tem. `role="alertdialog"` no confirm e no prompt de `danger` e `warning`. O dialog leva `data-eds-backdrop="static"` para o `dialogBehavior` do Modal não fechá-lo: o fundo é tratado aqui.
- Fila: uma só caixa por vez, na ordem de chamada; a seguinte abre depois que quem esperava a anterior continua (microtask). Cada diálogo devolve o foco ao elemento que o tinha ao abrir; como o seguinte abre logo depois, ao fechar o último da fila o foco está de volta no elemento original.
- Foco inicial: alert no OK; confirm no Cancelar se `danger`, no principal nos demais; prompt no campo, com o texto selecionado. Enter confirma (no campo do prompt; no `textarea`, Ctrl/Cmd+Enter); Esc (`cancel`) cancela e o `keydown` Esc não se propaga; clique no fundo cancela (pointerdown e click fora da caixa); no `danger` o fundo não fecha. Retornos no cancelamento: `undefined`, `false`, `null`. Fechamento por fora (`dialog.close()`, evento `close`) também cancela.
- Prompt com `required` (espaços não contam) ou `validate`: o erro aparece em `p.eds-error` (`role="alert"`), o campo recebe `aria-invalid` e o id do erro em `aria-describedby`, o foco vai ao campo e o diálogo não fecha; ao digitar, o erro some.
- Textos: `dialogOk` ("OK"), `dialogCancel` ("Cancelar"), `dialogConfirm` ("Confirmar"), `dialogRequired`, e `severity*`.
- **`window.alert` (opt-in)**: `init(root, { nativeAlert: true })` ou `data-eds-native-alert` na tag `<script>` (o atributo vale para o auto-init; com `data-eds-manual`, passe a opção ao `init`). Troca só `window.alert` por `EDS.alert(String(msg))`, que devolve `undefined` e **não bloqueia** (diferença do nativo: o código seguinte roda sem esperar). Contado por referência; o `destroy` do último `init` restaura o original (e só se `window.alert` ainda for o nosso). `confirm` e `prompt` nativos nunca são trocados (são síncronos). Exportado também como `initNativeAlert()`.

### Confirmação declarativa (`data-eds-confirm`)

`data-eds-confirm="Excluir o pedido PED-0001?"` em `button`, `a` ou `form` pergunta antes de agir, usando o `confirm` acima. Opcionais: `data-eds-confirm-title`, `data-eds-confirm-variant` (`info | success | warning | danger | question`; padrão `question`) e `data-eds-confirm-ok` (texto do botão principal). Ligado por `init` (ou `initConfirm(root)`), com ouvintes de **captura** em `root` para `click` e `submit`; o `destroy` os remove.

- Intercepta com `preventDefault` + `stopImmediatePropagation` (os outros ouvintes do clique só rodam depois da confirmação) e pergunta. Cliques repetidos enquanto a pergunta está aberta são ignorados (um diálogo por elemento).
- Confirmado: **link** navega (`el.click()` sem reentrar no interceptador, por um conjunto de elementos "aprovados" limpo logo depois); **botão** comum recebe o clique de novo (os ouvintes dele finalmente rodam); **botão de envio** (`type=submit` dentro de um form) envia com `form.requestSubmit(botão)`, então o `submitter` (`name`/`value`, `formaction`) e a validação nativa valem; **form** com o atributo: o `submit` é interceptado e refeito com `requestSubmit(submitter)`. Se o botão de envio e o form tiverem `data-eds-confirm`, pergunta-se uma vez só (a do botão).
- Ignora botão `disabled` e botão com `aria-busy="true"`. Cancelar não faz nada. Não emite evento (o resultado é a ação).
- Limitações: `ctrl`/`shift`+clique em link (abrir em outra aba) perde o modificador depois da confirmação; `form` enviado por `form.submit()` (que não dispara `submit`) não é interceptado.

### Sortable (`data-eds-sortable`)

Reordenar itens, e trocá-los entre contêineres do mesmo `data-eds-group`, por ponteiro (mouse e toque) ou teclado. Markup: `[data-eds-sortable] > .eds-sortable-item[data-id]`, com um `button.eds-sortable-handle` opcional dentro do item; qualquer contêiner serve (`div`, `ul > li`). Código: `components/sortable.ts`, com o motor de ponteiro compartilhado com a Tree em `core/drag.ts`.

- Atributos: `data-eds-group` (troca entre contêineres), `data-eds-orientation="horizontal | grid"` (setas), `data-eds-name="campo[]"` (um `<input type="hidden" data-eds-sortable-input>` por item, na ordem, dentro do contêiner, mantido a cada mudança), `data-eds-disabled` (contêiner ou item), `data-eds-label` (nome falado do item; padrão: o texto sem o pegador) e `data-eds-help` (id da instrução; padrão: um `<p hidden>` criado ao lado do contêiner, com `sortableHelp`). A região de status e a instrução criadas pelo JS saem no `destroy`. Sem `role` e fora de `ul/ol`, o contêiner recebe `role="list"` e os itens `role="listitem"`; o pegador (ou, sem pegador, o item com `tabindex="0"`) leva `aria-describedby` para a instrução.
- **Ponteiro** (Pointer Events, não a API HTML5 de DnD): limiar de 4 px, fantasma clone `.eds-sortable-ghost`, original com `data-dragging` (o CSS o esconde) e `.eds-sortable-placeholder` reservando o destino, `data-drop-target` no contêiner alvo, rolagem automática do contêiner e da página perto da borda. **Toque**: com pegador começa no limiar; sem pegador (item inteiro) só depois de **segurar 400 ms** parado (antes, a página rola); `touch-action: none` do pegador vem do CSS.
- **Teclado** (alternativa ao arrasto, WCAG 2.5.7): Espaço ou Enter pega e solta; setas movem (a orientação define quais); com grupo, o eixo cruzado e PageUp/PageDown passam à lista vizinha (na grade só PageUp/PageDown); Home/End; Esc cancela e restaura; perder o foco cancela; na ponta, repete "Posição N de M.". Pego: `aria-pressed="true"` **só no `<button>` do pegador**; item sem pegador usa `data-grabbed` (nunca `aria-pressed` em `div`/`li`). O foco acompanha o item.
- Evento `eds:sortable-change` no contêiner de **destino** (não cancelável): `detail { id, from, to, fromIndex, toIndex, order }` (`from` e `to` são elementos; `order`, os `data-id` do destino). (Nome próprio, distinto do `eds:table-sort` cancelável da Table.)
- Textos (`configure({ messages })`): `sortableHelp`, `sortableListDefault`, `sortableGrabbed`, `sortablePosition`, `sortableMovedList`, `sortableDropped`, `sortableCancelled`, `sortableNoList` (modelos com `{label}`, `{pos}`, `{total}`, `{list}`).

### Tree (`data-eds-tree`)

Árvore navegável (APG Tree View) e, com `data-eds-editable`, editável. Markup: `.eds-tree > ul[role=tree] > li[role=treeitem][data-id] > .eds-tree-row (.eds-tree-toggle, .eds-tree-label) + ul[role=group]`. O JS numera `aria-level`, `aria-setsize`, `aria-posinset`, mantém `aria-expanded` (só em quem tem filhos) e `aria-selected`, o roving tabindex (um só `tabindex="0"`) e a região de status. Código: `components/tree.ts` (e o motor de `core/drag.ts`).

- Fonte: markup do servidor, ou `data-eds-source="/api/arvore.json"` com `[{ id, label, children?, hasChildren? }]` (o `fetch` vai com `edsLoader: false`, sem PageLoader). Filhos sob demanda: nó com `hasChildren: true` (no markup, `data-eds-lazy` no `li`) e `data-eds-children-url="/api/nos/{id}"` (sem `{id}`, o id é acrescentado); `aria-busy` no `li` durante a carga, falha anunciada e nova tentativa ao reexpandir.
- Atributos: `data-eds-editable`, `data-eds-multiselect` (`aria-multiselectable`; Ctrl/Shift + clique e Shift + setas), `data-eds-name` (hidden com o JSON da árvore, atualizado a cada mudança).
- **Navegação**: ↑/↓ visíveis, → expande ou vai ao primeiro filho, ← recolhe ou vai ao pai, Home/End, `*` expande os irmãos, digitação vai ao próximo nó que começa com a letra (sem acento nem caixa; só nós no DOM), Espaço seleciona, Enter ativa (`eds:tree-activate`; sem edição, também alterna a expansão).
- **Edição**: F2 ou duplo clique renomeia (input `.eds-input.eds-input-sm`; Enter e blur salvam, Esc cancela, vazio mantém o anterior); Insert ou Ctrl+Enter adiciona filho, Shift+Enter irmão ("Novo item", já em edição); Delete exclui (com subitens, `confirm` do módulo de diálogos; depois, toast "Desfazer" de 8 s com `action`, que restaura na mesma posição); Alt+↑/↓ sobem e descem entre irmãos, Alt+→ avança o nível e Alt+← recua; Shift+F10 ou a tecla de Menu abre o menu do botão "⋯" (`.eds-tree-action`, `tabindex="-1"`): adicionar filho, irmão, **pai** (envolve o nó), renomear, mover para cima/baixo, recuar/avançar nível, excluir. O menu é um disclosure em popover, como o Dropdown. Toda movimentação anuncia a posição ("X: nível 2, posição 1 de 3, dentro de Y.").
- **Arrastar** (mesmo motor do Sortable; no toque, segurar a linha 400 ms): zonas por linha, terço de cima `before`, meio `inside` (expande depois de 600 ms parado), terço de baixo `after` (`data-drop` no `.eds-tree-row`); soltar em si ou num descendente é proibido (`data-drop-invalid` e anúncio). Fantasma `eds-sortable-ghost eds-tree-ghost`.
- Eventos (em `.eds-tree`, com bubble): `eds:tree-change` `detail { action: 'add' | 'rename' | 'move' | 'delete' | 'wrap', node, parent, index, id, label, tree }` (`tree`: a estrutura atual em JSON); `eds:tree-beforechange` **cancelável** (`detail { action, node, parent, index }`; `preventDefault` impede a mudança, para validar no servidor); `eds:tree-select` `{ node, id, selected }`; `eds:tree-activate` `{ node, id }`; `eds:tree-toggle` `{ node, id, expanded }`.
- Textos: `treeLoading`, `treeLoadError`, `treeNewItem`, `treeRenameLabel`, `treeRenamed`, `treeNameEmpty`, `treeAdded`, `treeDeleteTitle`, `treeDeleteConfirmOne/Many`, `treeDeleted`, `treeUndo`, `treeRestored`, `treeMoved`, `treeMovedIn`, `treeCannotMove`, `treeDropInvalid`, `treeActions`, `treeMenu*` (modelos com `{label}`, `{level}`, `{pos}`, `{size}`, `{parent}`, `{count}`).
- Limitações: filtro, digitação e a árvore só alcançam os nós presentes no DOM; "Desfazer" só dura os 8 s do toast; o `data-eds-tree` também é emitido pelo React (`@eds-ui/react` `Tree`): **não** chame `init` sobre markup renderizado pelo React.

### Onda B: Accordion, Tooltip, Popover, Wizard e barra de filtros

Código em `components/{accordion,tooltip,popover,wizard,filter-bar}.ts`; posicionamento comum em `core/position.ts` (puro, testado). Todos entram no `init` e nos dois IIFE.

- **Accordion** (`.eds-accordion`): `<details>` nativo, sem JS para abrir, fechar e o grupo exclusivo (`name`). O behavior só impede `summary[aria-disabled="true"]` de alternar (o clique sintetizado por Enter e Espaço também).
- **Tooltip** (`data-eds-tooltip`, valor opcional = lado pedido `top|bottom|start|end`): o balão é o `.eds-tooltip[popover=manual]` apontado por `aria-describedby`. WCAG 1.4.13: hover só depois de 300 ms, foco sem atraso; **Esc** dispensa sem mover o foco (`preventDefault` em captura, para não fechar o diálogo em volta); **pairável** (120 ms de tolerância entre gatilho e balão, e fica aberto com o ponteiro sobre ele); **persistente** (enquanto há hover ou foco); clique no gatilho dispensa; toque não usa hover. Posição: `--_tooltip-x/-y` = ponto no **centro da borda do gatilho** voltada ao balão (o CSS centraliza e dá a folga) e `data-placement` com o lado em uso (vira se não couber). Sem eventos `eds:*`.
- **Popover** (`data-eds-popover` no botão com `popovertarget`; valor opcional = lado, `bottom` por padrão): `popover="auto"` nativo (clique fora e Esc). Posição: `--_popover-x/-y` = **canto superior esquerdo final** (com folga, dentro da viewport; provisória no `beforetoggle`, refinada no `toggle`) e `data-placement`. Sincroniza `aria-expanded`; ao fechar devolve o foco ao botão se ele estava dentro do painel (ou no `body`). Eventos em `[popover]`: `eds:popover-open` e `eds:popover-close` (`detail { trigger }`).
- **Wizard** (`form[data-eds-wizard]`): painéis `[data-eds-wizard-step]` (título: `[data-eds-wizard-title]`, primeiro cabeçalho ou o valor do atributo), botões `[data-eds-wizard-prev|next|finish]` (`finish` só na última etapa; sem ele o "avançar" da última etapa envia). Força `novalidate` e valida por painel (`checkValidity` + `reportValidity` no primeiro inválido). Foco no título do painel novo (`tabindex=-1`), anúncio `wizardStep` ("Etapa 2 de 4: Endereço."). Enter antes da última etapa avança (o `submit` só chega aos ouvintes do app no envio final: `stopImmediatePropagation` em captura); o envio final valida todos os painéis e leva ao primeiro inválido (marcado `error` no stepper). Atualiza o `.eds-stepper` do formulário (`data-eds-wizard-stepper="id"` aponta outro): `data-state`, `aria-current`, texto oculto "(concluída)"/"(com erro)", `.eds-stepper-summary` só no item atual; o rótulo de etapa concluída vira `<button class="eds-stepper-label">` (voltar por clique). Eventos no form: `eds:wizard-beforechange` (cancelável, `detail { from, to, direction }`) e `eds:wizard-change` (`{ from, to, step, total }`).
- **Barra de filtros** (`form[data-eds-filter-bar]`): monta os chips (`.eds-filter-chips > li > button.eds-chip[data-eds-filter-remove]`) com "Rótulo: texto da opção" a partir dos campos preenchidos (text, search, date em dd/mm/aaaa, select, checkbox e radio com o `legend` do fieldset, hidden dos widgets Combobox/MultiSelect/DatePicker/DateRangePicker). Os chips refletem o **aplicado** (init e cada `submit`), não o digitado; remover um chip limpa o campo e chama `requestSubmit()`; `reset` é interceptado: **limpa de verdade** e envia. O contador `.eds-filter-bar-count` do "Mais filtros" atualiza ao vivo. Foco depois de remover: próximo chip, anterior ou primeiro campo; região `role=status` (`filterRemoved`, `filterCleared`, `filterCount*`). Evento `eds:filter-change` no form a cada envio (`detail { reason: 'submit'|'remove'|'clear', values, filters, count }`). Opt-out: `data-eds-filter-ignore` no campo; rótulo próprio: `data-eds-filter-label`. Hidden fora de widget (parâmetros da página) é ignorado.
- **Corpo de modal rolável**: já vinha da onda A (`watchScrollRegion` em `modal.ts`: `tabindex=0`, `role=region` e `aria-labelledby` = título, só quando rola). **Select readonly no toque**: além de `mousedown`, `pointerdown` e `touchend` têm `preventDefault` (o `touchstart` fica livre para não travar a rolagem).
- Textos (`configure({ messages })`): `wizardStep`, `wizardStepComplete`, `wizardStepError`, `wizardStepUntitled`, `wizardSummary`, `filterChips`, `filterRemove`, `filterRemoved`, `filterCleared`, `filterCountNone/One/Many`, `filterMoreCount`.
- `@eds-ui/behavior/balloon` (subcaminho para o React): exporta só `tooltipBehavior`, `popoverBehavior` e `TOOLTIP_SHOW_DELAY`, como `Behavior` avulsos (o React chama `bind(gatilho)` num efeito, sem `init`). Os apps precisam do alias antes do `@eds-ui/behavior`.

## PageLoader

Diálogo `dialog.eds-page-loader` aberto com `showModal()`: o top layer deixa o resto da página inerte; `cancel` (Esc) é bloqueado; `tabindex="-1"` no dialog; `aria-busy="true"` no `main` (ou `[role=main]`) enquanto aberto. Só é adotado um dialog declarado para isso (`dialog#eds-page-loader` ou `dialog[data-eds-page-loader]`; nunca qualquer `.eds-page-loader`); senão o JS cria um (`id="eds-page-loader"`, `.eds-spinner.eds-spinner-lg`, `.eds-page-loader-title`, `.eds-page-loader-text`) e o remove no `destroy`. O `keydown` Esc no diálogo recebe `preventDefault` (no Chrome o segundo Esc seguido não gera `cancel` cancelável e fecharia o diálogo; cancelar o `keydown` o evita na origem). Se mesmo assim o diálogo for fechado por fora e ainda houver pendências, o evento `close` o reabre com `showModal()` na hora (foco de volta ao diálogo); `aria-busy` do `main` acompanha sempre o estado real.

- Tempo: só aparece se o processamento passar de `delay` (300 ms); visível, fica no mínimo `minVisible` (400 ms). Fecha só quando todas as pendências terminam; a última pendência define os textos.
- API: `loader.start(opts?)` devolve `done()` (idempotente); `loader.track(promise, opts?)`; `loader.reset()`; `opts = { title?, text? }`. Eventos no dialog: `eds:loader-show`; `eds:loader-hide` com `detail { reason }` (`done`: todas as pendências terminaram; `timeout`: o usuário usou "Fechar" na saída por demora; `closed`: fechado por `reset()`, `pageshow` persistido, modo `off` ou `destroy`); `eds:loader-timeout` (`detail { pending }`) quando a saída por demora aparece.
- **Saída por demora**: depois de `slowAfter` (20 s) o texto vira "Está demorando mais que o esperado." (`loaderSlowText`) e o diálogo mostra, numa `.eds-stack.eds-stack-row.eds-gap-3`, `.eds-button.eds-button-secondary` "Fechar" e `.eds-button.eds-button-primary` "Continuar aguardando" (`loaderClose`, `loaderContinue`), com o foco em "Continuar aguardando". "Fechar" libera a página, mantém as pendências contando em silêncio (nada reabre enquanto elas não terminarem) e fecha com `reason: 'timeout'`; "Continuar aguardando" reinicia a contagem. Vale para fetch, XHR e navegação.

### Modo e configuração (no carregamento do pacote)

| Modo     | Efeito                                                         |
| -------- | -------------------------------------------------------------- |
| `auto`   | Padrão. Intercepta fetch, XHR, envio de form e clique em link. |
| `manual` | Cria o loader sob demanda; só `start`/`track`.                 |
| `off`    | Nada é criado nem interceptado; `start` é um no-op.            |

```html
<script
  src=".../eds-behavior.js"
  defer
  data-eds-loader="auto"
  data-eds-loader-title="Carregando…"
  data-eds-loader-text="Aguarde um instante."
  data-eds-loader-slow-after="20000"
  data-eds-loader-trigger="all"
></script>
```

```ts
init(document, {
  loader: {
    auto: true,
    delay: 300,
    minVisible: 400,
    title,
    text,
    exclude: [/\/api\/poll/, 'heartbeat'],
    navigationTimeout: 10000,
    slowAfter: 20000,
    trigger: 'all',
  },
});
configure({ loader: { mode: 'manual' } }); // vale também depois do init (liga/desliga as interceptações)
```

`LoaderOptions`: `mode` (`auto`/`manual`/`off`), `auto` (atalho: `true` = auto, `false` = manual; `mode` vence), `delay`, `minVisible`, `title`, `text`, `exclude` (RegExp ou trecho de texto, testados na URL), `navigationTimeout` (ms; `0` desliga; padrão 10000), `slowAfter` (ms; `0` desliga; padrão 20000), `trigger` (`all` padrão: todo fetch/XHR conta, como pediu o usuário; `user`: só os iniciados com `navigator.userActivation.isActive`, e sem suporte a `userActivation` conta tudo).

### O que o modo `auto` intercepta e como excluir

- **`fetch`** (patch em `window.fetch`) e **`XMLHttpRequest`** assíncrono (patch no protótipo: `open`, `send`, `setRequestHeader`). Fecha ao responder ou falhar (fetch: quando os cabeçalhos chegam).
- **Envio de `<form>`** e **clique em `<a href>`** que navegam a página inteira (ouvintes no `document`, fase de bolha: se o consumidor já deu `preventDefault`, ignora, e o `fetch` dele é rastreado). A decisão é tomada **depois** dos outros ouvintes (fim da tarefa): relê `defaultPrevented` e `isConnected`, para respeitar Turbo, Livewire e SPAs que cancelam o evento ou trocam o DOM. O loader fica até a página trocar. `pageshow` persistido (voltar pelo histórico) fecha. `beforeunload` seguido de página ainda viva após ~800 ms significa navegação cancelada (ex.: "Ficar" no aviso de alterações) e fecha o loader. Como um download deixaria o loader preso, ele fecha sozinho após `navigationTimeout` (10 s). Links com `download` e para extensões de arquivo comuns (pdf, xlsx, xls, csv, zip, docx, doc, odt, ods) são ignorados.
- **Exceções**: `data-eds-loader="off"` em `form`, `a` ou no botão submit (`submitter`); `fetch(url, { edsLoader: false })`; cabeçalho `X-EDS-Loader: off` em fetch ou XHR (**removido antes de enviar**); lista `exclude`; link externo, âncora na mesma página, `target` diferente de `_self`, `download`, clique com modificador/botão que não o principal, `method="dialog"`, `aria-disabled="true"`; requisições do Combobox.
- **Textos por requisição**: `data-eds-loader-title`/`data-eds-loader-text` em form, link ou botão submit; em fetch, `fetch(url, { edsLoader: { title, text } })`.
- **Restauração**: o `destroy` do último `init` restaura `fetch`, `XMLHttpRequest.prototype.*` e remove os ouvintes. Se outra biblioteca embrulhou `fetch` por cima do nosso, ele não é desfeito (não dá), mas o patch fica inerte (só repassa a chamada).

## Limitações conhecidas

- `fetch` fecha o loader quando a resposta começa, não quando o corpo termina de ser lido.
- Submit e link: não há como saber de antemão se a navegação troca a página. Os guardas são `beforeunload` + 800 ms, `navigationTimeout` (10 s) e a saída por demora; downloads sem extensão conhecida devem levar `data-eds-loader="off"` (ou `download`).
- Sidebar: só a do slot do shell (`.eds-app > .eds-sidebar`) tem o comportamento off-canvas; o colapsar vale em qualquer `.eds-sidebar`.
- Dropdown: sem setas (continua disclosure, navegável por Tab).
- Diálogos rápidos: o `window.alert` trocado (opt-in) não bloqueia; `data-eds-confirm` não intercepta `form.submit()` nem preserva modificadores de clique em link.
- Sortable e Tree: o arrasto por toque sem pegador exige segurar 400 ms; o filtro e a digitação por letra da Tree só alcançam os nós no DOM. Ainda sem validação em celular e tablet reais (Fase 7).
- Não validado em leitor de tela real, Firefox e Safari (Fase 7). Os testes usam jsdom com polyfills de `dialog` e Popover, então foco preso, top layer e `toggle` real não são cobertos.
