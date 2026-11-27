# Table avançada: contrato (etapa 3 do plano 1.0)

Contrato de markup, atributos, ARIA, teclado, eventos e API React da Table avançada. Serve de fonte única para o `especialista-css` e o `especialista-js` implementarem em paralelo. Estende `table.css`, `packages/behavior/src/components/table*.ts` e `packages/react/src/components/Table/`. Alvo: 1.0.0 (ainda não publicada); onde há quebra, há guia de migração. Dados dos exemplos são fictícios.

## 0. Princípios

1. **`<table>` semântica sempre.** Nenhum `role="grid"` (ver 3.8). Cada controle é um `<button>`/`<a>`/campo nativo com nome próprio.
2. **Opt-in por atributo** na `<table>` ou no `<th>`. Sem atributo, a Table se comporta como hoje.
3. **Coluna tem identidade**: `th[data-eds-col="id"]` (ids em kebab/minúsculas, únicos na tabela). Tudo que reordena ou oculta usa o id, nunca o índice. `data-eds-filter-columns` passa a aceitar ids além de índices (base 1).
4. **Reordenar = mover as células no DOM** (th, td e `<col>`), para a ordem de Tab ser a ordem visual (WCAG 1.3.2, 2.4.3). Ocultar = atributo `hidden` nas células.
5. **Controles que só funcionam com JS vêm `hidden` no HTML** e o behavior os revela.
6. **Sem JS onde der**: ordenação e paginação por links, filtro por `<form method="get">` em popover nativo (3.7).
7. **Toda ação com arrasto tem alternativa de clique/teclado** (WCAG 2.5.7): o painel "Colunas" (3.4).
8. **Um só anúncio por ação do usuário**, na região `role="status"` da tabela (a de `statusRegion()`), com debounce. Nenhum controle novo cria região viva própria.
9. Textos em `configure({ messages })` (chaves na seção 11) e `texts` no React. Nenhum valor visual literal: o CSS usa só tokens semânticos.

## 1. Estado, query e controlador

Formato canônico do estado (behavior e React):

```ts
interface SortCriterion {
  key: string;
  direction: 'ascending' | 'descending';
} // key = data-eds-col
type FilterValue = string | string[] | { gte?: string; lte?: string }; // texto | seleção | faixa (número/data ISO)
interface TableQuery {
  page: number; // base 1
  size: number;
  sort: SortCriterion[]; // ordem = prioridade
  filters: Record<string, FilterValue>;
  q: string; // busca geral (input[data-eds-table-filter])
}
interface TableColumnState {
  order: string[];
  hidden: string[];
  widths: Record<string, number>;
} // px
```

Controlador (behavior), obtido por `EDS.table(tableEl)` (`tableController(table)` no ESM; `null` se não ligada):

| Método                                                      | Efeito                                                                                                                                          |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `getState()`                                                | `{ query, columns, selection: { count, ids, scope: 'page' \| 'all' }, loading }`                                                                |
| `setState({ sort?, filters?, q?, page?, size?, columns? })` | Aplica (e atualiza `aria-sort`, chips, controles); não emite `eds:table-query`. Para o app atualizar a UI depois de ordenar/filtrar no servidor |
| `clearSelection()`                                          | Desmarca tudo                                                                                                                                   |
| `setLoading(boolean)`                                       | `aria-busy`, `inert` e sobreposição (ver 3.7)                                                                                                   |

Funções puras, sem DOM, exportadas por `@efds-ui/behavior/export` (já tem alias; **sem subcaminho novo**): `parseTableQuery(search, params?)`, `toTableSearchParams(query, params?)`, `sortByCriteria`, `matchColumnFilter`.

## 2. 3.1 Colunas fixas no início e no fim

Classes (contrato de CSS), em `th` e `td` da coluna:

| Classe                 | Efeito                                                                    |
| ---------------------- | ------------------------------------------------------------------------- |
| `.eds-table-pin-start` | Coluna fixa no início (`inset-inline-start: var(--_pin-inset, 0)`)        |
| `.eds-table-pin-end`   | Fixa no fim (`inset-inline-end: var(--_pin-inset, 0)`)                    |
| `.eds-table-pin-edge`  | Última do grupo início / primeira do grupo fim: leva a borda de separação |

- `.eds-table-sticky-col` continua válido e equivale a `pin-start` + `pin-edge` na primeira coluna (sem quebra).
- Fundo opaco por `--_sticky-bg` (hover e selecionada incluídos), como hoje. `z-index` acima das células comuns e abaixo do cabeçalho fixo; canto do `thead` acima de tudo (como hoje).
- **Sem JS**: no máximo uma coluna `pin-start` e uma `pin-end` (offset 0). **Com JS** pode haver várias: o behavior soma as larguras das fixas anteriores e grava `--_pin-inset` em cada célula (ResizeObserver no `th`), mantém `pin-edge` e grava no wrap `--_pin-start-size` e `--_pin-end-size`.
- Declaração para quem usa JS: `th[data-eds-pin="start|end"]`; o behavior aplica as classes em todas as células da coluna (inclusive linhas inseridas depois, via MutationObserver). Quem renderiza no servidor pode escrever as classes direto.
- **Foco não encoberto (WCAG 2.4.11)**: `.eds-table-wrap { scroll-padding-inline: var(--_pin-start-size, 0) var(--_pin-end-size, 0) }`.
- **Reflow (1.4.10)**: se as fixas somarem mais de 60% da largura do wrap, o behavior põe `data-pin-disabled` no wrap e o CSS volta as células a `position: static`. Em `.eds-table-stack` estreita as fixas já são desligadas (como hoje).
- Colunas fixas não saem do próprio grupo ao reordenar (3.4). O usuário não fixa colunas na v1; o autor declara. Preferências não guardam fixação.
- Tokens: `--eds-z-sticky`, `--eds-color-border-default`, `--eds-color-bg-surface`/`-subtle`, `--eds-color-action-primary-subtle`. Sem token novo.

