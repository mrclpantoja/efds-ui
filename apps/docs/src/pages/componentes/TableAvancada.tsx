import { ClassTable } from '../../components/ClassTable';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import MultiOrdenacao from '../../examples/table/multi-ordenacao';
import multiOrdenacaoHtml from '../../examples/table/multi-ordenacao.html?raw';
import multiOrdenacaoSource from '../../examples/table/multi-ordenacao.tsx?raw';
import FiltroColuna from '../../examples/table/filtro-coluna';
import filtroColunaHtml from '../../examples/table/filtro-coluna.html?raw';
import filtroColunaSource from '../../examples/table/filtro-coluna.tsx?raw';
import Colunas from '../../examples/table/colunas';
import colunasHtml from '../../examples/table/colunas.html?raw';
import colunasSource from '../../examples/table/colunas.tsx?raw';
import Lote from '../../examples/table/lote';
import loteHtml from '../../examples/table/lote.html?raw';
import loteSource from '../../examples/table/lote.tsx?raw';
import Remota from '../../examples/table/remota';
import remotaHtml from '../../examples/table/remota-navigate.html?raw';
import remotaSource from '../../examples/table/remota.tsx?raw';
import Edicao from '../../examples/table/edicao';
import edicaoHtml from '../../examples/table/edicao.html?raw';
import edicaoSource from '../../examples/table/edicao.tsx?raw';

