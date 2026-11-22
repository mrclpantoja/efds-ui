# @efds-ui/behavior

Comportamento interativo do efDS.ui em JavaScript puro (zero dependências), para quem usa só HTML: PHP, Java, .NET, Vue, Angular. O visual vem do `@efds-ui/core` (CSS); este pacote liga o que o CSS e a plataforma não entregam: Tabs, Modal/Drawer, Dropdown, Toast, Alert fechável, Button em carregamento (`aria-busy` não ativa por Enter/Espaço), Table (ordenação, seleção e filtro local), Sidebar, Combobox (simples e múltiplo), DatePicker e DateRangePicker (calendário próprio, máscara dd/mm/aaaa), FileUpload (arrastar e soltar, modo formulário e imediato), diálogos rápidos (`alert`, `confirm`, `prompt`) e o PageLoader automático.

> **Versão 0.1.0 (primeira publicação).** Licença MIT. A API pode mudar até a 1.0. Documentação: https://efds-ui.com.br

## Uso por `<script>` (CDN, PHP, Java, .NET)

```html
<link rel="stylesheet" href=".../@efds-ui/core/dist/index.css" />
<script src=".../@efds-ui/behavior/dist/eds-behavior.js" defer></script>
```

Liga tudo sozinho quando o DOM está pronto e expõe `window.EDS`. Opções na própria tag:

| Atributo                              | Efeito                                                                |
| ------------------------------------- | --------------------------------------------------------------------- |
| `data-eds-manual`                     | Não liga sozinho: chame `EDS.init()`.                                 |
| `data-eds-loader="auto\|manual\|off"` | PageLoader. `auto` (padrão), `manual` (só `start`/`track`), `off`.    |
| `data-eds-loader-title`, `-text`      | Textos padrão do loader.                                              |
| `data-eds-loader-slow-after`          | Ms até oferecer "Fechar" / "Continuar aguardando" (padrão 20000).     |
| `data-eds-loader-trigger="all\|user"` | `all` (padrão): todo fetch/XHR; `user`: só os iniciados pelo usuário. |
| `data-eds-native-alert`               | `window.alert` passa a abrir o `EDS.alert` (não bloqueia).            |

```js
EDS.toast({ variant: 'success', message: 'Pedido salvo.' });
const done = EDS.loader.start({ title: 'Gerando relatório…' });
fetch('/relatorio').finally(done);
```

## Diálogos rápidos (alert, confirm, prompt)

```js
await EDS.alert('Pedido salvo com sucesso.', 'Pedido', 'success'); // undefined
if (await EDS.confirm('Excluir o pedido PED-0001?', 'Excluir', 'danger')) {
  /* ... */
} // boolean
const nome = await EDS.prompt('Nome do arquivo', 'relatorio', 'Salvar como'); // string | null
```

Assinaturas: `alert(texto, título?, tipo?, opções?)`, `confirm(texto, título?, tipo?, opções?)`, `prompt(texto, valorPadrão?, título?, opções?)`. `tipo`: `info` (padrão do alert), `success`, `warning`, `danger`, `question` (padrão do confirm e do prompt). `opções`: `okText`, `cancelText`, `placeholder`, `required`, `inputType` (`text`, `email`, `number`, `password`, `textarea`), `validate(valor)` (devolve a mensagem de erro ou `''`) e `variant` (tipo do prompt). Chamadas simultâneas entram numa fila: um diálogo por vez. Enter confirma, Esc e o clique no fundo cancelam (`danger` não fecha no fundo). O texto vai como texto, nunca como HTML. Textos dos botões em `configure({ messages })`: `dialogOk`, `dialogCancel`, `dialogConfirm`, `dialogRequired`.

`window.alert` só é trocado se você pedir (`data-eds-native-alert` na tag ou `init(document, { nativeAlert: true })`; com `data-eds-manual`, use a opção do `init`). Atenção: o `alert` do navegador **bloqueia** e o do efDS.ui não: o código depois do `alert(...)` roda sem esperar o usuário fechar. `confirm` e `prompt` nativos nunca são trocados (são síncronos): use `await EDS.confirm(...)`.

### Confirmação declarativa

Sem JavaScript seu: `data-eds-confirm` em `button`, `a` ou `form` pergunta antes de agir e só prossegue se o usuário confirmar (o link navega, o botão de envio envia o form com ele como `submitter`, o form é enviado).