## 3. 3.2 Ordenação múltipla

Opt-in: `data-eds-sort-multi="shift"` (padrão quando o atributo existe sem valor) ou `"add"` (todo clique acrescenta; para toque); `data-eds-sort-max="3"` (padrão 3).

**Interação** (botão `.eds-table-sort`, igual hoje):

| Gesto                                                  | Efeito                                                                                                                                       |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Clique / Enter / Espaço                                | Substitui toda a ordenação por esta coluna: ascendente, depois alterna (comportamento atual)                                                 |
| Shift+clique, Shift+Enter, Shift+Espaço (modo `shift`) | Coluna fora da ordenação: acrescenta ascendente no fim. Já ordenada: alterna a direção mantendo a posição; depois de descendente, **remove** |
| Clique (modo `add`)                                    | Idem à linha acima                                                                                                                           |
| `button[data-eds-sort-clear]` (opcional, na toolbar)   | Remove toda a ordenação; foco permanece no botão; anuncia "Ordenação removida."                                                              |

O behavior trata `keydown` Shift+Enter/Espaço explicitamente (o `shiftKey` do click gerado por teclado não é confiável entre navegadores). Máximo atingido: ignora e anuncia `sortMaxReached`. Dica: texto oculto `<p id class="eds-visually-hidden">` criado pelo behavior e ligado por `aria-describedby` a cada botão (`sortHint`, só no modo `shift`).

**ARIA** (decisão): `aria-sort` **só no th do critério primário** (ARIA recomenda um por tabela); nos demais ordenáveis, `aria-sort="none"` apenas se não estiverem na ordenação, e **sem** `aria-sort` se forem critério secundário. A prioridade secundária é dita por: (a) texto oculto dentro do botão, `<span class="eds-visually-hidden eds-table-sort-text">, critério 2, decrescente</span>` (`sortOrderLabel`), e (b) anúncio completo na região de status: "Ordenado por Cliente, crescente, depois Total, decrescente.".

**Marcação gerada/lida pelo CSS** (todo th ordenado, inclusive o primário): `data-eds-sort-dir="ascending|descending"`; `data-eds-sort-order="1..n"`; e, só quando há 2 ou mais critérios, `<span class="eds-table-sort-order" aria-hidden="true">2</span>` no botão (o behavior cria). O CSS deve tratar `th:is([aria-sort=ascending],[data-eds-sort-dir=ascending])` para escolher o chevron (hoje só `aria-sort`). Prioridade = número + chevron (nunca só cor). Alvo do número: texto `small`, em `text-secondary`; sem fundo obrigatório.

**Evento** `eds:table-sort` (cancelável, já existe). Detalhe estendido, sem remover campos:

```ts
{ column: number; label: string; direction; th: HTMLTableCellElement;   // existentes (coluna acionada)
  key: string | null;            // data-eds-col
  sort: SortCriterion[];         // nova ordenação completa, se não cancelado
  multi: boolean; reason: 'replace' | 'add' | 'toggle' | 'remove' | 'clear' }
```

Com `preventDefault`, o app ordena no servidor e chama `controller.setState({ sort })`.

**Ordenação local**: `sortByCriteria(items, criteria, getValue(item, key), locale)` em `core/data.ts`: o tipo (número/data/texto) é detectado uma vez por coluna; empate no critério 1 desempata no 2; vazios por último em cada critério; estável. `sortValues` continua e passa a delegar.

**Modo remoto**: o parâmetro é `sort=cliente,-total` (`-` = descendente).

## 4. 3.3 Filtro por coluna

**Decisão**: popover no cabeçalho (botão de filtro em cada th), não linha de filtros: não aumenta a altura do `thead` (densidade, 320 px, cabeçalho fixo) e usa o `popover` nativo, que funciona até sem JS. Tipos: `text`, `select`, `number`, `date`.

```html
<th scope="col" data-eds-col="total" class="eds-table-num" aria-sort="none">
  <div class="eds-table-th">
    <button type="button" class="eds-table-sort">
      Total <svg class="eds-table-sort-icon" … />
    </button>
    <button
      type="button"
      class="eds-table-filter-btn"
      popovertarget="f-total"
      aria-label="Filtrar Total"
      aria-haspopup="dialog"
    >
      <svg aria-hidden="true" focusable="false">…</svg>
    </button>
    <div
      class="eds-popover eds-table-filter"
      id="f-total"
      popover
      role="dialog"
      aria-label="Filtrar Total"
    >
      <form method="get" action="" data-eds-column-filter="number">
        <div class="eds-field">
          <label class="eds-label" for="f-total-min">Mínimo</label>
          <input
            class="eds-input"
            id="f-total-min"
            name="filter[total][gte]"
            inputmode="decimal"
            autofocus
          />
        </div>
        <div class="eds-field">
          <label class="eds-label" for="f-total-max">Máximo</label>
          <input class="eds-input" id="f-total-max" name="filter[total][lte]" inputmode="decimal" />
        </div>
        <div class="eds-table-filter-actions">
          <button type="submit" class="eds-button eds-button-primary eds-button-sm">Aplicar</button>
          <button
            type="reset"
            class="eds-button eds-button-ghost eds-button-sm"
            data-eds-filter-clear
          >
            Limpar
          </button>
        </div>
      </form>
    </div>
  </div>
</th>
```