export default function TableAvancadaPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Recursos para listas grandes e telas de trabalho, todos opcionais e ligados por atributo:
        ordenação por mais de uma coluna, filtro por coluna, colunas fixas, redimensionáveis,
        reordenáveis e ocultáveis, preferências salvas, ações em lote, consulta no servidor e edição
        na célula. A tabela continua sendo uma <code>&lt;table&gt;</code> semântica, sem{' '}
        <code>role=&quot;grid&quot;</code>: sem o atributo de um recurso, ela se comporta como a{' '}
        <a href="/componentes/table">Table</a> de sempre.
      </p>

      <UseCases
        use={[
          'Para listagens de trabalho: dezenas de colunas, filtros combinados, ordenação por vários critérios e ações sobre vários registros.',
          'Quando o servidor pagina, ordena e filtra: a mesma marcação funciona sem JavaScript (links e formulários GET) e, com o JS, emite uma consulta.',
          'Para ajustes pequenos de dados em lote, na própria célula, com validação e erro do servidor.',
        ]}
        avoid={[
          'Para edição da linha inteira, planilha com fórmulas, agrupamento ou virtualização de milhares de linhas: isso é um DataGrid, em pacote à parte depois da 1.0.',
          'Para poucas colunas e poucos registros: a Table simples basta.',
          'Para guardar o arranjo das colunas por usuário em dado pessoal: use o servidor (ver Preferências).',
        ]}
      />

      <Section title="Selos de estabilidade">
        <p>
          Esta página está marcada como <strong>experimental</strong> por causa do arranjo de
          colunas (arrasto e teclado pela alça) e da edição na célula, que têm a superfície de
          teclado mais nova e ainda não passaram por teste com leitor de tela real. A API pode mudar
          numa versão menor, com guia de migração. O restante (ordenação múltipla, filtro por
          coluna, lote e consulta remota) segue o SemVer como a Table.
        </p>
      </Section>

      <Section title="Ordenação múltipla">
        <Example
          title="Ordenar por mais de uma coluna"
          description={
            <>
              Clique ou Enter substitui a ordenação. <kbd>Shift</kbd>+clique ou <kbd>Shift</kbd>
              +Enter acrescenta a coluna (até três); acionada de novo, alterna a direção, e depois
              de decrescente sai da lista. A prioridade aparece como número ao lado do chevron
              (nunca só cor). Só o critério principal leva <code>aria-sort</code>; os demais dizem a
              posição em texto oculto e a ordem completa é anunciada. Para toque,{' '}
              <code>data-eds-sort-multi=&quot;add&quot;</code> faz todo clique acrescentar. No
              React, <code>multiSort</code> troca a ordenação para uma lista.
            </>
          }
          html={multiOrdenacaoHtml}
          react={{ Component: MultiOrdenacao, source: multiOrdenacaoSource }}
        />
        <ClassTable
          caption="Atributos e evento da ordenação múltipla"
          rows={[
            {
              name: 'table[data-eds-sort-multi="shift|add"]',
              effect: 'Liga a ordenação múltipla (sem valor = shift). add: todo clique acrescenta.',
            },
            { name: 'table[data-eds-sort-max]', effect: 'Máximo de critérios. Padrão 3.' },
            {
              name: 'th[data-eds-col]',
              effect:
                'Identidade da coluna (kebab, único na tabela). Ordenar, ocultar e reordenar usam o id, nunca o índice.',
            },
            {
              name: 'button[data-eds-sort-clear]',
              effect:
                'Remove toda a ordenação, mantendo o foco no botão. O valor pode ser o id da tabela.',
            },
            {
              name: 'eds:table-sort',
              effect:
                'Cancelável. detail traz column, label, direction e th (como antes) mais key, sort (a ordenação completa), multi e reason (replace, add, toggle, remove ou clear). Cancelando, o app ordena no servidor e chama setState({ sort }).',
            },
          ]}
        />
      </Section>

      <Section title="Filtros por coluna">
        <Example
          title="Filtrar por coluna"
          description={
            <>
              Um botão no cabeçalho abre um <code>popover</code> nativo com um{' '}
              <code>&lt;form method=&quot;get&quot;&gt;</code>: não aumenta a altura do cabeçalho e,
              sem JavaScript, o envio GET funciona (os <code>name</code> dos campos são os
              parâmetros da consulta). Tipos: <code>text</code> (contém, sem acento e caixa),{' '}
              <code>select</code>, <code>number</code> e <code>date</code> (faixa). Enter ou Aplicar
              filtra, fecha e devolve o foco ao botão; Esc fecha sem aplicar. O filtro ativo aparece
              no ícone e no nome do botão, e nos chips acima da tabela. Combina com a busca geral (E
              lógico). Os chips mostram os limites no formato da coluna (<code>th[data-type]</code>{' '}
              com <code>number</code>, <code>currency</code>, <code>percent</code> ou{' '}
              <code>date</code>, ou o tipo do filtro) e no locale configurado: &quot;Limite: a
              partir de R$ 50.000,00&quot;. Em React,{' '}
              <code>describeColumnFilter(valor, {'{ type, locale, currency }'})</code> devolve o
              mesmo texto para os seus chips.
            </>
          }
          html={filtroColunaHtml}
          react={{ Component: FiltroColuna, source: filtroColunaSource }}
        />
        <ClassTable
          caption="Atributos e evento do filtro por coluna"
          rows={[
            {
              name: 'form[data-eds-column-filter="text|select|number|date"]',
              effect:
                'Dentro do th (com data-eds-col). Enter ou Aplicar filtra; data-eds-filter-clear limpa.',
            },
            {
              name: 'ul[data-eds-table-chips="ID"]',
              effect:
                'Recebe um chip por filtro aplicado (button.eds-chip[data-eds-chip-remove]). Remover devolve o foco ao chip seguinte ou ao botão de filtro.',
            },
            {
              name: 'data-eds-filter-columns',
              effect: 'Na busca geral: aceita ids (data-eds-col) além de índices (base 1).',
            },
            {
              name: 'td[data-filter-value] / [data-sort-value]',
              effect:
                'Valor da célula para filtrar (precedência: data-filter-value, data-sort-value, texto).',
            },
            {
              name: 'eds:table-column-filter',
              effect:
                'Cancelável. detail: key, value, filters. Cancelando, o app filtra no servidor e chama setState({ filters }).',
            },
          ]}
        />
      </Section>

      <Section title="Colunas">
        <Example
          title="Colunas fixas, largura, ordem e visibilidade"
          description={
            <>
              <code>th[data-eds-pin=&quot;start|end&quot;]</code> fixa colunas no início e no fim
              (várias, com o deslocamento somado pelo JS; o foco nunca fica sob uma coluna fixa).
              Com <code>data-eds-table-reorder</code> e <code>data-eds-table-resize</code>, cada
              coluna ganha uma alça (um único tab stop): <kbd>Espaço</kbd> pega, as setas movem,{' '}
              <kbd>Shift</kbd>+setas redimensionam (16 px; Ctrl, 64 px), <kbd>Home</kbd> e{' '}
              <kbd>End</kbd> vão às pontas, <kbd>Esc</kbd> cancela. O mesmo se faz com o ponteiro
              (arrastar a alça, arrastar a borda do cabeçalho) e, sem arrastar, pelo painel
              &quot;Colunas&quot; (marcar, mover, estreitar e alargar). A última coluna visível não
              sai. Reordenar move as células no DOM, então a ordem de Tab é a ordem visual. Linhas
              que o app desenha depois (o corpo refeito por <code>fetch</code>) podem vir na ordem
              original das colunas: o JS as reordena a partir dela. As fixas ficam nas pontas: se o
              HTML põe uma fixa no meio, o JS a leva ao início (ou ao fim) ao ligar, e a ordem salva
              é sempre a que aparece na tela.
            </>
          }
          html={colunasHtml}
          react={{ Component: Colunas, source: colunasSource }}
        />
        <Section title="Preferências salvas" level={3}>
          <p>
            <code>data-eds-table-prefs=&quot;chave&quot;</code> guarda ordem, ocultas e larguras no{' '}
            <code>localStorage</code> do navegador, na chave <code>eds:table:chave</code>(
            <code>data-eds-table-prefs-save=&quot;order hidden widths sort&quot;</code> escolhe o
            que vai; a ordenação nunca é guardada em tabela remota). A chave é do autor,{' '}
            <strong>estática e sem dado pessoal</strong>: nunca um id de usuário, e-mail ou CPF
            (LGPD). Para guardar por usuário, use o servidor: ouça{' '}
            <code>eds:table-columns-change</code> e restaure com{' '}
            <code>tableController(tabela).setState({'{ columns }'})</code>. Ids desconhecidos são
            ignorados, colunas novas entram no fim, versão diferente ou JSON inválido voltam aos
            padrões, e o armazenamento bloqueado não gera erro. Filtros, página, seleção e fixação
            não são salvos.
          </p>
        </Section>
        <ClassTable
          caption="Atributos, classes e evento das colunas"
          rows={[
            {
              name: 'th[data-eds-pin="start|end"]',
              effect:
                'O JS aplica .eds-table-pin-start/-end/-edge às células da coluna e grava --_pin-inset (a soma das fixas anteriores). Quem renderiza no servidor pode escrever as classes (no máximo uma fixa de cada lado sem JS).',
            },
            {
              name: 'table[data-eds-table-resize]',
              effect: 'Redimensionar por borda e teclado. Cria <colgroup> e .eds-table-fixed.',
            },
            {
              name: 'table[data-eds-table-reorder]',
              effect: 'Reordenar por alça (teclado e ponteiro).',
            },
            {
              name: 'th[data-eds-col-locked], .eds-table-check, .eds-table-actions',
              effect: 'Colunas que não se movem nem se ocultam.',
            },
            {
              name: 'th[data-eds-min-width] / [data-eds-max-width]',
              effect: 'Limites de largura, em px (64 e 640).',
            },
            {
              name: 'button[data-eds-columns-for="ID"] + [data-eds-columns-list]',
              effect:
                'Painel "Colunas": o botão vem hidden e o JS o revela; a lista é preenchida. [data-eds-columns-reset] restaura o padrão e apaga a chave salva.',
            },
            {
              name: 'eds:table-columns-change',
              effect:
                'Depois de aplicar. detail: order, hidden, widths e reason (move, resize, visibility, reset, prefs).',
            },
          ]}
        />
        <p>
          A exportação (<a href="/componentes/table">Table</a>) ignora as colunas ocultas pelo
          usuário e segue a ordem visual; <code>data-eds-export-hidden-columns</code> inclui tudo.
          As colunas, as preferências e a edição fazem parte do <code>eds-behavior.js</code>{' '}
          completo (não do <code>eds-behavior-core.js</code>).
        </p>
      </Section>

      <Section title="Lote">
        <Example
          title="Barra de ações em lote"
          description={
            <>
              A barra aparece, colada à base da área visível, quando há linhas marcadas; a contagem
              é texto comum (o anúncio é o da região de status da tabela). Cada linha precisa de{' '}
              <code>data-eds-row-id</code>: é o que <code>eds:table-bulk-action</code> devolve em{' '}
              <code>ids</code>. Se a barra some com o foco dentro, o foco vai para o
              &quot;selecionar todos&quot;. Em tabela remota (com <code>data-total</code>),
              &quot;Selecionar todos os N&quot; muda o alcance para <code>all</code> e emite{' '}
              <code>eds:table-select-all-results</code>; a seleção entre páginas é do app (o
              behavior não a guarda). Terminada a ação, chame <code>clearSelection()</code>.
            </>
          }
          html={loteHtml}
          react={{ Component: Lote, source: loteSource }}
        />
      </Section>

      <Section title="Consulta no servidor">
        <Example
          title="Paginação, ordenação e filtro no servidor"
          description={
            <>
              Com <code>data-eds-table-remote=&quot;navigate&quot;</code> a ordenação é feita por
              links (<code>a.eds-table-sort</code>), a busca por{' '}
              <code>&lt;form method=&quot;get&quot;&gt;</code> e a paginação por links: a página
              inteira funciona sem JavaScript, e o servidor devolve <code>aria-sort</code>, os{' '}
              <code>href</code> e a página certa. Com o JS, a mesma marcação emite{' '}
              <code>eds:table-query</code> antes de navegar (aqui, na documentação, a navegação é
              bloqueada). Em <code>event</code>, o app recebe a consulta, busca e responde com{' '}
              <code>respondWith(promessa)</code>: a tabela mostra o carregamento, mantém os dados
              antigos se falhar e só aceita a última resposta. No React, <code>useTableQuery</code>{' '}
              guarda a consulta (e, com <code>syncUrl</code>, a URL).
            </>
          }
          html={remotaHtml}
          react={{ Component: Remota, source: remotaSource }}
        />
        <ClassTable
          caption="Atributos da tabela remota"
          rows={[
            {
              name: 'table[data-eds-table-remote="navigate|event"]',
              effect: 'Nada é ordenado, filtrado nem paginado localmente. Padrão: navigate.',
            },
            {
              name: 'table[data-total]',
              effect: 'Total de resultados (anúncio, "selecionar todos").',
            },
            {
              name: 'table[data-eds-table-params]',
              effect:
                'JSON que renomeia os parâmetros: {"page":"p","size":"limit"}. Padrões: page, size, sort, q, filter.',
            },
            {
              name: 'table[data-eds-table-anchor="id"]',
              effect: 'Acrescenta #id à URL (o foco volta ao título da tabela).',
            },
            {
              name: 'nav[data-eds-table-pagination="ID"], select[data-eds-table-size="ID"]',
              effect:
                'Paginação por links (lê data-eds-page ou o parâmetro page do href) e tamanho da página.',
            },
            {
              name: 'eds:table-query',
              effect:
                'Cancelável. detail: query, params (URLSearchParams), reason (sort, filter, q, page, size, chip, clear) e respondWith(promessa).',
            },
            {
              name: 'eds:table-load / eds:table-error',
              effect: 'Fim da consulta em event. O erro traz error e retry().',
            },
          ]}
        />
        <p>
          Formato da consulta (GET):{' '}
          <code>
            ?page=2&amp;size=25&amp;sort=cliente,-total&amp;q=ana&amp;filter[situacao]=pago&amp;filter[total][gte]=100
          </code>
          . <code>page</code> é base 1; <code>-</code> marca descendente; seleção múltipla repete a
          chave (autores PHP configuram <code>filter[x][]</code> no servidor); datas em ISO e
          números com ponto decimal (o formato pt-BR é só de exibição). As funções puras{' '}
          <code>parseTableQuery</code> e <code>toTableSearchParams</code> estão em{' '}
          <code>@efds-ui/behavior/export</code>.
        </p>
      </Section>

      <Section title="Edição">
        <Example
          title="Editar na célula"
          description={
            <>
              A tabela não vira <code>role=&quot;grid&quot;</code>: o modelo de grid pede um único
              tab stop, setas entre células e modos de navegação e edição, e conflita com botões de
              ordenação, links e menus por linha. A célula editável é um botão cujo nome contém o
              texto visível. Enter, Espaço, F2 ou clique abrem o editor do{' '}
              <code>&lt;template&gt;</code> da coluna; Enter confirma, Esc cancela, Tab confirma se
              válido (inválido fica em edição com o erro visível). Com{' '}
              <code>respondWith(promessa)</code> a célula fica ocupada até o servidor responder, e
              uma rejeição volta à edição com a mensagem. Setas continuam sendo do campo.
            </>
          }
          html={edicaoHtml}
          react={{ Component: Edicao, source: edicaoSource }}
        />
        <ClassTable
          caption="Atributos e eventos da edição"
          rows={[
            {
              name: 'th[data-eds-editor="id-do-template"]',
              effect: 'Editor da coluna: um <template> com input, select ou textarea.',
            },
            {
              name: 'td[data-eds-editable]',
              effect:
                'Célula editável (data-eds-editable="false" desabilita). data-eds-edit-field, data-eds-edit-format (currency, number, date... ou os apelidos moeda e numero) e data-sort-value/data-value são atualizados ao salvar.',
            },
            {
              name: 'tr[data-eds-row-id] / [data-eds-row-label]',
              effect: 'Identificador e nome da linha (rótulo do editor e anúncios).',
            },
            {
              name: 'eds:table-edit-start / -cancel',
              effect: 'Início (cancelável) e cancelamento.',
            },
            {
              name: 'eds:table-edit-commit',
              effect:
                'Cancelável. detail: cell, row, rowId, field, value, previous, setError(msg), respondWith(promessa que pode devolver { value, text }).',
            },
            { name: 'eds:table-edit-error', effect: 'O servidor recusou: detail traz message.' },
          ]}
        />
      </Section>

      <Section title="Controlador (HTML) e API React">
        <p>
          No HTML, <code>EDS.table(tabela)</code> (ou <code>tableController</code> no ESM) devolve o
          controlador da tabela ligada, ou <code>null</code>:
        </p>
        <ClassTable
          caption="Controlador da tabela"
          headers={['Método', 'Efeito']}
          rows={[
            {
              name: 'getState()',
              effect: '{ query, columns, selection: { count, ids, scope }, loading }.',
            },
            {
              name: 'setState({ sort, filters, q, page, size, columns })',
              effect:
                'Aplica e atualiza aria-sort, chips e controles, sem emitir eds:table-query. Use depois de ordenar ou filtrar no servidor.',
            },
            { name: 'clearSelection()', effect: 'Desmarca tudo.' },
            {
              name: 'setLoading(boolean)',
              effect: 'aria-busy, inert e a sobreposição de carregamento.',
            },
          ]}
        />
        <PropsTable
          caption="API React da Table avançada"
          rows={[
            {
              name: 'Table: multiSort / sortMax',
              type: "true | 'shift' | 'add' / number",
              description:
                'Com multiSort, sort e onSortChange passam a ser listas (TableSortState[]); sem ele, tudo igual a antes.',
            },
            {
              name: 'Table: columnsController / resizable / reorderable',
              type: 'TableColumnsController / boolean',
              description: 'Larguras, fixação e ordem vêm do controlador de useTableColumns.',
            },
            {
              name: 'TableHeaderCell: columnId / pin / filter',
              type: "string / 'start' | 'end' / ReactNode",
              description:
                'Identidade da coluna, fixação e o <TableColumnFilter /> do cabeçalho. TableCell recebe columnId.',
            },
            {
              name: 'useTableColumns(colunas, { prefsKey, state, onStateChange })',
              type: 'TableColumnsController',
              description:
                'Estado (order, hidden, widths), move, resize, toggle e reset; preferências na mesma chave do HTML.',
            },
            {
              name: 'TableColumnsMenu',
              type: '{ controller }',
              description: 'O painel "Colunas" (popover nativo).',
            },
            {
              name: 'TableColumnFilter',
              type: '{ type, value, onValueChange, options?, multiple?, label? }',
              description:
                'text, select, number ou date; Aplicar e Limpar internos; devolve o foco ao botão.',
            },
            {
              name: 'TableBulkBar',
              type: '{ count, total?, scope?, onClear, onSelectAllResults? }',
              description: 'Filhos são as ações. Sempre montada (hidden sem seleção).',
            },
            {
              name: 'TableEditableCell',
              type: '{ field, value, columnLabel, rowLabel, onCommit, validate?, required?, format? }',
              description:
                'onCommit(valor) devolve void ou uma promessa; rejeitar com Error(mensagem) mostra o erro na célula.',
            },
            {
              name: 'useTableQuery({ initial, syncUrl })',
              type: '{ query, setSort, setPage, setSize, setFilter, setQ, clearFilters, reset, searchParams }',
              description:
                'Mesmo formato de URL do HTML. O React não faz fetch: use query no seu hook de dados e passe loading e loadingOverlay à Table.',
            },
          ]}
        />
      </Section>

      <Section title="Acessibilidade">
        <ul className="docs-list">
          <li>
            Todo controle é nativo (<code>button</code>, <code>a</code>, campos); nenhum{' '}
            <code>role=&quot;grid&quot;</code>.
          </li>
          <li>
            Tudo o que se faz arrastando tem alternativa de clique ou teclado (WCAG 2.5.7): a alça e
            o painel &quot;Colunas&quot;.
          </li>
          <li>
            Cada ação gera um único anúncio na região de status da tabela; nenhum controle novo cria
            região viva própria.
          </li>
          <li>
            Colunas fixas somem do fluxo quando passam de 60% da largura (reflow) e a rolagem
            reserva espaço para elas (foco não encoberto). Estados de ordenado, filtrado e pego não
            dependem de cor.
          </li>
        </ul>
      </Section>

      <Section title="Guia de migração">
        <p>Nenhuma quebra obrigatória. O que muda de forma observável:</p>
        <ul className="docs-list">
          <li>
            o detalhe de <code>eds:table-sort</code> ganha <code>key</code>, <code>sort</code>,{' '}
            <code>multi</code> e <code>reason</code>;
          </li>
          <li>
            o filtro local passa por um coordenador de linhas (mesmos atributos e eventos), para
            combinar com os filtros por coluna;
          </li>
          <li>a exportação omite as colunas que o usuário ocultou (antes elas não existiam);</li>
          <li>
            <code>data-eds-filter-columns</code> aceita ids além de índices;
          </li>
          <li>
            <code>sortTableData</code> aceita uma lista de critérios e <code>filterTableData</code>{' '}
            aceita <code>filters</code>.
          </li>
        </ul>
      </Section>
    </>
  );
}