```html
<form
  method="post"
  action="/pedidos/1/excluir"
  data-eds-confirm="Excluir o pedido PED-0001?"
  data-eds-confirm-title="Excluir pedido"
  data-eds-confirm-variant="danger"
  data-eds-confirm-ok="Excluir"
>
  <button type="submit" class="eds-button eds-button-danger">Excluir</button>
</form>
```

Opcionais: `data-eds-confirm-title`, `data-eds-confirm-variant` (`info | success | warning | danger | question`) e `data-eds-confirm-ok`.

## Arrastar e soltar (Sortable)

```html
<div
  class="eds-sortable"
  data-eds-sortable
  data-eds-group="quadro"
  data-eds-name="afazer[]"
  aria-label="A fazer"
>
  <div class="eds-sortable-item" data-id="t1">
    <button type="button" class="eds-sortable-handle" aria-label="Mover Revisar contrato">…</button>
    <span>Revisar contrato</span>
  </div>
</div>
<script>
  // Evento no contêiner de destino. detail: { id, from, to, fromIndex, toIndex, order }
  document.addEventListener('eds:sortable-change', (e) => e.detail.order && salvar(e.detail.order));
</script>
```

Contêineres com o mesmo `data-eds-group` trocam itens; `data-eds-orientation="horizontal | grid"` muda as setas; `data-eds-name` gera um `hidden` por item, na ordem. Teclado: Espaço pega e solta, setas movem, Esc cancela. No toque, sem pegador, segure o item 400 ms para arrastar. O resultado sai no evento `eds:sortable-change`.

## Árvore (Tree)

```html
<div
  class="eds-tree"
  data-eds-tree
  data-eds-editable
  data-eds-name="estrutura"
  aria-label="Estrutura"
>
  <ul role="tree">
    <li role="treeitem" aria-expanded="true" data-id="n1">
      <div class="eds-tree-row">
        <span class="eds-tree-toggle" aria-hidden="true"></span
        ><span class="eds-tree-label">Diretoria Fictícia</span>
      </div>
      <ul role="group">
        <li role="treeitem" data-id="n2">
          <div class="eds-tree-row">
            <span class="eds-tree-toggle" aria-hidden="true"></span
            ><span class="eds-tree-label">Sede Modelo</span>
          </div>
        </li>
      </ul>
    </li>
  </ul>
</div>
```

Navegação pelo padrão APG (setas, Home/End, `*`, digitar a letra). Com `data-eds-editable`: F2 renomeia, Insert/Ctrl+Enter adiciona filho, Shift+Enter irmão, Delete exclui (com "Desfazer" por 8 s), Alt+setas movem, Shift+F10 abre o menu "⋯"; arrastar solta antes, dentro ou depois. `data-eds-source` monta a árvore de um JSON e `data-eds-children-url` carrega filhos sob demanda. Eventos: `eds:tree-change` (traz a estrutura em JSON), `eds:tree-beforechange` (cancelável), `eds:tree-select`, `eds:tree-activate`, `eds:tree-toggle`.

## Exportar tabelas (CSV, Excel, JSON, PDF)

Gerados no navegador, sem dependência. Botões ou itens de menu apontam para a tabela:

```html
<button
  type="button"
  class="eds-dropdown-item"
  data-eds-export="xlsx"
  data-eds-export-target="pedidos"
  data-eds-export-filename="pedidos"
>
  Excel (.xlsx)
</button>
```

`data-eds-export="csv|xlsx|json|pdf"`, `-target` (id da tabela), `-filename`, `-title`, `-subtitle` e `-scope="auto|visible|selected|all"`. `th[data-type="text|number|currency|date|percent"]`, `td[data-value]` e `data-eds-export-ignore` descrevem colunas e células. O evento `eds:table-beforeexport` (cancelável) deixa mascarar `detail.data` (CPF, colunas sensíveis) antes de gerar; `eds:table-export` sai depois. Só o que está no DOM é exportado.

Sem HTML, os geradores servem a qualquer código: `exportData(data, 'xlsx', { filename })`, `toCsv`, `toJson`, `toXlsx` e `toPdf`. Para importar só eles, sem o `init` nem os demais módulos, use o subcaminho `@efds-ui/behavior/export` (é o que o `@efds-ui/react` faz).

## Máscara de entrada

