import { Stack } from '@eds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import Basica from '../../examples/table/basica';
import basicaHtml from '../../examples/table/basica.html?raw';
import basicaSource from '../../examples/table/basica.tsx?raw';
import Filtro from '../../examples/table/filtro';
import filtroHtml from '../../examples/table/filtro.html?raw';
import filtroSource from '../../examples/table/filtro.tsx?raw';
import Interativa from '../../examples/table/interativa';
import interativaHtml from '../../examples/table/interativa.html?raw';
import interativaSource from '../../examples/table/interativa.tsx?raw';
import Vazia from '../../examples/table/vazia';
import vaziaHtml from '../../examples/table/vazia.html?raw';
import vaziaSource from '../../examples/table/vazia.tsx?raw';

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
              <code>@eds-ui/behavior</code> cuida da ordenação e da seleção (
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
              filtro do <code>@eds-ui/behavior</code> (com o campo na toolbar ou onde for);{' '}
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
          title="Tabela vazia"
          description="Uma linha com TableEmpty e um EmptyState dentro."
          html={vaziaHtml}
          react={{ Component: Vazia, source: vaziaSource }}
        />
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
              effect: 'Coluna estreita só com o checkbox de seleção.',
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