- **Wrapper `.eds-table-th`** (flex, `gap` por token): contém sort, filtro, alça de coluna e borda de redimensionar. É o único acréscimo estrutural ao `th`.
- **Os `name` dos campos são exatamente os parâmetros da query** (`filter[campo]`, `filter[campo][gte]`, `filter[campo][lte]`, `filter[campo]` repetido para seleção múltipla). Assim o envio GET sem JS, o modo remoto e o filtro local leem o mesmo markup.
- Tipos: `text` (`type="search"`, "contém", sem acento/caixa), `select` (`<select>` ou grupo de checkboxes em `<fieldset><legend>`; múltipla = checkboxes), `number` (mín/máx; `parseNumber`), `date` (`type="date"` nativo; de/até; `parseDate`).
- **Aplicação**: Enter ou "Aplicar" (envio do form). Não filtra a cada tecla. Em modo local o behavior intercepta o submit, aplica, **fecha o popover e devolve o foco ao botão de filtro** (nativo). Esc fecha sem aplicar e os campos voltam ao valor aplicado. "Limpar" zera e aplica.
- **Estado ativo** (não só cor): `data-active` no `.eds-table-filter-btn` (o CSS troca para ícone preenchido ou acrescenta ponto) **e** texto oculto `<span class="eds-visually-hidden">, filtro ativo</span>` (`columnFilterActive`) criado pelo behavior; o th ganha `data-eds-filtered`.
- **Chips** (opcional): `<ul class="eds-filter-chips" aria-label="Filtros ativos" data-eds-table-chips="tabela-id"></ul>`; o behavior preenche com `li > button.eds-chip[data-eds-chip-remove="chave"]` ("Total: de 100 a 500"). Remover devolve o foco ao chip seguinte ou ao botão de filtro da coluna. Em modo remoto "navigate" o servidor pode renderizar `<a class="eds-chip" href>`.
- **Integração com a busca geral** (`input[data-eds-table-filter]`): E lógico. **Mudança obrigatória no behavior**: hoje o filtro grava `row.hidden` direto; passa a haver um coordenador por tabela (`core/table-rows.ts`): cada fonte (busca, colunas) registra um predicado `(row) => boolean`; `refresh(table)` calcula `row.hidden`, trata a linha de vazio, dispara `eds:table-filtered` uma vez e faz **um** anúncio ("N resultados."). `table-filter.ts` migra para o coordenador sem mudar seus atributos/eventos.
- Valor da célula para filtro (precedência): `data-filter-value`, `data-sort-value`, texto da célula.
- **Evento** `eds:table-column-filter` (cancelável; cancelar = o app filtra no servidor): `{ key, value: FilterValue | null, filters: Record<string, FilterValue>, count?: number }`.
- CSS: o popover é filho do `th` e herda `nowrap`, peso e cor secundários do cabeçalho; `.eds-table-filter` redefine `font`, `color`, `white-space`, `text-align` (início). Larguras por token de escala; a 320 px o popover usa no máximo a largura do contêiner.

## 5. 3.4 Redimensionar, reordenar e mostrar/ocultar

Opt-in na `<table>`: `data-eds-table-resize`, `data-eds-table-reorder`; mostrar/ocultar vem do painel "Colunas". Colunas `.eds-table-check`/`.eds-table-actions` e qualquer `th[data-eds-col-locked]` não são movidas nem ocultáveis (podem ser redimensionadas só se não forem locked).

### 5.1 Larguras

- O behavior cria, se faltar, `<colgroup>` com um `<col data-eds-col>` por coluna (reordenado junto), grava a largura no `<col>` e põe `eds-table-fixed` na tabela quando houver alguma largura definida: CSS `table-layout: fixed`, `inline-size` = soma das larguras (rola dentro do wrap), células com `overflow: hidden; text-overflow: ellipsis` (opt-out `.eds-table-wrap-text`).
- Limites por coluna: `data-eds-min-width` (padrão 64) e `data-eds-max-width` (padrão 640), em px. Passo de teclado 16 px; com Ctrl 64 px.

### 5.2 Alça da coluna (teclado e arrasto)

Um único tab stop por coluna, só quando reordenar ou redimensionar está ligado: `<button type="button" class="eds-table-colhandle" aria-pressed="false" aria-label="Ajustar coluna Cliente" aria-describedby="…ajuda">` dentro do `.eds-table-th`. Segue o padrão do Sortable (pegar, mover, soltar).

| Tecla                              | Alça solta | Alça pega (`aria-pressed="true"`)                               |
| ---------------------------------- | ---------- | --------------------------------------------------------------- |
| Espaço / Enter                     | Pega       | Solta e confirma                                                |
| ← / → (inversão automática em RTL) | —          | Move a coluna uma posição (pula ocultas; não sai do grupo fixo) |
| Home / End                         | —          | Primeira / última posição permitida                             |
| Shift+← / Shift+→                  | —          | Estreita / alarga 16 px (Ctrl+Shift: 64 px)                     |
| Esc                                | —          | Cancela: ordem e largura de antes de pegar                      |
| Tab                                | Segue      | Cancela e segue (como no Sortable)                              |

Anúncios (status): `columnGrab`, `columnMoved` ("Cliente: posição 2 de 6."), `columnResized` ("Largura de Cliente: 240 pixels."), `columnDrop`, `columnCancel`. Ao mover, o foco permanece na alça (que é movida junto com o th).

**Ponteiro**: arrastar a alça reordena (motor `core/drag.ts`, indicador de destino entre colunas); arrastar a borda do th (`.eds-table-resize`, `aria-hidden`, `cursor: col-resize`, alvo ≥ 24 px de altura total e ~8 px de largura, ampliado em `pointer: coarse`) redimensiona; duplo clique na borda restaura a largura automática. Toque sem alça visível exige segurar 400 ms (como o Sortable). A alça e a borda aparecem em hover e `:focus-within` do th, e sempre em `pointer: coarse`.

### 5.3 Painel "Colunas" (alternativa a arrasto + visibilidade)

Botão e popover nativos; vêm `hidden` e o behavior revela:

```html
<button
  type="button"
  class="eds-button eds-button-secondary eds-button-sm"
  popovertarget="cols-t1"
  data-eds-columns-for="t1"
  hidden
>
  Colunas
</button>
<div
  class="eds-popover eds-table-columns"
  id="cols-t1"
  popover
  role="dialog"
  aria-labelledby="cols-t1-titulo"
>
  <p class="eds-table-columns-title" id="cols-t1-titulo">Colunas</p>
  <ul class="eds-table-columns-list" data-eds-columns-list></ul>
  <!-- o behavior preenche -->
  <button type="button" class="eds-button eds-button-ghost eds-button-sm" data-eds-columns-reset>
    Restaurar padrão
  </button>
</div>
```