`data-eds-mask` num `<input>` formata o valor enquanto se digita. Valor enviado: o que aparece, com a máscara; com `data-eds-mask-unmask`, o campo visível perde o `name` e um hidden com o mesmo `name` leva só os caracteres significativos.

```html
<label class="eds-label" for="cpf">CPF</label>
<input
  id="cpf"
  class="eds-input"
  name="cpf"
  data-eds-mask="cpf"
  data-eds-mask-unmask
  aria-describedby="cpf-ajuda"
/>
<p class="eds-helper" id="cpf-ajuda">Só números. Ex.: 123.456.789-00</p>
```

| Atributo                 | Efeito                                                                                                                                                                                                                |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data-eds-mask`          | `telefone`, `cpf`, `cnpj` (aceita letras A-Z nas 12 primeiras posições), `cpf-cnpj`, `cep`, `moeda`, `numero` ou um padrão: `0` dígito, `A` letra, `*` letra ou dígito, `\` escapa, o resto é literal (`00.000-AAA`). |
| `data-eds-mask-unmask`   | Hidden com o valor limpo (moeda: `1234.56`). Exige `name`.                                                                                                                                                            |
| `data-eds-mask-decimals` | Moeda e número: casas decimais (0 a 8, padrão 2).                                                                                                                                                                     |
| `data-eds-mask-prefix`   | Moeda e número: símbolo (padrão `"R$ "` na moeda; vazio é permitido).                                                                                                                                                 |
| `data-eds-mask-negative` | Moeda e número: aceita negativo (a tecla `-` alterna o sinal).                                                                                                                                                        |

O pacote define `inputmode`, `autocomplete` (telefone: `tel`, CEP: `postal-code`) e `maxlength` (menos na moeda e no número) só quando o autor não os pôs. Evento `eds:mask-change` (`{ value, raw }`). A máscara não valida (dígito verificador, faixa): continue com `required`, `pattern` e o servidor. Dados de exemplo, sempre fictícios (LGPD). Para importar só o núcleo, sem DOM: `import { createMask } from '@efds-ui/behavior/mask'`.

## Uso por módulo (Vue, Angular, bundlers)

```ts
import { init, toast, loader } from '@efds-ui/behavior';

const destroy = init(document.querySelector('#app')!, {
  loader: {
    auto: true,
    delay: 300,
    minVisible: 400,
    slowAfter: 20000,
    trigger: 'all',
    exclude: [/\/api\/poll/],
  },
});
// ao desmontar: destroy();
```

`init(root, options)` liga o que existe em `root`, observa o que entra e sai depois (htmx, Turbo, Livewire, parciais do servidor) e **não toca em nada fora do `root`**. Também há `initTabs`, `initModal`, `initDropdown`, `initAlert`, `initTable`, `initTableFilter`, `initSidebar`, `initCombobox`, `initDatepicker`, `initUpload`, `initButtonBusy`, `initConfirm`, `initSortable`, `initTree`, `initNativeAlert`, `initToast` e `initLoader` para importar só o que usa (tree shaking).

Referência completa (atributos, eventos, opções, configuração do loader): [`docs/architecture/behavior.md`](../../docs/architecture/behavior.md).

## O que cada componente espera

O markup é o contrato do core (`.eds-*`); o pacote detecta por classes e ARIA. Só acrescenta `data-eds-*` onde o markup não basta: `data-eds-open`, `data-eds-close`, `data-eds-backdrop="static"`, `data-eds-dismiss`, `data-eds-select-all`/`-row`, `data-eds-table-filter`, `data-eds-filter-columns`, `data-eds-filter-ignore`, `data-eds-sidebar-collapse`, `data-eds-source`, `data-eds-min-chars`, `data-eds-free-text`, `data-eds-multiple`, `data-eds-name`, `data-eds-max-selected`, `data-eds-upload`, `data-eds-max-size`, `data-eds-max-files`, `data-eds-upload-url`, `data-eds-upload-field`, `data-eds-confirm` (e `-title`, `-variant`, `-ok`), `data-eds-sortable`, `data-eds-group`, `data-eds-orientation`, `data-eds-editable`, `data-eds-multiselect`, `data-eds-tree`, `data-eds-children-url`, `data-eds-native-alert`, `data-eds-loader`, `data-eds-mask` (e `-unmask`, `-decimals`, `-prefix`, `-negative`).

## Scripts

`pnpm build` (ESM + `.d.ts` + IIFE) · `pnpm typecheck` · `pnpm test`.
