import { Stack } from '@eds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import Controlada from '../../examples/pagination/controlada';
import controladaHtml from '../../examples/pagination/controlada.html?raw';
import controladaSource from '../../examples/pagination/controlada.tsx?raw';
import Links from '../../examples/pagination/links';
import linksHtml from '../../examples/pagination/links.html?raw';
import linksSource from '../../examples/pagination/links.tsx?raw';

export default function PaginationPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Navegação entre as páginas de uma lista longa. Parte do Table: fica no rodapé dele, ao lado
        do resumo &quot;1–10 de 248&quot;. Mostra até sete posições (primeira, última, vizinhas da
        atual e reticências).
      </p>

      <UseCases
        use={[
          <>
            No rodapé de um <a href="#/componentes/table">Table</a> com mais registros do que cabem
            em uma tela.
          </>,
          <>
            Com botões, quando a página muda no próprio estado da tela; com links (
            <code>getHref</code>), quando a página faz parte da URL.
          </>,
          'Em qualquer lista paginada: o componente é independente do Table.',
        ]}
        avoid={[
          'Para listas curtas que cabem em uma tela: mostre tudo.',
          'Para rolagem infinita ou "carregar mais": use um botão com esse texto.',
          'Para trocar de aba ou de etapa: use Tabs ou um indicador de etapas.',
        ]}
      />

      <Section title="Exemplos">
        <Example
          title="Controlada, com botões"
          description={
            <>
              O componente é controlado: o consumidor guarda a página e atualiza em{' '}
              <code>onPageChange</code>. Os controles do primeiro e do último limite ficam{' '}
              <code>aria-disabled</code>, mas continuam focáveis.
            </>
          }
          html={controladaHtml}
          react={{ Component: Controlada, source: controladaSource }}
        />
        <Example
          title="Com links"
          description={
            <>
              Com <code>getHref</code>, cada controle é um <code>&lt;a href&gt;</code>. Neste site,
              o clique troca o hash da URL, e por isso o foco vai ao título da página.
            </>
          }
          html={linksHtml}
          react={{ Component: Links, source: linksSource }}
        />
        <p>
          A tabela completa, com resumo no rodapé, ordenação e seleção, está em{' '}
          <a href="#/componentes/table">Table</a>.
        </p>
      </Section>

      <Section title="API React">
        <p>
          <code>Pagination</code> estende <code>&lt;nav&gt;</code> (sem <code>children</code>),
          repassa <code>ref</code> e mescla <code>className</code> depois das classes do core.
        </p>
        <PropsTable
          caption="Props de Pagination"
          rows={[
            {
              name: 'page',
              type: 'number',
              required: true,
              description: 'Página atual, a partir de 1. Valores fora do intervalo são ajustados.',
            },
            {
              name: 'pageCount',
              type: 'number',
              required: true,
              description: 'Total de páginas.',
            },
            {
              name: 'onPageChange',
              type: '(page: number) => void',
              description: 'Chamado ao acionar uma página, Anterior ou Próxima.',
            },
            {
              name: 'getHref',
              type: '(page: number) => string',
              description: (
                <>
                  Com ele, os controles são links (<code>&lt;a href&gt;</code>); sem ele, botões.
                </>
              ),
            },
            {
              name: 'showInfo',
              type: 'boolean',
              default: 'true',
              description: 'Mostra "Página X de Y" (só em larguras estreitas, por CSS).',
            },
            {
              name: 'texts',
              type: 'Partial<PaginationTexts>',
              description: (
                <>
                  Textos (padrão pt-BR): <code>nav</code> (&quot;Paginação&quot;),{' '}
                  <code>previous</code>, <code>next</code>, <code>page(n)</code> (nome acessível de
                  cada página) e <code>info(page, count)</code>.
                </>
              ),
            },
          ]}
        />
      </Section>

      <Section title="Classes CSS">
        <p>
          Quem usa só HTML aplica as classes diretamente; o React emite exatamente estas. O estado
          vem de atributos (<code>aria-current</code>, <code>aria-disabled</code>).
        </p>
        <ClassTable
          caption="Classes e atributos de Pagination"
          rows={[
            {
              name: '.eds-pagination',
              effect: 'O <nav>; responde à largura do próprio contêiner.',
            },
            { name: '.eds-pagination-list', effect: 'A lista (<ul>) de controles.' },
            {
              name: '.eds-pagination-item',
              effect: 'Botão ou link de uma página, quadrado.',
            },
            {
              name: '.eds-pagination-prev / .eds-pagination-next',
              effect: 'Anterior e Próxima, com chevron e texto.',
            },
            {
              name: '.eds-pagination-ellipsis',
              effect: 'Reticências entre blocos. Use aria-hidden.',
            },
            {
              name: '.eds-pagination-info',
              effect: 'Resumo "Página X de Y"; aparece só no modo estreito.',
            },
            {
              name: '[aria-current="page"]',
              effect:
                'Página atual: preenchida na cor de ação (no modo de cores forçadas, Highlight).',
            },
            {
              name: '[aria-disabled="true"], :disabled',
              effect: 'Controle indisponível (Anterior na primeira, Próxima na última): sem hover.',
            },
          ]}
        />
      </Section>

      <Section title="Acessibilidade">
        <Stack gap={3}>
          <ul className="docs-list">
            <li>
              <strong>Landmark:</strong> <code>&lt;nav&gt;</code> com{' '}
              <code>aria-label=&quot;Paginação&quot;</code> (<code>texts.nav</code>, para traduzir).
              Se houver mais de uma na página, dê nomes diferentes.
            </li>
            <li>
              <strong>Página atual:</strong> <code>aria-current=&quot;page&quot;</code>. Cada página
              tem nome acessível próprio (&quot;Página 3&quot;), já que o texto visível é só o
              número.
            </li>
            <li>
              <strong>Limites:</strong> Anterior e Próxima ficam <code>aria-disabled</code> (e não{' '}
              <code>disabled</code>) nos extremos, continuam focáveis e ignoram a ação.
            </li>
            <li>
              <strong>Reticências:</strong> <code>aria-hidden</code>; são só visuais.
            </li>
            <li>
              <strong>Foco e anúncio:</strong> ao trocar de página, o foco permanece no controle
              acionado e a mudança é anunciada pela região de status da tabela (&quot;Página 2 de 3:
              mostrando 4–6 de 9.&quot;). O Pagination não anuncia por si.
            </li>
            <li>
              <strong>Forçado pelo componente:</strong> os glifos de seta são decorativos (
              <code>aria-hidden</code>) e o nome de cada página vem de <code>texts.page</code>.
            </li>
            <li>
              <strong>O consumidor deve garantir:</strong> atualizar o conteúdo e o resumo junto com
              a página, e anunciá-la em uma região <code>role=&quot;status&quot;</code> montada
              antes.
            </li>
          </ul>
        </Stack>
      </Section>
    </>
  );
}
