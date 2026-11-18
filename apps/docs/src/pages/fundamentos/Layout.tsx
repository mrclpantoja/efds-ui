import { ClassTable } from '../../components/ClassTable';
import { CodeBlock } from '../../components/CodeBlock';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import Automatico from '../../examples/layout/auto';
import autoHtml from '../../examples/layout/auto.html?raw';
import autoSource from '../../examples/layout/auto.tsx?raw';
import GridColunas from '../../examples/layout/grid';
import gridHtml from '../../examples/layout/grid.html?raw';
import gridSource from '../../examples/layout/grid.tsx?raw';
import Responsivo from '../../examples/layout/responsivo';
import responsivoHtml from '../../examples/layout/responsivo.html?raw';
import responsivoSource from '../../examples/layout/responsivo.tsx?raw';
import Pilha from '../../examples/layout/stack';
import stackHtml from '../../examples/layout/stack.html?raw';
import stackSource from '../../examples/layout/stack.tsx?raw';

/** O Container só define largura e respiro: sem aparência, não há o que mostrar ao vivo. */
const containerHtml = `<main class="eds-container eds-container-lg">
  <h1 class="eds-text-h1">Clientes</h1>
  …
</main>`;

const containerReact = `import { Container } from '@eds-ui/react';

<Container as="main" size="lg">
  <h1 className="eds-text-h1">Clientes</h1>
  …
</Container>`;

const subgridHtml = `<div class="eds-grid">
  <div class="eds-col-span-12">…</div>
  <div class="eds-grid eds-grid-subgrid" role="group" aria-labelledby="endereco">
    <span id="endereco" class="eds-text-label">Endereço</span>
    <div class="eds-col-span-md-9">Logradouro</div>
    <div class="eds-col-span-md-3">Número</div>
  </div>
</div>`;

const gapType = '0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9';
const asType =
  "'div' | 'section' | 'article' | 'aside' | 'header' | 'footer' | 'main' | 'nav' | 'ul' | 'ol' | 'li' | 'span'";

