import { Stack } from '@efds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { CodeBlock } from '../../components/CodeBlock';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import Basica from '../../examples/table/basica';
import basicaHtml from '../../examples/table/basica.html?raw';
import basicaSource from '../../examples/table/basica.tsx?raw';
import Carregando from '../../examples/table/carregando';
import carregandoHtml from '../../examples/table/carregando.html?raw';
import carregandoSource from '../../examples/table/carregando.tsx?raw';
import ExcluirDesfazer from '../../examples/table/excluir-desfazer';
import excluirDesfazerSource from '../../examples/table/excluir-desfazer.tsx?raw';
import Exportar from '../../examples/table/exportar';
import exportarHtml from '../../examples/table/exportar.html?raw';
import exportarSource from '../../examples/table/exportar.tsx?raw';
import Filtro from '../../examples/table/filtro';
import filtroHtml from '../../examples/table/filtro.html?raw';
import filtroSource from '../../examples/table/filtro.tsx?raw';
import Interativa from '../../examples/table/interativa';
import interativaHtml from '../../examples/table/interativa.html?raw';
import interativaSource from '../../examples/table/interativa.tsx?raw';
import Vazia from '../../examples/table/vazia';
import vaziaHtml from '../../examples/table/vazia.html?raw';
import vaziaSource from '../../examples/table/vazia.tsx?raw';

const mascararHtml = `<script type="module">
  document.addEventListener('eds:table-beforeexport', (event) => {
    const { data } = event.detail;
    // Mascara o identificador (ou tire a coluna: data.columns = data.columns.filter(...)).
    data.rows = data.rows.map((row) => ({
      ...row,
      cpf: '***.***.***-' + String(row.cpf).slice(-2),
    }));
    // Para cancelar (pedir justificativa, registrar a auditoria): event.preventDefault();
  });
</script>`;

const ordenarReact = `import { useState } from 'react';
import {
  Table, TableHeaderCell, sortTableData, useTableFilter, type TableSortState,
} from '@efds-ui/react';

function Pedidos({ pedidos }) {
  const [ordem, setOrdem] = useState<TableSortState | null>(null);
  const filtro = useTableFilter(pedidos, { columns: ['codigo', 'cliente'] });
  const linhas = sortTableData(filtro.rows, ordem);

  return (
    <>
      <Input aria-label="Buscar pedido" type="search" {...filtro.inputProps} />
      <Table caption="Pedidos" sort={ordem} onSortChange={setOrdem} status={filtro.status}>
        <TableHead>
          <TableRow>
            <TableHeaderCell sortKey="codigo">Código</TableHeaderCell>
            <TableHeaderCell sortKey="cliente">Cliente</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>{linhas.map(/* ... */)}</TableBody>
      </Table>
    </>
  );
}`;

const mascararReact = `<TableExport
  getData={dados}
  filename="pedidos"
  onBeforeExport={(dados, { format }) => {
    registrarAuditoria(format, dados.rows.length); // seu código
    return {
      ...dados,
      rows: dados.rows.map((r) => ({ ...r, cpf: mascarar(String(r.cpf)) })),
    };
    // ou: return false; para cancelar.
  }}
/>`;