Cada item gerado: `li.eds-table-columns-item` com `<label class="eds-check"><input type="checkbox" class="eds-checkbox" checked> Cliente</label>` e, quando permitido, quatro botões ghost de ícone com `aria-label` ("Mover Cliente para antes", "Mover Cliente para depois", "Estreitar Cliente", "Alargar Cliente"; passo 16 px). A **última coluna visível não pode ser ocultada** (`disabled` + `columnLastVisible` no status). Locked não aparece. Anúncios: "Coluna Cliente oculta. 5 de 7 colunas visíveis." / "…exibida…". O foco permanece no controle acionado depois de mover (o item é reordenado na lista junto).

**Evento** `eds:table-columns-change` (não cancelável, depois de aplicar): `{ order, hidden, widths, reason: 'move' | 'resize' | 'visibility' | 'reset' | 'prefs' }`.

**Interações com outros módulos**: `sortRows` usa `th.cellIndex` e continua válido porque o DOM é reordenado; seleção e filtro usam `row.cells`; **exportação ignora colunas ocultas** (muda `table-export.ts`; `data-eds-export-hidden-columns` incluir tudo) e segue a ordem visual; `.eds-table-hide-narrow` independe do `hidden` do usuário; `colspan` do estado vazio e das linhas Skeleton é recalculado ao ocultar.

## 6. 3.5 Preferências salvas

Opt-in: `<table data-eds-table-prefs="chave-do-autor">`.

- **Só `localStorage`**, chave `eds:table:<chave>`. A chave é do autor, **estática e sem dado pessoal** (nunca id de usuário, e-mail, CPF); a doc avisa (LGPD). Quem quiser por usuário guarda no servidor: ouve `eds:table-columns-change` e restaura com `controller.setState({ columns })`.
- Valor: `{ "v": 1, "order": [...], "hidden": [...], "widths": {...}, "sort": [...] }`. Padrão salva `order`, `hidden`, `widths`. `sort` só com `data-eds-table-prefs-save="order hidden widths sort"` e nunca em tabela remota (a URL manda). Filtros, página, seleção e fixação **não** são salvos.
- Leitura: ids desconhecidos são ignorados; colunas novas entram no fim; `v` diferente descarta; JSON inválido ou `localStorage` indisponível (try/catch) = padrões, sem erro. Escrita com debounce de 300 ms.
- "Restaurar padrão" (`data-eds-columns-reset`) apaga a chave e volta ao markup original; anuncia `columnsRestored`. Se a tabela tiver prefs mas nenhum painel, o autor pode pôr `button[data-eds-columns-reset]` onde quiser.
- Estado de preferências é lido **antes** da primeira pintura quando o script é síncrono; senão há uma única reordenação ao ligar (aceito; sem animação).

## 7. 3.6 Barra de ações em lote

```html
<div class="eds-table-bulk" role="group" aria-label="Ações em lote" data-eds-table-bulk="t1" hidden>
  <p class="eds-table-bulk-count"><span data-eds-bulk-count></span></p>
  <button
    type="button"
    class="eds-button eds-button-ghost eds-button-sm"
    data-eds-bulk-all-results
    hidden
  >
    Selecionar todos os <span data-eds-bulk-total></span>
  </button>
  <div class="eds-table-bulk-actions">
    <button
      type="button"
      class="eds-button eds-button-secondary eds-button-sm"
      data-eds-bulk-action="arquivar"
    >
      Arquivar
    </button>
    <button
      type="button"
      class="eds-button eds-button-danger eds-button-sm"
      data-eds-bulk-action="excluir"
      data-eds-confirm="Excluir os itens selecionados?"
    >
      Excluir
    </button>
  </div>
  <button type="button" class="eds-button eds-button-ghost eds-button-sm" data-eds-bulk-clear>
    Limpar seleção
  </button>
</div>
```

- Fica **depois do `.eds-table-wrap`** e antes do rodapé, com `position: sticky; inset-block-end: <espaço por token>` (fixa na base da área visível enquanto a tabela estiver na tela). Aparece com `count > 0` (o behavior tira `hidden`). Sem animação sob `prefers-reduced-motion`; com movimento, no máximo fade/translate curto por token de duração.
- **Contagem**: `[data-eds-bulk-count]` recebe `bulkCount`/`bulkCountOne`. Texto comum, **sem `aria-live`**: o anúncio é o da região de status da tabela ("3 selecionados."), para não duplicar.
- **Foco**: a barra aparecer não move o foco. Se o foco estiver dentro dela quando ela se esconder (limpar seleção, ação concluída), vai para `[data-eds-select-all]` (ou o wrap).
- **Não encobre o foco (2.4.11)**: `:root:has(.eds-table-bulk:not([hidden])) { scroll-padding-block-end: calc(var(--eds-target-min) + var(--eds-space-6)) }` (CSS; acumula com a regra dos toasts: usar o maior). Verificar a sobreposição com o Toast (canto inferior-final): a barra ocupa a largura do contêiner da tabela; o Toast tem `z-index` maior e a região do Toast deve ter folga.
- **Evento** `eds:table-bulk-action` (cancelável): `{ action, ids: string[], rows: HTMLTableRowElement[], count, scope: 'page' | 'all' }`. `ids` vêm de `tr[data-eds-row-id]` (obrigatório em tabelas com ações em lote).
- **"Selecionar todos os N resultados"** (só tabela remota; `data-eds-total` na `<table>`): aparece quando o cabeçalho marca todas as linhas da página e `total > linhas da página`. Ao acionar: `scope = 'all'`, texto vira "Todos os N selecionados." e emite `eds:table-select-all-results` `{ total }`. Qualquer mudança de linha volta a `'page'`. A seleção entre páginas é do app (o behavior não a guarda); quem recarrega marca de novo as linhas conhecidas.
- `eds:table-select-change` ganha `ids`, `scope`.
- Quando o app executa e termina, chama `controller.clearSelection()`.

