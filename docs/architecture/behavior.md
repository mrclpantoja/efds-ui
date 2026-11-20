# `@eds-ui/behavior`: comportamento para quem usa só HTML

JavaScript puro (TypeScript no código-fonte), **zero dependências**, sem conhecer React nem o core (o consumidor carrega o CSS). Implementa em DOM as mesmas obrigações que `@eds-ui/react` cumpre, levantadas em [`comportamento.md`](./comportamento.md). O markup é o contrato do core (`apps/docs/src/examples/**/*.html`).

## Saídas

| Arquivo                   | Uso                                                                                      |
| ------------------------- | ---------------------------------------------------------------------------------------- |
| `dist/index.js` + `.d.ts` | ESM tree-shakeable (`import { init, initTabs, toast, loader } from '@eds-ui/behavior'`). |
| `dist/eds-behavior.js`    | IIFE para `<script src defer>`: `window.EDS` e `init(document)` automático.              |

`package.json`: `exports["."]` (ESM) e `exports["./eds-behavior.js"]` (IIFE); `unpkg`/`jsdelivr` apontam para o IIFE. O IIFE minificado tem cerca de 60 kB (cerca de 20 kB com gzip). `pnpm pack:check` valida o tarball e confere que o IIFE é script clássico com `EDS` e auto-init.

## API

```ts
init(root?: ParentNode = document, options?: BehaviorOptions): () => void  // destroy()
configure({ messages?, loader? }): void
toast(options): number;  toast.dismiss(id);  toast.dismissAll()
loader.start(opts?): () => void;  loader.track(promise, opts?): Promise;  loader.reset()
initTabs | initModal | initDropdown | initAlert | initTable | initTableFilter | initSidebar | initCombobox | initDatepicker (root?) => destroy
initToast() | initLoader() => destroy   // sistemas globais, contados por referência
```

- `init` liga tudo que existe em `root` e observa `root` com `MutationObserver`: elementos que entram são ligados, os que saem (de fato fora do `root`) são desligados. **Nada fora do `root` é ligado.** Cada elemento é ligado uma única vez por comportamento (guarda interna em `WeakMap`, sem atributo no DOM), mesmo com `init` repetido ou `root`s sobrepostos.
- `destroy()` remove ouvintes, para o observador, aborta requisições do Combobox e, quando é o último `init`, desmonta o toast e o PageLoader (restaurando `fetch` e `XMLHttpRequest`). É idempotente.
- Markup renderizado pelo `@eds-ui/react` não deve ser ligado por este pacote: chame `init` só no `root` do HTML cru (o site de docs usa `init(previewEl)`).
- Textos em pt-BR; `configure({ messages })` troca qualquer um (chaves em `Messages`: `toastClose`, `severity*`, `sortedBy`, `sortAscending`, `sortDescending`, `selectedNone|One|Many`, `tableFilterMany|One|None|Cleared|ClearedOne|Empty`, `comboResultsMany|One`, `comboNoResults`, `comboError`, `loaderTitle`, `loaderText`). Os modelos usam `{count}`, `{column}` e `{direction}`.

## Componentes

Eventos são `CustomEvent` com prefixo `eds:` e `bubbles`.

### Tabs

`.eds-tabs > .eds-tablist[role=tablist] > .eds-tab[role=tab][aria-controls]`, painéis `role=tabpanel`. Roving tabindex (0 na ativa, ou na focada enquanto o foco está na lista), ←/→ com volta (invertidas em RTL), Home/End. Aba `aria-disabled="true"` ou `disabled` recebe foco por seta, mas não é ativada. Painéis inativos recebem `hidden`. Ativação automática. A aba ativa inicial é a de `aria-selected="true"` (ou a primeira habilitada).
Evento `eds:tabs-change` em `.eds-tabs`: `detail { tab, panel, id }`.

### Modal e Drawer

