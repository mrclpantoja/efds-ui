import { ClassTable } from '../../components/ClassTable';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import Basico from '../../examples/page-header/basico';
import basicoHtml from '../../examples/page-header/basico.html?raw';
import basicoSource from '../../examples/page-header/basico.tsx?raw';
import Pagina from '../../examples/page-header/pagina';
import paginaHtml from '../../examples/page-header/pagina.html?raw';
import paginaSource from '../../examples/page-header/pagina.tsx?raw';

export default function PageHeaderPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Esqueleto de uma página interna: cabeçalho (trilha, título, descrição, ações), faixa de
        ferramentas, corpo e rodapé. Só CSS; no React, <code>Page</code>, <code>PageHeader</code>,{' '}
        <code>PageToolbar</code>, <code>PageBody</code> e <code>PageFooter</code>.
      </p>

      <UseCases
        use={[
          'Em toda tela interna do app: o mesmo cabeçalho dá previsibilidade.',
          'Para pôr o título e as ações principais sempre no mesmo lugar.',
        ]}
        avoid={[
          'Para o cabeçalho do app (logo, usuário): isso é a Navbar.',
          'Para o título de um cartão ou diálogo: use o cabeçalho do Card ou do Modal.',
        ]}
      />

      <Section title="Exemplos">
        <Example
          title="Cabeçalho"
          description="Título e ações na mesma linha quando cabem; em contêiner estreito (< 40rem) as ações descem. A meta (selos e informações curtas) fica abaixo da descrição."
          html={basicoHtml}
          react={{ Component: Basico, source: basicoSource }}
        />
        <Example
          title="Página completa"
          description="Cabeçalho, indicadores, barra de filtros na toolbar, corpo com a tabela e rodapé com a paginação. As telas de referência Listagem e Dashboard do playground usam este esqueleto."
          html={paginaHtml}
          react={{ Component: Pagina, source: paginaSource }}
        />
      </Section>

      <Section title="API React">
        <PropsTable
          caption="Props de PageHeader"
          rows={[
            {
              name: 'title',
              type: 'ReactNode',
              required: true,
              description: 'O título da página: o único <h1>.',
            },
            { name: 'description', type: 'ReactNode', description: 'Frase de apoio sob o título.' },
            {
              name: 'breadcrumb',
              type: 'ReactNode',
              description: 'Um <Breadcrumb>, acima do título.',
            },
            {
              name: 'meta',
              type: 'ReactNode',
              description: 'Selos e informações curtas (situação, última atualização).',
            },
            {
              name: 'actions',
              type: 'ReactNode',
              description: 'Botões da página; o principal é o último (variant primary).',
            },
            {
              name: 'sticky',
              type: 'boolean',
              default: 'false',
              description: (
                <>
                  Fixa o cabeçalho no topo da área de rolagem (<code>.eds-page-header-sticky</code>
                  ). Veja a nota de acessibilidade.
                </>
              ),
            },
          ]}
        />
        <p>
          <code>Page</code>, <code>PageToolbar</code>, <code>PageBody</code> e{' '}
          <code>PageFooter</code> são contêineres simples (<code>div</code>, <code>div</code>,{' '}
          <code>div</code> e <code>footer</code>) que repassam <code>ref</code> e{' '}
          <code>className</code>.
        </p>
      </Section>

      <Section title="Classes CSS">
        <ClassTable
          caption="Classes do layout de página"
          rows={[
            {
              name: '.eds-page',
              effect: 'Contêiner da página: empilha os blocos com o espaçamento do tema.',
            },
            { name: '.eds-page-header', effect: 'Cabeçalho (<header>): trilha, título e ações.' },
            {
              name: '.eds-page-header-sticky',
              effect: 'Cabeçalho fixo no topo da área de rolagem.',
            },
            { name: '.eds-page-heading', effect: 'Grupo do título, da descrição e da meta.' },
            { name: '.eds-page-title', effect: 'O <h1>.' },
            { name: '.eds-page-description', effect: 'Descrição, em tom secundário.' },
            { name: '.eds-page-meta', effect: 'Selos e informações curtas.' },
            { name: '.eds-page-actions', effect: 'Botões; descem em contêiner estreito.' },
            { name: '.eds-page-toolbar', effect: 'Faixa de filtros e ferramentas.' },
            { name: '.eds-page-body', effect: 'Corpo da página.' },
            { name: '.eds-page-footer', effect: 'Rodapé: totais e paginação.' },
          ]}
        />
      </Section>

      <Section title="Acessibilidade">
        <ul className="docs-list">
          <li>
            <strong>Título:</strong> o <code>.eds-page-title</code> é o único{' '}
            <code>&lt;h1&gt;</code> da página; em um app de página única, mova o foco para ele ao
            trocar de rota.
          </li>
          <li>
            <strong>Cabeçalho fixo e foco (WCAG 2.4.11):</strong> o cabeçalho <code>sticky</code>{' '}
            pode cobrir o campo que recebe o foco por teclado. Dê{' '}
            <code>scroll-padding-block-start</code> à área que rola, igual à altura do cabeçalho (ou
            evite o cabeçalho fixo em páginas de formulário).
          </li>
          <li>
            <strong>Landmarks:</strong> <code>&lt;header&gt;</code> e <code>&lt;footer&gt;</code>{' '}
            dentro de <code>main</code> não viram landmarks de página, o que é o desejado; a toolbar
            com a barra de filtros expõe <code>role=&quot;search&quot;</code>.
          </li>
          <li>
            <strong>Estreito:</strong> as ações descem para baixo do título, sem rolagem horizontal
            a 320 px.
          </li>
        </ul>
      </Section>
    </>
  );
}