## 8. 3.7 Paginação, ordenação e filtro remotos

Atributos na `<table>`:

| Atributo                | Valor                                   | Efeito                                                                                     |
| ----------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------ |
| `data-eds-table-remote` | `navigate` (padrão) \| `event`          | Nada é ordenado/filtrado/paginado localmente                                               |
| `data-eds-total`        | inteiro                                 | Total de resultados (rodapé, "selecionar todos", anúncio)                                  |
| `data-eds-table-params` | JSON, ex. `{"page":"p","size":"limit"}` | Renomeia os parâmetros (padrões abaixo)                                                    |
| `data-eds-table-anchor` | id                                      | `#id` acrescentado à URL em `navigate` (foco no título da tabela depois do recarregamento) |

**Query (GET)**: `?page=2&size=25&sort=cliente,-total&q=ana&filter[situacao]=pago&filter[situacao]=pendente&filter[total][gte]=100&filter[total][lte]=500&filter[data][gte]=2026-01-01`. `page` base 1; `-` = descendente; seleção múltipla repete a chave (autores PHP configuram `filter[x][]` no servidor); datas ISO; números com ponto decimal na URL (o formato pt-BR é só de exibição).

**Sem JS** (`navigate` por links/GET): cabeçalho ordenável usa **`<a class="eds-table-sort" href="?sort=-total&…">`** (mesmo estilo do botão; o servidor devolve `aria-sort` e o href da próxima ordenação); filtros por coluna são `<form method="get">` nos popovers (o servidor repete os parâmetros fora do formulário em `<input type="hidden">`); paginação por `nav.eds-pagination` com links; tamanho da página por `<form method="get"><select name="size">…`. Funciona inteira sem JS.

**Com JS**:

- `navigate`: o behavior compõe a URL a partir do estado atual + mudança (inclui ordenação múltipla e remoção de chip), zera `page` quando sort/filtro/size mudam, e navega (`location.assign`). O PageLoader automático cobre a espera. Antes disso emite `eds:table-query` (cancelável).
- `event`: não navega. Emite `eds:table-query`; o app busca e renderiza.

**`eds:table-query`** (cancelável): `{ query: TableQuery, params: URLSearchParams, reason: 'sort' | 'filter' | 'q' | 'page' | 'size' | 'chip' | 'clear', respondWith(promise: Promise<{ total?: number; page?: number } | void>) }`.

- Em `event`, o app chama `detail.respondWith(fetchPromise)`. Enquanto pendente: `aria-busy="true"` na tabela, `inert` e sobreposição `.eds-table-overlay` (criada pelo behavior se faltar, com Spinner e `tableLoading`, reaproveitando o CSS existente; linhas Skeleton continuam opcionais do autor). Resolvida: remove o estado, atualiza `data-eds-total` com o valor devolvido, anuncia `tableResults` ("248 resultados. Página 2 de 10.") e emite `eds:table-load`. Rejeitada: remove o carregamento, **mantém os dados antigos**, anuncia `tableLoadError`, `data-eds-error` na tabela e emite `eds:table-error` `{ error }`; o app exibe `ErrorState` com "Tentar de novo" (que refaz a consulta).
- Respostas fora de ordem: só a última consulta vale (o behavior ignora promessas obsoletas).
- Paginação: `nav.eds-pagination[data-eds-table-pagination="t1"]`; clique em `a[href]` (lê `page` do href ou `data-eds-page`) é interceptado em `event`; o foco permanece no link clicado (ou no item atual recém-renderizado, via `data-eds-focus-current`); `size`: `select[data-eds-table-size="t1"]`.
- Debounce de 300 ms só para a busca geral (`q`); filtros de coluna só no "Aplicar".
- `controller.setState()` reflete o estado devolvido pelo servidor (sort, filtros, chips, `aria-sort`).

**React**: `useTableQuery({ initial?, syncUrl?: false | 'search' })` devolve `{ query, setSort, setPage, setSize, setFilter, setQ, clearFilters, reset, searchParams }`. Com `syncUrl: 'search'` usa `history.replaceState` (pushState em mudança de página) e lê a URL inicial. Todos os resultados passam por `parseTableQuery`/`toTableSearchParams` (mesmo formato do HTML). O React não faz `fetch`: o app usa `query` (ex.: no seu hook de dados) e passa `loading`/`loadingOverlay`, que já existem. `status` (string) anuncia os resultados.

## 9. 3.8 Edição na célula

**Decisão: a tabela continua `<table>` (sem `role="grid"`).** Justificativa: o modelo de grid exige um único tab stop, setas entre células, modo de navegação × edição em leitores de tela e reescrita de todo foco; conflita com botões de ordenação, links, checkboxes e menus por linha, e leitores de tela perdem a navegação de tabela. A edição por **botão na célula** dá o mesmo resultado com nome, papel e estado nativos, funciona em toque e não muda a ordem de Tab.

```html
<th scope="col" data-eds-col="total" data-eds-editor="ed-total">…</th>

<template id="ed-total">
  <input
    class="eds-input eds-input-sm"
    type="text"
    inputmode="decimal"
    data-eds-mask="moeda"
    required
  />
</template>

<tr data-eds-row-id="PED-0001" data-eds-row-label="PED-0001">
  <td
    class="eds-table-num"
    data-eds-editable
    data-eds-edit-field="total"
    data-eds-edit-format="moeda"
    data-sort-value="1280.5"
  >
    R$ 1.280,50
  </td>
</tr>
```