- `<button data-eds-open="ID">` chama `showModal()` no `dialog` e foca `[data-autofocus]` se houver (o foco inicial padrão é o nativo). Evento `eds:modal-open` no dialog: `detail { trigger }`.
- `dialog.eds-modal` / `dialog.eds-drawer`: fecha pelo backdrop só se `pointerdown` e `click` ocorreram no próprio `<dialog>` (WCAG 2.5.2); `data-eds-backdrop="static"` desliga. `[data-eds-close]` dentro do dialog fecha (`value` do atributo vira `returnValue`). Esc, foco preso e retorno de foco são nativos. O corpo (`.eds-modal-body`/`.eds-drawer-body`) vira `role=region` focável com `aria-labelledby` do título só quando rola.

### Dropdown

`.eds-dropdown[popover]` (padrão disclosure, sem `role="menu"`). Sincroniza `aria-expanded` de todos os `[popovertarget]` que apontam para ele (fora do menu) pelo evento `toggle`; fecha quando o foco sai do menu e do gatilho (Tab); item `aria-disabled="true"` não age. Itens que fecham o menu usam `popovertargetaction="hide"` (nativo).

### Toast

`toast({ variant?, title?, message, duration? })` devolve o id. A região `.eds-toast-region[aria-live=polite]` é criada vazia na primeira chamada e o primeiro toast entra ~50 ms depois (live region nascida preenchida não é anunciada). Com `dialog:modal` aberto a região vai para dentro dele; ao fechá-lo volta ao `body`. `info`/`success`: máx(5 s, ~1 s a cada 10 palavras); `warning`/`danger` não fecham sozinhos; `duration` (ms) sobrepõe, `0` mantém. Pausa em hover e foco (o tempo restante é preservado). Esc com o foco no toast fecha só o toast. Ao fechar um toast que tinha o foco, o foco volta a quem estava focado ao disparar (ou ao 1º controle do dialog, ou ao `<main>`). `danger` tem `role="alert"`. Sem `title`, a severidade vai num prefixo oculto. Máximo de 3 visíveis; os demais esperam. `eds:toast-close` no toast: `detail { id }`.

### Alert fechável

`[data-eds-dismiss]` dentro de `.eds-alert` remove o aviso e move o foco para o próximo focável após ele (na falta, o anterior; por fim o `<main>`). `eds:dismiss` (cancelável, no alert) sai antes: com `preventDefault` o aviso fica.

### Table

`table.eds-table`:

- **Ordenação**: `button.eds-table-sort` em `th`. Ordena o `tbody` no cliente pelo texto da célula ou `data-sort-value` do `td`; reconhece número (pt-BR ou ponto decimal), data (`dd/mm/aaaa` ou ISO) e texto (`Intl.Collator('pt-BR')`, sem diferenciar acento/caixa); vazios por último. Atualiza `aria-sort` (`none` nas demais ordenáveis) e anuncia no `[role=status]`. `eds:sort` (cancelável, na tabela, `detail { column, label, direction, th }`) sai antes: com `preventDefault` o consumidor ordena (e atualiza `aria-sort`) no servidor.
- **Seleção**: `input[data-eds-select-all]` e `input[data-eds-select-row]`: `indeterminate`, linhas desabilitadas ignoradas, contagem com plural no status. `eds:select-change`: `detail { count, rows, total }`. **Com filtro**, só as linhas visíveis (sem `hidden`) contam: "selecionar todos", o estado do cabeçalho, `count` e `rows` olham as visíveis; uma linha oculta e marcada continua marcada (e segue no envio do formulário), e `total` traz a contagem de marcadas incluindo as ocultas.
- **Filtro local**: `input[data-eds-table-filter="ID-DA-TABELA"]` (com `aria-controls` e nome acessível) liga o campo a `<table id>`, mesmo fora dela (ex.: `.eds-table-toolbar`). Filtra as linhas do `tbody` por substring sem acento e sem caixa (`normalizeText`, o mesmo do Combobox) sobre o texto de todas as células, menos as com `data-eds-filter-ignore`; `data-eds-filter-columns="1,2"` (base 1) restringe as colunas. Linha que não casa recebe `hidden`. Debounce de 150 ms no `input`; Esc com texto limpa e reaplica na hora (`stopPropagation`, não fecha um Modal em volta). A ordenação mantém o filtro; linhas acrescentadas ou reordenadas depois passam pelo filtro (`MutationObserver`). Vazio: a linha com `.eds-table-empty` do próprio markup é exibida quando nada casa e oculta caso contrário; sem ela, o JS cria `tr[data-eds-filter-empty] > td.eds-table-empty[colspan] > .eds-empty > p.eds-empty-text` ("Nenhum resultado para "X"."). Status em região `role=status` própria, criada vazia logo depois do campo, só após o debounce: "3 resultados." / "1 resultado." / "Nenhum resultado." e, ao limpar, "Filtro removido. 8 linhas.". Evento `eds:table-filter` no campo: `detail { query, count }`. **Só alcança as linhas que estão no DOM**: com paginação no servidor, filtre no servidor (o campo deve enviar a consulta). Internamente a Table recebe `eds:table-filtered` (na tabela) para reler a seleção.
- **Região de status**: a indicada por `data-eds-status="ID"` na tabela, o `[role=status]` irmão do `.eds-table-wrap` ou, na falta, um novo (oculto, vazio) logo depois do wrap.
- **Rolagem**: `.eds-table-wrap` ganha `tabindex=0`, `role=region` e `aria-labelledby` (o `caption`) só quando rola (`ResizeObserver`).