export default function TablePage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Dados tabulares simples, com linhas horizontais, colunas numéricas e de ações, ordenação,
        seleção, barra de ferramentas e rodapé com paginação. Rola dentro do próprio contêiner
        quando não cabe.
      </p>

      <UseCases
        use={[
          'Para listas de registros comparáveis por colunas: pedidos, clientes, faturas.',
          <>
            Com ordenação, seleção e paginação quando a lista é longa; veja{' '}
            <a href="#/componentes/pagination">Pagination</a> e{' '}
            <a href="#/componentes/empty-state">Empty State</a>, que são partes do Table.
          </>,
          'Com um nome claro na legenda (caption): ele rotula a tabela e a região rolável.',
        ]}
        avoid={[
          'Para organizar o layout da página: use Grid e Stack.',
          'Para dados que pedem edição em célula, agrupamento, virtualização ou colunas fixas: isso é DataGrid, pós-MVP.',
          'Para poucos itens com muito texto cada: um Card ou uma lista lê melhor.',
        ]}
      />

      <Section title="Exemplos">
        <Example
          title="Tabela básica"
          description="Coluna numérica alinhada à direita e coluna de ações com botão só de ícone."
          html={basicaHtml}
          react={{ Component: Basica, source: basicaSource }}
        />
        <Example
          title="Ordenação, seleção e paginação"
          description={
            <>
              Clique nos cabeçalhos para ordenar, marque linhas (a seleção atravessa as páginas) e
              troque de página. Cada mudança é anunciada em uma região de status única. No HTML, o{' '}
              <code>@efds-ui/behavior</code> cuida da ordenação e da seleção (
              <code>data-eds-select-all</code> e <code>data-eds-select-row</code>); a barra de
              ferramentas e a paginação são do seu código.
            </>
          }
          html={interativaHtml}
          react={{ Component: Interativa, source: interativaSource }}
        />
        <Example
          title="Busca local (filtro de linhas)"
          description={
            <>
              Digite &quot;clin&quot; ou &quot;CLINICA&quot;: a busca ignora acento e caixa e olha
              todas as células, menos as marcadas com <code>data-eds-filter-ignore</code> (ações).
              No HTML, <code>data-eds-table-filter=&quot;ID-DA-TABELA&quot;</code> no campo liga o
              filtro do <code>@efds-ui/behavior</code> (com o campo na toolbar ou onde for);{' '}
              <code>data-eds-filter-columns=&quot;2,3&quot;</code> restringe às colunas 2 e 3. O
              resultado é anunciado depois de uma pausa na digitação, e Esc limpa o campo. O filtro
              só alcança as linhas que estão no DOM: com paginação no servidor, filtre no servidor.
              No React, o mesmo filtro é estado do seu componente (sem API nova).
            </>
          }
          html={filtroHtml}
          react={{ Component: Filtro, source: filtroSource }}
        />
        <Example
          title="Carregando"
          description={
            <>
              <code>loading</code> põe <code>aria-busy=&quot;true&quot;</code> na tabela e anuncia{' '}
              <code>texts.loading</code> em uma região <code>role=&quot;status&quot;</code> que já
              existia (uma região que nasce preenchida não é lida). As linhas Skeleton (
              <code>&lt;TableLoadingRows&gt;</code>) mantêm colunas e altura, sem salto de layout.
              Para recarregar sobre dados já exibidos, deixe as linhas reais (ficam esmaecidas) e
              use <code>loadingOverlay</code>, que acrescenta o Spinner, cobre toda a área rolável
              do wrap (não só o que está visível) e deixa o conteúdo da tabela <code>inert</code>: o
              foco não entra em controles cobertos e, ao terminar, volta a quem o tinha. No HTML, o
              mesmo markup: <code>aria-busy</code>, <code>tr.eds-table-loading</code> e{' '}
              <code>.eds-table-overlay</code> (com <code>.eds-table-overlay-box</code> dentro). No
              HTML puro, quem escreve a página põe o atributo <code>inert</code> na{' '}
              <code>&lt;table&gt;</code> junto com a sobreposição e o tira ao terminar.
            </>
          }
          html={carregandoHtml}
          react={{ Component: Carregando, source: carregandoSource }}
        />
        <Example
          title="Excluir linha com Desfazer"
          description={
            <>
              Padrão sem API nova: a linha some na hora e o Toast com <code>action</code> oferece
              &quot;Desfazer&quot; por 8 segundos, sem pedir confirmação para um ato reversível. Só
              confirme (diálogo) o que não tem volta. A exclusão no servidor deve esperar o prazo do
              desfazer, ou ser revertida por ele. Exige o <code>ToastProvider</code> na raiz do app.
            </>
          }
          react={{ Component: ExcluirDesfazer, source: excluirDesfazerSource }}
        />
        <Example
          title="Tabela vazia"
          description="Uma linha com TableEmpty e um EmptyState dentro."
          html={vaziaHtml}
          react={{ Component: Vazia, source: vaziaSource }}
        />
      </Section>

      <Section title="Exportar (CSV, Excel, JSON e PDF)">
        <p>
          Os quatro arquivos são gerados no navegador, sem dependência e sem enviar nada a
          terceiros. O Excel (.xlsx) traz cabeçalho em negrito e congelado, filtro e formatos de
          número e data; o CSV usa <code>;</code> e BOM (abre com acentos no Excel brasileiro); o
          PDF é A4, com título, rodapé &quot;Página N de M&quot; e quebra de linhas. Caracteres fora
          do Latin-1 saem como <code>?</code> no PDF, e datas anteriores a 01/03/1900 saem como
          texto no Excel.
        </p>
        <Example
          title="Exportar a tabela"
          description={
            <>
              No HTML, itens de um <code>.eds-dropdown</code> com <code>data-eds-export</code>{' '}
              apontam para a tabela, que é lida do DOM (o menu fecha ao clicar). No React, a fonte é
              o estado: <code>TableExport</code> recebe os dados por <code>data</code> ou{' '}
              <code>getData</code>. Nos dois exemplos o CPF não sai em claro: no HTML a coluna leva{' '}
              <code>data-eds-export-ignore</code>; no React, <code>onBeforeExport</code> o mascara.
              Só dados fictícios.
            </>
          }
          html={exportarHtml}
          react={{ Component: Exportar, source: exportarSource }}
        />
        <ClassTable
          caption="Atributos HTML da exportação (@efds-ui/behavior)"
          rows={[
            {
              name: 'data-eds-export="csv|xlsx|json|pdf"',
              effect:
                'No botão ou item de menu: gera o formato ao clicar. Exige data-eds-export-target.',
            },
            {
              name: 'data-eds-export-target="ID"',
              effect: 'id da tabela (ou de um contêiner com uma tabela).',
            },
            {
              name: 'data-eds-export-filename',
              effect:
                'Nome sem extensão; ganha -aaaa-mm-dd. Padrão: a caption sem acento, ou "tabela".',
            },
            {
              name: 'data-eds-export-title / data-eds-export-subtitle',
              effect:
                'Título (PDF: cabeçalho; XLSX: nome da planilha; padrão: a caption) e subtítulo do PDF.',
            },
            {
              name: 'data-eds-export-scope="auto|visible|selected|all"',
              effect:
                'auto (padrão): as linhas marcadas, se houver, senão as visíveis (o filtro local vale). visible: sem hidden. selected: só as marcadas. all: todas as do DOM.',
            },
            {
              name: 'th[data-type="text|number|currency|date|percent"]',
              effect:
                'Tipo da coluna (.eds-table-num já vale number). currency usa R$; percent guarda pontos percentuais.',
            },
            {
              name: 'td[data-value]',
              effect: 'Valor cru da célula (número ou data ISO); sem ele, vale o texto.',
            },
            {
              name: 'th, td, tr [data-eds-export-ignore]',
              effect:
                'No th tira a coluna; no td esvazia a célula; no tr tira a linha. As colunas de seleção e de ações nunca entram.',
            },
          ]}
        />
        <ClassTable
          caption="Eventos da exportação (na tabela, com bubble)"
          rows={[
            {
              name: 'eds:table-beforeexport',
              effect:
                'Cancelável (preventDefault). detail: format, scope, filename, count, data. Altere detail.data para mascarar ou retirar colunas: o arquivo sai com a alteração.',
            },
            {
              name: 'eds:table-export',
              effect: 'Depois de gerar. detail: format, scope, filename, count.',
            },
          ]}
        />
        <PropsTable
          caption="Props de TableExport"
          rows={[
            {
              name: 'data | getData',
              type: 'ExportData | () => ExportData',
              required: true,
              description: (
                <>
                  Colunas (<code>key</code>, <code>label</code>, <code>type</code>) e linhas. Use{' '}
                  <code>getData</code> para ler o estado atual a cada clique.
                </>
              ),
            },
            {
              name: 'formats',
              type: "('csv' | 'xlsx' | 'json' | 'pdf')[]",
              default: "['csv', 'xlsx', 'json', 'pdf']",
              description: 'Formatos do menu, na ordem dada.',
            },
            {
              name: 'filename',
              type: 'string',
              default: "'tabela'",
              description: 'Nome sem extensão (ela é acrescentada).',
            },
            {
              name: 'title / subtitle / sheetName',
              type: 'string',
              description: 'Título (PDF e planilha), subtítulo do PDF e nome da planilha.',
            },
            {
              name: 'onBeforeExport',
              type: '(data, { format, filename }) => ExportData | false | void',
              description:
                'Antes de gerar. Devolva os dados alterados (mascarados), false para cancelar ou nada para seguir.',
            },
            {
              name: 'onExport',
              type: '({ format, filename, count }) => void',
              description: 'Depois que o arquivo foi gerado.',
            },
            {
              name: 'texts',
              type: 'Partial<TableExportTexts>',
              description: (
                <>
                  Textos substituíveis: <code>label</code> (botão, &quot;Exportar&quot;),{' '}
                  <code>csv</code>, <code>xlsx</code>, <code>json</code> e <code>pdf</code> (itens
                  do menu) e o anúncio de resultado (<code>done</code>, <code>doneOne</code>,{' '}
                  <code>empty</code>, <code>failed</code>; <code>{'{name}'}</code> e{' '}
                  <code>{'{count}'}</code>).
                </>
              ),
            },
            {
              name: 'locale',
              type: 'string',
              default: 'o do LocaleProvider',
              description:
                'Locale das datas e dos números do arquivo (ordem da data, separadores decimal e de milhar e o /Lang do PDF).',
            },
            {
              name: 'variant / size / disabled / className',
              type: 'ButtonVariant / ButtonSize / boolean / string',
              default: "'secondary' / 'md'",
              description: 'Passam para o botão. O ref também vai para ele.',
            },
          ]}
        />
        <p>
          Sem o componente, as funções <code>exportData</code>, <code>toCsv</code>,{' '}
          <code>toJson</code>, <code>toXlsx</code> e <code>toPdf</code> também saem de{' '}
          <code>@efds-ui/react</code> (e de <code>@efds-ui/behavior</code>). O React usa só o
          subcaminho <code>@efds-ui/behavior/export</code>: não leva o <code>init</code> nem os
          outros módulos.
        </p>
        <Stack gap={3}>
          <p className="eds-text-label">LGPD: o que sai no arquivo</p>
          <ul className="docs-list">
            <li>
              O arquivo leva <strong>tudo o que está nos dados</strong>, inclusive colunas que a
              interface esconde por CSS. Mascarar só no CSS não basta: o texto continua no DOM.
            </li>
            <li>
              Colunas com dado pessoal ou sensível (CPF, e-mail, telefone, saúde, finanças) devem
              ser omitidas ou mascaradas <strong>no servidor</strong> ou, no cliente, tratadas antes
              de exportar: <code>data-eds-export-ignore</code>, ou um ouvinte de{' '}
              <code>eds:table-beforeexport</code> (HTML), ou <code>onBeforeExport</code> (React).
            </li>
            <li>
              O mesmo gancho serve para registrar quem exportou o quê (formato, quantidade, nome do
              arquivo) e para cancelar pedindo justificativa. Só o que está carregado sai: com
              paginação no servidor, exporte pelo servidor.
            </li>
          </ul>
          <CodeBlock
            code={mascararHtml}
            label="Código HTML: mascarar dado sensível antes de exportar"
          />
          <CodeBlock
            code={mascararReact}
            label="Código React: mascarar e auditar antes de exportar"
          />
        </Stack>
      </Section>

      <Section title="API React">
        <p>
          <code>Table</code> monta a região rolável do core, a <code>&lt;table&gt;</code> e a{' '}
          <code>&lt;caption&gt;</code>. <code>TableHead</code>, <code>TableBody</code> e{' '}
          <code>TableRow</code> são os elementos nativos com <code>ref</code> repassado. A região
          rolável só vira <code>role=&quot;region&quot;</code> focável quando a tabela de fato rola.
        </p>
        <PropsTable
          caption="Props de Table"
          rows={[
            {
              name: 'sort / onSortChange',
              type: '{ column: string; direction: "ascending" | "descending" } | null / (sort) => void',
              description: (
                <>
                  Ordenação controlada, no padrão do behavior: com <code>onSortChange</code>, os{' '}
                  <code>&lt;TableHeaderCell sortKey&gt;</code> derivam o <code>aria-sort</code>{' '}
                  daqui e pedem a nova ordem ao serem acionados (crescente, depois alternando).
                  Ordene os dados com <code>sortTableData</code>.
                </>
              ),
            },
            {
              name: 'status',
              type: 'string',
              description: (
                <>
                  Texto lido em uma região <code>role=&quot;status&quot;</code> quando muda, como o{' '}
                  <code>status</code> do <code>useTableFilter</code>. A ordenação a Table anuncia
                  sozinha.
                </>
              ),
            },
            {
              name: 'loading',
              type: 'boolean',
              description: (
                <>
                  Carregando: <code>aria-busy</code> e anúncio de <code>texts.loading</code>.
                </>
              ),
            },
            {
              name: 'loadingOverlay',
              type: 'boolean',
              default: 'false',
              description: 'Com loading, acrescenta a sobreposição com Spinner (recarga).',
            },
            {
              name: 'TableLoadingRows: columns, rows, numeric',
              type: 'number, number, number[]',
              description: 'Linhas Skeleton (tr.eds-table-loading); rows padrão 3.',
            },
            {
              name: 'texts',
              type: 'Partial<TableTexts>',
              description: (
                <>
                  <code>sortedBy(coluna, direção)</code>: o anúncio da ordenação (&quot;Ordenado por
                  Cliente, crescente.&quot;).
                </>
              ),
            },
            {
              name: 'caption',
              type: 'ReactNode',
              required: true,
              description: 'Nome da tabela (<caption>); também rotula a região rolável.',
            },
            {
              name: 'captionHidden',
              type: 'boolean',
              default: 'true',
              description: 'Oculta o caption visualmente, mantendo-o para leitores de tela.',
            },
            {
              name: 'sticky',
              type: 'boolean',
              default: 'false',
              description: 'Cabeçalho fixo. Exige altura limitada no wrap (via wrapClassName).',
            },
            {
              name: 'wrapClassName',
              type: 'string',
              description: 'Classe extra do .eds-table-wrap.',
            },
            {
              name: 'wrapRef',
              type: 'Ref<HTMLDivElement>',
              description: 'Ref do .eds-table-wrap (o ref comum vai para a <table>).',
            },
          ]}
        />
        <PropsTable
          caption="Props de TableHeaderCell"
          rows={[
            {
              name: 'sortKey',
              type: 'string',
              description: (
                <>
                  Chave da coluna na ordenação controlada da{' '}
                  <code>&lt;Table sort onSortChange&gt;</code>: <code>aria-sort</code> e o botão vêm
                  do estado da tabela, sem <code>sort</code> nem <code>onSort</code> à mão.
                </>
              ),
            },
            {
              name: 'sort',
              type: "'ascending' | 'descending' | 'none'",
              description: (
                <>
                  Torna a coluna ordenável: <code>aria-sort</code> no <code>&lt;th&gt;</code> e um
                  botão com o ícone de ordenação. Use <code>none</code> nas ordenáveis que não são a
                  atual.
                </>
              ),
            },
            {
              name: 'onSort',
              type: '() => void',
              description: 'Chamado ao acionar o botão. O consumidor decide a próxima direção.',
            },
            {
              name: 'numeric',
              type: 'boolean',
              description: 'Alinha à direita com algarismos tabulares.',
            },
            {
              name: 'column',
              type: "'check' | 'actions'",
              description: 'Coluna especial do core: seleção (estreita) ou ações.',
            },
            {
              name: 'scope',
              type: "'col' | 'row' | …",
              default: "'col'",
              description: 'Atributo nativo; use scope="row" em cabeçalhos de linha.',
            },
          ]}
        />
        <PropsTable
          caption="Props de TableCell"
          rows={[
            {
              name: 'numeric',
              type: 'boolean',
              description: 'Alinha à direita com algarismos tabulares.',
            },
            {
              name: 'column',
              type: "'check' | 'actions'",
              description: 'Coluna especial do core: seleção (estreita) ou ações.',
            },
          ]}
        />
        <PropsTable
          caption="Props de TableEmpty, TableToolbar e TableFooter"
          rows={[
            {
              name: 'TableEmpty: colSpan',
              type: 'number',
              required: true,
              description:
                'Número de colunas da tabela. Renderiza <tr><td class="eds-table-empty">; use com EmptyState.',
            },
            {
              name: 'TableToolbar',
              type: 'HTMLAttributes<HTMLDivElement>',
              description: 'Barra acima da tabela (busca, filtros, ações). Fica fora do <Table>.',
            },
            {
              name: 'TableFooter',
              type: 'HTMLAttributes<HTMLDivElement>',
              description: 'Rodapé abaixo da tabela: resumo e Pagination. Fica fora do <Table>.',
            },
          ]}
        />
      </Section>

      <Section title="Ordenar e filtrar no React">
        <p>
          No HTML, o <code>@efds-ui/behavior</code> ordena e filtra as linhas do DOM. No React a
          fonte é o estado, então a mesma regra vem em funções que trabalham sobre o array:{' '}
          <code>sortTableData(linhas, ordem, {'{ getValue, locale }'})</code> e{' '}
          <code>filterTableData(linhas, texto, {'{ columns, getText }'})</code>. A ordem de números
          (pt-BR ou ponto decimal), datas (dd/mm/aaaa ou ISO) e texto (sem diferenciar acento e
          caixa; vazios por último) é a mesma do behavior. O hook <code>useTableFilter</code> cuida
          do atraso (150 ms), do Esc para limpar e do anúncio da contagem, que vai para{' '}
          <code>&lt;Table status&gt;</code>. Só alcançam as linhas que estão no array: com paginação
          no servidor, filtre e ordene no servidor.
        </p>
        <CodeBlock code={ordenarReact} label="Código React: ordenação controlada e filtro local" />
        <PropsTable
          caption="useTableFilter(linhas, opções)"
          rows={[
            {
              name: 'opções',
              type: '{ columns?, getText?, delay?, texts? }',
              description:
                'columns (chaves pesquisadas) ou getText (texto da linha); delay em ms (150); texts: many, one, none, cleared, clearedOne.',
            },
            {
              name: 'retorno',
              type: '{ query, setQuery, rows, count, status, inputProps }',
              description:
                'inputProps (value, onChange e Esc) vai direto no campo de busca; status vai para a Table.',
            },
          ]}
        />
      </Section>

      <Section title="Classes CSS">
        <p>
          Quem usa só HTML aplica as classes diretamente; o React emite exatamente estas. A linha
          selecionada não tem classe: o core a reconhece por <code>:has</code> no checkbox marcado.
        </p>
        <ClassTable
          caption="Classes e atributos de Table"
          rows={[
            {
              name: '.eds-table-wrap',
              effect:
                'Contêiner com borda e rolagem. Quando rola, precisa de tabindex="0", role="region" e aria-labelledby.',
            },
            {
              name: '.eds-table',
              effect:
                'A tabela: linhas horizontais, altura de linha dos tokens de densidade, células sem quebra.',
            },
            {
              name: '.eds-table-sticky',
              effect: 'Cabeçalho fixo; o wrap precisa de altura limitada.',
            },
            {
              name: '.eds-table-caption',
              effect: 'A legenda. Junto de .eds-visually-hidden, só para leitores de tela.',
            },
            {
              name: '.eds-table-wrap-text',
              effect: 'Em uma célula: permite a quebra de linha (o padrão é não quebrar).',
            },
            {
              name: '.eds-table-num',
              effect: 'Coluna numérica: alinhada ao fim, algarismos tabulares.',
            },
            {
              name: '.eds-table-check',
              effect:
                'Coluna estreita só com a seleção: o checkbox vai dentro de <label class="eds-check">, que preenche a célula e vira o alvo de clique e de toque.',
            },
            {
              name: '.eds-table-actions',
              effect: 'Coluna de ações no fim; botões ghost em texto secundário.',
            },
            {
              name: '.eds-table-sort',
              effect: 'Botão de ordenação dentro do <th>, com o ícone de dois chevrons.',
            },
            {
              name: 'th[aria-sort]',
              effect:
                'ascending e descending mostram só o chevron da direção e põem o cabeçalho em cor plena; none mostra os dois, esmaecidos.',
            },
            {
              name: '.eds-table-empty',
              effect:
                'Célula com colspan do estado vazio: sem altura fixa nem padding, com o conteúdo centralizado e ancorado à área visível.',
            },
            {
              name: '.eds-table-toolbar',
              effect: 'Linha flex acima da tabela; o último filho vai para o fim.',
            },
            {
              name: '.eds-table-footer',
              effect:
                'Linha flex abaixo da tabela: resumo e paginação; responde à largura do próprio contêiner.',
            },
          ]}
        />
      </Section>

      <Section title="Desempenho">
        <p>Os números abaixo são uma referência de uso, não um limite imposto pelo código.</p>
        <ul className="docs-list">
          <li>
            <strong>Referência prática:</strong> até cerca de 1.000 linhas no DOM, ordenar, filtrar
            e selecionar respondem sem atraso perceptível. Acima disso, pagine e ordene/filtre no
            servidor (<code>preventDefault</code> em <code>eds:table-sort</code>).
          </li>
          <li>
            A ordenação move as linhas em uma única inserção e lê o tipo da coluna uma vez; o filtro
            guarda o texto normalizado de cada linha e só o recalcula quando a linha muda.
          </li>
          <li>
            Não há virtualização: toda linha existente ocupa DOM. Para listas muito grandes, a
            paginação é o caminho.
          </li>
        </ul>
      </Section>

      <Section title="Acessibilidade">
        <Stack gap={3}>
          <ul className="docs-list">
            <li>
              <strong>Estrutura:</strong> <code>&lt;table&gt;</code> com{' '}
              <code>&lt;caption&gt;</code>, <code>scope</code> nos cabeçalhos e uma coluna de ações
              com o cabeçalho &quot;Ações&quot; oculto.
            </li>
            <li>
              <strong>Rolagem:</strong> o wrap recebe <code>tabindex=&quot;0&quot;</code>,{' '}
              <code>role=&quot;region&quot;</code> e <code>aria-labelledby</code> (a caption){' '}
              <em>somente</em> quando rola de fato, para o teclado alcançar o conteúdo.
            </li>
            <li>
              <strong>Ordenação:</strong> botão <code>.eds-table-sort</code> dentro do{' '}
              <code>&lt;th&gt;</code>; <code>aria-sort</code> no <code>&lt;th&gt;</code> (
              <code>none</code> nas demais ordenáveis). Como o <code>aria-sort</code> não é
              anunciado com o foco no botão, anuncie o resultado em uma região{' '}
              <code>role=&quot;status&quot;</code> (&quot;Ordenado por Cliente, crescente.&quot;). O
              nome da tabela é estável: não inclui a ordenação.
            </li>
            <li>
              <strong>Seleção:</strong> o checkbox de todos usa <code>indeterminate</code> (o
              Checkbox do React aplica a propriedade DOM) e se chama &quot;Selecionar todos desta
              página&quot;; cada linha, &quot;Selecionar {'{identificador}'}&quot;. Uma região de
              status montada vazia anuncia a contagem, com plural correto. Ao limpar ou excluir a
              seleção, devolva o foco a um controle habilitado, nunca a um <code>disabled</code>;
              uma busca ou filtro que zera a seleção avisa no status.
            </li>
            <li>
              <strong>Busca e filtro:</strong> uma única região de status por tabela
              (&quot;Mostrando 1–10 de 86&quot;, &quot;Nenhum cliente encontrado.&quot;); em busca
              assíncrona, anuncie depois do debounce.
            </li>
            <li>
              <strong>Paginação:</strong> ao trocar de página o foco permanece no controle acionado
              e a mudança é anunciada pelo status da tabela.
            </li>
            <li>
              <strong>Estado vazio:</strong> &quot;Nenhum resultado&quot; é anunciado pelo status da
              tabela; o estado vazio em si não é uma live region.
            </li>
            <li>
              <strong>Forçado pelo tipo:</strong> <code>caption</code> é obrigatória no{' '}
              <code>Table</code>; o Checkbox sem texto exige <code>aria-label</code>; o botão só de
              ícone exige <code>aria-label</code>.
            </li>
            <li>
              <strong>Limitação conhecida:</strong> não há coluna fixa (sticky) no MVP. Ao rolar na
              horizontal, a coluna de identificação sai de vista. Fica para depois do MVP.
            </li>
            <li>
              <strong>Cor nunca sozinha:</strong> a ordenação usa ícone e <code>aria-sort</code>,
              não só cor; a linha selecionada traz o checkbox marcado, o fundo e uma barra de
              destaque na primeira célula (mais larga no modo de cores forçadas).
            </li>
          </ul>
        </Stack>
      </Section>
    </>
  );
}