- O editor da coluna é um `<template>` (referenciado por `th[data-eds-editor]`): markup-first, sem mini-linguagem; serve `input` (texto/número/data), `select`, `textarea`. Validação nativa (`required`, `min`, `max`, `pattern`, `maxlength`) e `data-eds-validate`. Célula individual: `data-eds-editable="false"` desabilita.
- **Modo exibição**: o behavior envolve o conteúdo em `<button type="button" class="eds-table-cell-edit">R$ 1.280,50<span class="eds-visually-hidden">, editar Total de PED-0001</span></button>` (nome contém o texto visível: 2.5.3). Aparência: texto normal com ícone de lápis em hover e `:focus-visible`; alvo ≥ 24 px; o botão ocupa a célula. Sem JS a célula é só texto.
- **Modo edição** (`td[data-editing]`): o botão é substituído pelo editor com `aria-label` "Total de PED-0001", `aria-describedby` apontando para `p.eds-error` (quando há erro) e para a dica `editHint` ("Enter confirma, Esc cancela."), `aria-invalid` quando há erro. A célula pode crescer (alinhar ao início; `white-space: normal` no erro).

| Tecla / ação                                            | Efeito                                                                                                                                                                                |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Enter, Espaço ou F2 no botão; clique                    | Entra em edição (`eds:table-edit-start`, cancelável); foco no editor, texto selecionado                                                                                               |
| Enter no editor (input/select; em textarea, Ctrl+Enter) | Confirma                                                                                                                                                                              |
| Esc                                                     | Cancela, restaura o valor, foco volta ao botão da célula                                                                                                                              |
| Tab / Shift+Tab, ou sair com o ponteiro                 | Válido e mudado: confirma e o foco segue naturalmente (próximo controle). Inválido: permanece em edição com o erro visível; Esc cancela (a dica diz isso). Não mudado: sai sem evento |
| Setas                                                   | Nativas do campo; **não** navegam entre células                                                                                                                                       |

- **Validação**: bloqueia a confirmação, mostra o texto nativo (`validationMessage`) ou o do `data-eds-validate` em `p.eds-error` dentro da célula, `aria-invalid="true"`, e anuncia `Erro: …` na região de status. Foco permanece no editor.
- **Salvar**: `eds:table-edit-commit` (cancelável) `{ cell, row, rowId, field, value, previous, setError(message), respondWith(promise) }`.
  - Sem `respondWith`: otimista; aplica na hora.
  - `respondWith(promise)`: célula `aria-busy="true"`, editor `readonly` (não `disabled`, para manter o foco). Resolve (opcional `{ value?, text? }` do servidor): aplica. Rejeita (mensagem do erro): volta a edição com o erro (`aria-invalid`, `p.eds-error`, foco no editor) e emite `eds:table-edit-error`.
  - `preventDefault`: segue em edição; o app mostra o erro por `setError`.
- **Aplicar**: texto exibido = `detail.text` ou valor formatado por `data-eds-edit-format` (nomes de `FORMAT_NAMES`) ou o valor cru; atualiza `data-sort-value` e `data-value` (ordenação e exportação). Anúncio: "Total de PED-0001 atualizado para R$ 1.300,00." Não reordena a tabela sozinha (evita a linha fugir de baixo do usuário); `controller.resort()` fica para o app.
- Edição bloqueada com `aria-busy`/`inert` da tabela. Só uma célula em edição por vez (abrir outra confirma a atual se válida, senão a mantém e não abre).
- **Eventos**: `eds:table-edit-start` (cancelável), `eds:table-edit-commit` (cancelável), `eds:table-edit-cancel`, `eds:table-edit-error`.
- Edição de **linha inteira** (Salvar/Cancelar) fica fora: compõe-se com campos nativos permanentes nas células (core já suporta) e `form`.

## 10. React

Convenções do `docs/architecture/react.md` (forwardRef, `texts`, exigências no tipo). O React **não manipula DOM de ordem**: reordenar/ocultar é re-renderização.

```ts
// colunas
interface TableColumnDef {
  id: string;
  label: string;
  pin?: 'start' | 'end';
  locked?: boolean;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  defaultHidden?: boolean;
}
interface TableColumnState {
  order: string[];
  hidden: string[];
  widths: Record<string, number>;
}
function useTableColumns(
  columns: readonly TableColumnDef[],
  options?: {
    prefsKey?: string;
    state?: TableColumnState;
    onStateChange?: (s: TableColumnState, reason: string) => void;
  },
): TableColumnsController;
interface TableColumnsController {
  columns: TableColumnDef[] /* visíveis, na ordem */;
  all: TableColumnDef[];
  state: TableColumnState;
  move(id: string, toIndex: number): void;
  resize(id: string, px: number): void;
  toggle(id: string, visible?: boolean): void;
  reset(): void;
}
```

| Componente / prop                                                                                 | Contrato                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `<Table columnsController resizable reorderable multiSort sortMax>`                               | Renderiza `<colgroup>`, `eds-table-fixed`, `.eds-table-pin-*` e `scroll-padding` por CSS vars; anuncia pelo mesmo status                                                                              |
| `<TableHeaderCell columnId sortKey filter={<TableColumnFilter/>}>`                                | Ganha `.eds-table-th`, alça, borda de redimensionar, `data-eds-col`, fixação; `<TableCell columnId>` aplica fixação/oculta                                                                            |
| `<TableColumnsMenu controller texts />`                                                           | Painel "Colunas" (Popover + checkboxes + mover/estreitar/alargar + restaurar)                                                                                                                         |
| `<TableColumnFilter type value onChange options? multiple? label? />`                             | `type: 'text' \| 'select' \| 'number' \| 'date'`; `value`/`onChange` com `FilterValue`; Aplicar/Limpar internos; devolve o foco ao botão                                                              |
| `<TableBulkBar count total? scope? onClear onSelectAllResults? texts>`                            | `children` = ações; renderiza sempre montada (`hidden` com `count === 0`); anuncia pelo anunciador interno; devolve foco ao "selecionar todos" ao esconder                                            |
| `<TableEditableCell field value display? type editor onCommit validate? required? format? texts>` | `onCommit(value) => void \| Promise<void \| { value?: string; text?: string }>`; rejeição com `Error(message)` vira erro na célula; `editor` é o nó do campo (Input/Select) ou `type` para os padrões |