### Sidebar

- `.eds-app > .eds-sidebar[popover]`: ao abrir, `.eds-app-header`, `.eds-app-main` e `.eds-skip-link` ficam `inert`; sincroniza `aria-expanded` dos gatilhos; foca o item `aria-current="page"` (ou o primeiro); ao fechar remove o `inert` e devolve o foco ao gatilho; clicar num link fecha e foca o `main`.
- `[data-eds-sidebar-collapse]` (botão dentro de `.eds-sidebar`): alterna `data-collapsed` na sidebar e `aria-expanded` (e põe `aria-controls`). `eds:sidebar-collapse`: `detail { collapsed }`.

### Combobox

Padrão APG "combobox com lista, autocomplete=list". Markup em `packages/core/src/components/combobox.css`.

- Teclado: digitar filtra e abre; ↓ abre (e vai para a 1ª) ou avança; ↑ volta (sem dar a volta; fechado, abre na última); Alt+↓ abre sem mover; Alt+↑ fecha; Enter seleciona a destacada (aberto) ou envia o formulário (fechado; aberto sem destaque fecha a lista e o formulário segue); Esc aberto fecha e Esc fechado limpa o texto (ambos com `stopPropagation`, para não fechar um Modal em volta); Tab e perder o foco fecham sem selecionar; Home/End movem o cursor. Opções `aria-disabled="true"` são puladas. O destaque usa `aria-activedescendant` no input + `aria-selected` na opção + scroll. Clique na opção seleciona (o `pointerdown` não tira o foco do input); `pointermove` sobre uma opção habilitada move o destaque, sem rolar a lista. Enquanto o popup está `aria-busy="true"` (busca remota) setas e Enter são ignorados (e Enter não envia o formulário).
- Seleção: o input mostra o rótulo, o `input[type=hidden]` recebe `value` (e `data-value`) e dispara `input`/`change`; a opção escolhida ganha `data-current`. Editar o texto depois limpa o valor. Enquanto houver texto e valor vazio, o input recebe `setCustomValidity(messages.comboboxInvalid)` ("Escolha uma das opções da lista."), então o formulário não envia o rótulo digitado; limpa ao escolher ou esvaziar. `data-eds-free-text` no `.eds-combobox` é o opt-out para texto livre (o hidden recebe o texto digitado, sem validação). Evento `eds:combobox-change` no `.eds-combobox`: `detail { value, label }` (`value: ''` ao limpar).
- Filtro local: "contém", sem diferenciar acento nem caixa. O estado inicial lê o `value` do hidden.
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
- Obrigatório: `aria-required="true"` (ou `required`) no input aplica `setCustomValidity(comboMultiRequired)` ("Escolha ao menos uma opção.") enquanto não houver escolha.
- Status (neutro em gênero): "Pelotas: selecionado. 3 itens selecionados." / "Pelotas: removido. 2 itens selecionados." (`comboMultiSelected`, `comboMultiRemoved` + `selectedNone/One/Many`). A contagem de resultados é a do Combobox.
- Evento `eds:combobox-change` no `.eds-combobox`: `detail { values, labels }` (arrays, na ordem de escolha). `input` e `change` também sobem do `.eds-combobox`. O popup ancora na `.eds-combobox-control` (largura do campo todo).