export default function Layout() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Três peças estruturais, sem aparência própria: Container limita a largura da página, Grid
        divide o espaço em 12 colunas e Stack empilha itens com espaçamento uniforme. O Grid
        responde à largura do próprio contêiner, não à da janela.
      </p>

      <Section title="Container">
        <p>
          Largura máxima, centralização e respiro lateral. Nunca tem fundo, borda ou sombra (não é
          um Card). O padding lateral cresce com a janela e a largura máxima já o inclui.
        </p>
        <CodeBlock code={containerHtml} label="Container em HTML" />
        <CodeBlock code={containerReact} label="Container em React" />
        <PropsTable
          caption="Props de Container"
          rows={[
            {
              name: 'size',
              type: "'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'fluid'",
              default: "'xl'",
              description: 'Largura máxima: 640, 768, 1024, 1280, 1440px ou 100% (fluid).',
            },
            {
              name: 'flush',
              type: 'boolean',
              default: 'false',
              description: 'Remove o padding lateral (por exemplo, tabela de ponta a ponta).',
            },
            {
              name: 'as',
              type: asType,
              default: "'div'",
              description: 'Elemento renderizado. Use para ter o marco semântico certo.',
            },
          ]}
        />
      </Section>

      <Section title="Grid de 12 colunas">
        <p>
          Os filhos ocupam a linha inteira por padrão; <code>span</code> define quantas colunas cada
          um ocupa. As faixas <code>sm</code>, <code>md</code> e <code>lg</code> valem quando o{' '}
          <strong>grid</strong> tem 640, 768 e 1024px ou mais (mobile-first: cada faixa herda a
          anterior). Por usar container queries, o mesmo markup funciona na página, numa lateral ou
          num modal.
        </p>
        <Example
          title="Colunas"
          description="Oito mais quatro, depois três de quatro colunas."
          html={gridHtml}
          react={{ Component: GridColunas, source: gridSource }}
        />
        <Example
          title="Responde ao contêiner"
          description={
            <>
              O mesmo grupo de indicadores em dois quadros de largura fixa (
              <code>.docs-frame-wide</code> e <code>.docs-frame-narrow</code>, só deste site). Com
              768px ou mais, o grid mostra quatro colunas; entre 640 e 767px, duas; abaixo disso,
              uma. O painel estreito (320px) empilha mesmo com a janela larga, e a área larga
              encolhe junto com a janela.
            </>
          }
          html={responsivoHtml}
          react={{ Component: Responsivo, source: responsivoSource }}
        />
        <Example
          title="Colunas intrínsecas"
          description="Sem nenhum span: as colunas cabem com mínimo de 256px e quebram sozinhas."
          html={autoHtml}
          react={{ Component: Automatico, source: autoSource }}
        />
        <h3 className="eds-text-h3">Subgrid</h3>
        <p>
          Um item que também é grid pode herdar as trilhas do pai com <code>subgrid</code>, para
          alinhar o conteúdo aninhado às mesmas colunas. Não funciona em <code>fieldset</code>: use{' '}
          <code>div role=&quot;group&quot;</code> com nome acessível. Sem suporte do navegador,
          mantém 12 colunas próprias e continua funcional.
        </p>
        <CodeBlock code={subgridHtml} label="Subgrid em HTML" />
        <PropsTable
          caption="Props de Grid"
          rows={[
            {
              name: 'gap',
              type: gapType,
              description: (
                <>
                  Espaçamento da escala do core. Sem a prop: <code>space-4</code>, que acompanha a
                  densidade.
                </>
              ),
            },
            {
              name: 'auto',
              type: 'boolean',
              default: 'false',
              description: 'Colunas intrínsecas (auto-fit, mínimo de 256px).',
            },
            {
              name: 'subgrid',
              type: 'boolean',
              default: 'false',
              description: 'Para um Grid que também é item de outro: herda as trilhas do pai.',
            },
            {
              name: 'as',
              type: 'LayoutElement',
              default: "'div'",
              description: 'Elemento renderizado (mesma lista do Container).',
            },
          ]}
        />
        <PropsTable
          caption="Props de GridItem"
          rows={[
            {
              name: 'span',
              type: '1 a 12',
              description: 'Colunas ocupadas em qualquer largura do grid.',
            },
            {
              name: 'spanSm',
              type: '1 a 12',
              description: 'Colunas com o grid a partir de 640px.',
            },
            {
              name: 'spanMd',
              type: '1 a 12',
              description: 'Colunas com o grid a partir de 768px.',
            },
            {
              name: 'spanLg',
              type: '1 a 12',
              description: 'Colunas com o grid a partir de 1024px.',
            },
            {
              name: 'as',
              type: 'LayoutElement',
              default: "'div'",
              description: 'Elemento renderizado.',
            },
          ]}
        />
      </Section>

      <Section title="Stack">
        <p>
          Empilha os filhos com espaçamento uniforme (flexbox), sem margens avulsas. É vertical por
          padrão; <code>direction=&quot;row&quot;</code> alinha em linha e centraliza no eixo
          cruzado.
        </p>
        <p>
          Toda linha cujo conteúdo possa não caber a 320px precisa de <code>wrap</code> (
          <code>.eds-stack-wrap</code>); sem ele não há quebra e a página rola na horizontal,
          violando o reflow da WCAG 1.4.10.
        </p>
        <Example
          title="Barra de título e etiquetas"
          description="Linha com título à esquerda e ações à direita, e uma linha de etiquetas que quebra."
          html={stackHtml}
          react={{ Component: Pilha, source: stackSource }}
        />
        <PropsTable
          caption="Props de Stack"
          rows={[
            {
              name: 'direction',
              type: "'column' | 'row'",
              default: "'column'",
              description: 'Vertical (itens esticados) ou horizontal (itens centralizados).',
            },
            {
              name: 'align',
              type: "'start' | 'center' | 'end' | 'stretch' | 'baseline'",
              description: 'Eixo cruzado (align-items).',
            },
            {
              name: 'justify',
              type: "'start' | 'center' | 'end' | 'between'",
              description: 'Eixo principal (justify-content).',
            },
            {
              name: 'wrap',
              type: 'boolean',
              default: 'false',
              description:
                'Quebra linha quando não couber. Obrigatório em linhas que possam não caber a 320px.',
            },
            {
              name: 'gap',
              type: gapType,
              description: (
                <>
                  Espaçamento da escala do core. Sem a prop: <code>space-4</code>.
                </>
              ),
            },
            {
              name: 'as',
              type: 'LayoutElement',
              default: "'div'",
              description: 'Elemento renderizado.',
            },
          ]}
        />
      </Section>

      <Section title="Classes CSS">
        <ClassTable
          caption="Classes de layout"
          rows={[
            {
              name: '.eds-container',
              effect: 'Largura máxima xl (1280px), centralizado, com padding lateral responsivo.',
            },
            {
              name: '.eds-container-{sm|md|lg|xl|2xl}',
              effect: 'Largura máxima de 640, 768, 1024, 1280 ou 1440px.',
            },
            { name: '.eds-container-fluid', effect: 'Ocupa 100% da largura disponível.' },
            { name: '.eds-container-flush', effect: 'Remove o padding lateral.' },
            {
              name: '.eds-grid',
              effect: '12 colunas; é um query container. Filhos ocupam a linha inteira por padrão.',
            },
            {
              name: '.eds-col-span-{1..12}',
              effect: 'Colunas ocupadas pelo item, em qualquer largura.',
            },
            {
              name: '.eds-col-span-{sm|md|lg}-{1..12}',
              effect: 'Idem, quando o grid tem 640, 768 ou 1024px ou mais.',
            },
            {
              name: '.eds-grid-auto',
              effect: 'Colunas intrínsecas: auto-fit com mínimo de 256px.',
            },
            {
              name: '.eds-grid-subgrid',
              effect: 'Num item que também é .eds-grid: herda as trilhas do grid pai.',
            },
            { name: '.eds-stack', effect: 'Vertical, itens esticados, espaçamento padrão.' },
            { name: '.eds-stack-row', effect: 'Horizontal, itens centralizados no eixo cruzado.' },
            { name: '.eds-stack-wrap', effect: 'Quebra linha quando não couber.' },
            {
              name: '.eds-stack-align-{start|center|end|stretch|baseline}',
              effect: 'Alinhamento no eixo cruzado.',
            },
            {
              name: '.eds-stack-justify-{start|center|end|between}',
              effect: 'Distribuição no eixo principal.',
            },
            {
              name: '.eds-stack-grow',
              effect:
                'No item: ocupa o espaço que sobra; com wrap, quebra quando não cabe a base de 256px.',
            },
            {
              name: '.eds-gap-{0..9}',
              effect:
                'Espaçamento entre filhos de .eds-grid e .eds-stack (escala de espaço; 4 acompanha a densidade).',
            },
          ]}
        />
      </Section>

      <Section title="Acessibilidade">
        <ul className="docs-list">
          <li>
            <strong>Estrutura:</strong> as três peças não têm semântica própria. Use <code>as</code>{' '}
            para o elemento certo (<code>main</code>, <code>nav</code>, <code>ul</code>); um único{' '}
            <code>main</code> por página.
          </li>
          <li>
            <strong>Reflow (WCAG 1.4.10):</strong> sem rolagem horizontal a 320px. Use{' '}
            <code>wrap</code> nas linhas do Stack que possam não caber; o Grid empilha sozinho em
            contêineres estreitos.
          </li>
          <li>
            <strong>Ordem:</strong> os spans mudam a largura, não a ordem do DOM; mantenha a ordem
            de leitura e de Tab coerente com a visual.
          </li>
        </ul>
      </Section>
    </>
  );
}