Ordenação múltipla sem quebra: `multiSort` (booleano ou `'add'`) muda os tipos para `sort: TableSortState[]` e `onSortChange(sort: TableSortState[])`; sem `multiSort`, tudo igual a hoje (união discriminada no tipo). `aria-sort` só no primário (derivado do contexto, como hoje). `sortTableData(rows, sort | sort[], options)` aceita lista (usa `sortByCriteria`). `filterTableData` ganha `filters?: Record<string, FilterValue>` e `getValue?` (E com a busca). `useTableFilter` inalterado. `TableTexts` ganha as funções/strings da seção 11 com padrões pt-BR vindos de `getMessages()`.

## 11. Mensagens (`configure({ messages })`, `Messages`; `{x}` = placeholder)

| Chave                                                                          | Padrão pt-BR                                                                                                                                                            |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sortedByMany`                                                                 | `Ordenado por {criteria}.` (cada critério: `{column}, {direction}`; separador `sortThen` = "depois")                                                                    |
| `sortRemoved` / `sortCleared`                                                  | `Ordenação por {column} removida.` / `Ordenação removida.`                                                                                                              |
| `sortHint` / `sortMaxReached`                                                  | `Shift mais Enter acrescenta a coluna à ordenação.` / `Máximo de {max} colunas na ordenação.`                                                                           |
| `sortOrderLabel`                                                               | `, critério {order}, {direction}`                                                                                                                                       |
| `columnFilterLabel` / `columnFilterActive`                                     | `Filtrar {column}` / `, filtro ativo`                                                                                                                                   |
| `columnFilterApply` / `columnFilterClear`                                      | `Aplicar` / `Limpar`                                                                                                                                                    |
| `columnFilterApplied` / `columnFilterCleared`                                  | `{column} filtrada. {count} resultados.` / `Filtro de {column} removido. {count} resultados.`                                                                           |
| `columnsButton` / `columnsTitle` / `columnsRestore` / `columnsRestored`        | `Colunas` / `Colunas visíveis` / `Restaurar padrão` / `Colunas restauradas.`                                                                                            |
| `columnHidden` / `columnShown` / `columnLastVisible`                           | `Coluna {column} oculta. {visible} de {total} colunas visíveis.` / `Coluna {column} exibida. …` / `Pelo menos uma coluna deve ficar visível.`                           |
| `columnHandleLabel` / `columnHandleHelp`                                       | `Ajustar coluna {column}` / `Espaço pega a coluna; setas movem; Shift e setas redimensionam; Espaço solta; Esc cancela.`                                                |
| `columnGrab` / `columnMoved` / `columnResized` / `columnDrop` / `columnCancel` | `{column} pega.` / `{column}: posição {pos} de {total}.` / `Largura de {column}: {width} pixels.` / `{column} solta na posição {pos} de {total}.` / `Ajuste cancelado.` |
| `columnMoveBefore` / `columnMoveAfter` / `columnNarrow` / `columnWiden`        | `Mover {column} para antes` / `…para depois` / `Estreitar {column}` / `Alargar {column}`                                                                                |
| `bulkCount` / `bulkCountOne`                                                   | `{count} selecionados` / `1 selecionado`                                                                                                                                |
| `bulkAllResults` / `bulkAllSelected` / `bulkClear`                             | `Selecionar todos os {total}` / `Todos os {total} selecionados.` / `Limpar seleção`                                                                                     |
| `tableLoading` / `tableResults` / `tableLoadError`                             | `Carregando` / `{count} resultados. Página {page} de {pages}.` / `Não foi possível carregar os dados. Os dados anteriores foram mantidos.`                              |
| `editLabel` / `editHint`                                                       | `, editar {column} de {row}` / `Enter confirma, Esc cancela.`                                                                                                           |
| `editSaved` / `editSaving` / `editError`                                       | `{column} de {row} atualizado para {value}.` / `Salvando.` / `Erro: {message}`                                                                                          |

## 12. Acessibilidade: resumo por item (pronto para teste)

| Item               | Semântica / ARIA                                                                                       | Teclado                                                  | Anúncio                  | Casos-limite                                                                                                               |
| ------------------ | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| Ordenação múltipla | `aria-sort` só no primário; texto oculto nos secundários; `aria-describedby` com a dica                | Shift+Enter/Espaço; Enter simples substitui              | Ordem completa em status | Máximo atingido; tabela remota; coluna oculta que estava ordenada (sai da ordenação e anuncia)                             |
| Filtro por coluna  | `popover` + `role="dialog"` `aria-label`; botão `aria-haspopup="dialog"`; ativo = ícone e texto oculto | Enter aplica, Esc fecha sem aplicar, foco volta ao botão | N resultados (uma vez)   | Zero resultados = linha de vazio existente; faixa invertida (mín > máx): erro em `p.eds-error`; popover a 320 px/zoom 400% |
| Colunas            | Alça `button aria-pressed`; painel `role="dialog"` com checkboxes nativos                              | Tabela 5.2; painel por Tab/Espaço                        | Posição e largura        | Última coluna visível; locked; RTL; fixas                                                                                  |
| Preferências       | —                                                                                                      | —                                                        | `columnsRestored`        | `localStorage` bloqueado; ids removidos                                                                                    |
| Lote               | `role="group"` + rótulo; contagem em texto comum                                                       | Tab; foco devolvido ao esconder                          | Status da tabela         | Zero seleção; seleção em todas as páginas; barra sobre o foco (2.4.11)                                                     |
| Remoto             | `aria-busy`, `inert`, overlay `role="status"`                                                          | foco permanece no controle acionado                      | Resultados ou erro       | Corrida de respostas; erro; vazio; 0 páginas                                                                               |
| Edição             | Botão com nome contendo o texto; editor rotulado; `aria-invalid`+`p.eds-error`                         | Tabela 9                                                 | Salvo/erro               | Valor inalterado; erro do servidor; texto longo; zoom; cancelar durante `aria-busy` (ignorado)                             |

Todos: foco visível ≥ 3:1 (`outline` inset onde o overflow cortaria, como o wrap); alvos ≥ 24 px (densidade compact incluída; `--eds-target-min` em toque); `prefers-reduced-motion` sem movimento; `forced-colors`: estados de ativo/pego/ordenado não dependem de cor ou fundo (usar `outline`/forma/texto, como a seleção da Table hoje).

## 13. Divisão do trabalho

**especialista-css** (dono; sem JS):

| Arquivo                                                                  | Conteúdo                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/core/src/components/table.css`                                 | `.eds-table-th`; `pin-start/end/edge` + `--_pin-inset`/`scroll-padding`/`data-pin-disabled`; `th[data-eds-sort-dir]` e `.eds-table-sort-order`; `.eds-table-filter-btn` (estados `data-active`), `.eds-table-filter`; `.eds-table-colhandle`, `.eds-table-resize`, `.eds-table-fixed` e `<col>`; `.eds-table-columns*`; `.eds-table-bulk*` (sticky, `scroll-padding`); `.eds-table-cell-edit`, `td[data-editing]`; `forced-colors`, `pointer: coarse`, reduced-motion. Se passar de ~900 linhas, dividir em `table-columns.css` e `table-edit.css` (registrar em `index.css`) |
| `packages/core/src/components/filter-bar.css`, `chip.css`, `popover.css` | Só reutilizar; ajustar se o chip/popover precisar de variante dentro do `th`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `apps/docs/src/examples/table/*.html`                                    | Um exemplo HTML por item: `multi-ordenacao`, `filtro-coluna`, `colunas` (fixas início/fim, redimensionar, reordenar, painel), `lote`, `remota-navigate` (sem JS), `edicao`; sem `style=` nem cor literal (`pnpm docs:check`)                                                                                                                                                                                                                                                                                                                                                  |
| `apps/playground/src/demos/`                                             | Contrato de markup dessas demos (carregam o behavior só em `[data-eds-live]`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |

**especialista-js** (dono; behavior, React, docs, testes):

| Arquivo                                                                                                                                                          | Conteúdo                                                                                                                                                                                                                        |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/behavior/src/core/data.ts`                                                                                                                             | `sortByCriteria`, `matchColumnFilter`, tipos `SortCriterion`/`FilterValue`                                                                                                                                                      |
| `packages/behavior/src/core/table-query.ts` (novo) + `export-entry.ts`                                                                                           | `parseTableQuery`, `toTableSearchParams`; reexportar                                                                                                                                                                            |
| `packages/behavior/src/core/table-rows.ts` (novo)                                                                                                                | Coordenador de visibilidade das linhas (3.3)                                                                                                                                                                                    |
| `packages/behavior/src/components/table.ts` (**compartilhado com a ordenação**, dono JS)                                                                         | Ordenação múltipla, `aria-sort`, controlador `tableController`, seleção com `ids`/`scope`, integração com `colunas`/`remoto`                                                                                                    |
| `table-filter.ts` (migrar ao coordenador), `table-export.ts` (colunas ocultas, ordem visual)                                                                     | Alterados                                                                                                                                                                                                                       |
| `table-column-filter.ts`, `table-columns.ts` (largura, ordem, visibilidade, fixação, prefs, painel), `table-bulk.ts`, `table-remote.ts`, `table-edit.ts` (novos) | Registrar em `setup.ts`/`init-with.ts`; **IIFE completo** (e `eds-behavior-core` só com ordenação múltipla, filtro por coluna, lote e remoto; colunas/prefs/edição ficam no completo, a decidir pelo orçamento do `size:check`) |
| `packages/behavior/src/core/config.ts`                                                                                                                           | Chaves da seção 11                                                                                                                                                                                                              |
| `packages/react/src/components/Table/`                                                                                                                           | Tipos e componentes da seção 10; `data.ts` estendido; testes `.test.tsx` por módulo; `index.ts`                                                                                                                                 |
| `apps/docs/src/pages/componentes/Table*.tsx`, `routes.tsx`, `examples/table/*.tsx`                                                                               | Páginas e exemplos React; selo experimental (`experimentalComponents`) enquanto não validado                                                                                                                                    |
| `packages/behavior/src/**/*.test.ts`                                                                                                                             | jsdom; e2e (Playwright) para arrasto, popover e foco; axe nas novas demos                                                                                                                                                       |
| `docs/architecture/behavior.md`, `react.md`, `CHANGELOG`                                                                                                         | Atualizar atributos, eventos, guia de migração                                                                                                                                                                                  |

**Arquivos compartilhados**: `table.css` (CSS dono; JS só lê seletores listados aqui); `table.ts` (JS dono; CSS só depende de `aria-sort`/`data-eds-sort-*`, `data-eds-*`/`data-*` listados); exemplos `examples/table/*.html` (CSS escreve, JS apenas ajusta atributos que mudarem o contrato, avisando o gerente). Qualquer mudança neste contrato passa pelo gerente.

**Guia de migração (1.0.0)**: nenhuma quebra obrigatória. Mudanças observáveis: (a) o detalhe de `eds:table-sort` ganha campos; (b) o filtro local passa pelo coordenador (mesmos atributos e eventos); (c) a exportação omite colunas ocultas pelo usuário (antes não existiam); (d) `data-eds-filter-columns` aceita ids; (e) `sortTableData` aceita lista.

## 14. Decisões que dependem do usuário

1. **Onde fica o que** (orçamento): colunas redimensionáveis/reordenáveis, preferências e edição na célula entram no `eds-behavior-core.js` ou só no completo? Sugestão técnica: só no completo.
2. **Selo experimental** na 1.0 para colunas (arrasto) e edição na célula, por terem a superfície de teclado mais nova (leitor de tela real ainda não testado)? Sugestão: sim.
3. **Seleção entre páginas** ("Selecionar todos os N") fica como evento do app, sem persistência no behavior. Confirmar o escopo.