### DatePicker e DateRangePicker

`[data-eds-datepicker]` (uma data) e `[data-eds-daterange]` (período) no `.eds-datepicker`; `initDatepicker` liga os dois. Markup em `packages/core/src/components/{datepicker,calendar}.css`: campo(s) de texto, `.eds-datepicker-toggle`, hidden(s) ISO, `.eds-calendar[role=dialog][popover=manual]` e `[role=status]`. O JS **monta o conteúdo do `.eds-calendar`** (header `[nav anterior][título h2 aria-live=polite][nav próximo]`, selects de mês e ano, `table.eds-calendar-grid[role=grid]`, rodapé Hoje/Fechar); o markup só traz o contêiner. Sem JS vira um campo de texto (para zero JS use `<input type="date">`).

- Datas sem fuso (`core/date.ts`): calendário `{ano, mês, dia}`, nunca `new Date('aaaa-mm-dd')`. Semana começa no domingo; nomes por `Intl.DateTimeFormat(messages.dateLocale)` (`pt-BR`). `eds:date-change` entrega `date` como `Date` local.
- Atributos no `.eds-datepicker`: `data-eds-min`, `data-eds-max` (ISO), `data-eds-disabled-dates="aaaa-mm-dd,..."`, `data-eds-disable-weekends`; no período também `data-eds-max-days` (dias corridos, inclusive). Lidos a cada uso.
- Campo de texto: máscara dd/mm/aaaa (só dígitos, barras automáticas, caret preservado); cola dd/mm/aaaa ou aaaa-mm-dd. A cada digitação o hidden ISO e `setCustomValidity` ficam em dia (texto parcial = inválido, o formulário não envia); `aria-invalid="true"` e o evento só no `change`/blur. Mensagens: `dateInvalid`, `dateBetween|From|Until`, `dateBlocked`; período: `rangeEndBeforeStart`, `rangeMaxDays`, `rangeNeedStart|End` (um campo só preenchido, se não for `required`). Hidden vazio quando inválido. No `change`/blur com erro, o JS cria `<p class="eds-error" id="<input-id>-err">` logo após o `.eds-datepicker`, anexa o id ao `aria-describedby` do campo afetado e anuncia a mensagem no status; ao corrigir, remove os três. Ano com 2 dígitos (dd/mm/aa) tem mensagem própria (`dateInvalidShortYear`). `readonly` ou `disabled` no campo desabilita o botão do calendário.
- Abrir: botão (`aria-expanded`, `aria-haspopup="dialog"`, `aria-controls`) ou Alt+↓ no campo. Foco inicial no dia escolhido, senão hoje, limitado a min/max (no período, o campo de onde abriu). Fechar: Esc (stopPropagation, devolve o foco ao botão, não fecha Modal em volta), escolher, Fechar, botão de novo; clicar fora fecha **sem mover o foco**. Tab circula no diálogo.
- Grade (roving tabindex): ←/→ dia, ↑/↓ semana, Home/End domingo/sábado, PageUp/Down mês, Shift+PageUp/Down ano (dia ajustado ao fim do mês: 29/02 vira 28/02), Enter/Espaço escolhem. O foco não sai de min/max. Dia indisponível (`aria-disabled="true"`) recebe foco, mas não é escolhido: status "{data}: data indisponível.". Nome do dia: "15 de março de 2026, domingo" (número visível primeiro; no período, início e fim ganham ", início do período"/", fim do período" por `rangeStartLabel`/`rangeEndLabel`); o diálogo tem `aria-modal="true"` e o botão ganha o valor no nome ("Escolher data. Atual: 15/03/2026", `dateCurrent`/`rangeCurrent`); `aria-current="date"` em hoje; `aria-selected="true"` no escolhido; fora do mês, `<td>` vazio. Nav fora de min/max fica `aria-disabled` (sem `disabled`, para não perder o foco); meses/anos fora do intervalo ficam fora dos selects.
- Hoje: escolhe a data de hoje; se estiver indisponível, anuncia e leva o foco ao dia de hoje. Anos do select: hoje −100/+50 (ou min/max), fixos até min/max mudarem; o ano da visão entra se estiver fora.
- Período: 1º Enter/clique = início, 2º = fim (anterior ao início vira o novo início); fecha ao escolher o fim; Esc no meio descarta e mantém o período anterior. `aria-selected` em todos os dias do período; `data-range="start|middle|end"` (`single` com só o início ou início = fim); `data-range-preview` (sem `aria-selected`) entre o início e o dia focado/sob o mouse. Dias além de `data-eds-max-days` ficam `aria-disabled` e avisam. Datas bloqueadas podem ficar no meio. Status: "Início: 03/03/2026. Escolha a data final." e "Período: 03/03/2026 a 15/03/2026.".
- Posição: o JS define em px `--_calendar-x` (esquerda do `.eds-datepicker`) e `--_calendar-y` (borda de baixo; com `data-placement="top"`, a de cima). Sem largura (o CSS decide). Recalcula em `scroll` (captura) e `resize`.
- Eventos no `.eds-datepicker`: `eds:date-change` `detail { value: "aaaa-mm-dd" | null, date: Date | null }`; `eds:daterange-change` `detail { start, end }` (ISO ou `null`). Só quando o valor aceito muda. O hidden dispara `input`/`change`.
- Textos (`configure({ messages })`): `dateLocale`, `dateChoose`, `rangeChoose`, `datePrevMonth`, `dateNextMonth`, `dateMonth`, `dateYear`, `dateToday`, `dateClose`, `dateInvalid`, `dateBetween`, `dateFrom`, `dateUntil`, `dateBlocked`, `dateUnavailable`, `dateSelected`, `rangeStart`, `rangePeriod`, `rangeEndBeforeStart`, `rangeMaxDays`, `rangeMaxDaysOne`, `rangeNeedStart`, `rangeNeedEnd`, `dateInvalidShortYear`, `dateCurrent`, `rangeCurrent`, `rangeStartLabel`, `rangeEndLabel`.

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

## PageLoader

Diálogo `dialog.eds-page-loader` aberto com `showModal()`: o top layer deixa o resto da página inerte; `cancel` (Esc) é bloqueado; `tabindex="-1"` no dialog; `aria-busy="true"` no `main` (ou `[role=main]`) enquanto aberto. Só é adotado um dialog declarado para isso (`dialog#eds-page-loader` ou `dialog[data-eds-page-loader]`; nunca qualquer `.eds-page-loader`); senão o JS cria um (`id="eds-page-loader"`, `.eds-spinner.eds-spinner-lg`, `.eds-page-loader-title`, `.eds-page-loader-text`) e o remove no `destroy`. Se o diálogo for fechado por fora (ex.: o segundo Esc do Chrome, que não é cancelável) e ainda houver pendências, ele é reaberto; `aria-busy` do `main` acompanha sempre o estado real.

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
- Não validado em leitor de tela real, Firefox e Safari (Fase 7). Os testes usam jsdom com polyfills de `dialog` e Popover, então foco preso, top layer e `toggle` real não são cobertos.
