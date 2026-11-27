import { Stack } from '@efds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { CodeBlock } from '../../components/CodeBlock';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import { toHref } from '../../router';
import Estatica from '../../examples/sidebar/estatica';
import estaticaHtml from '../../examples/sidebar/estatica.html?raw';
import estaticaSource from '../../examples/sidebar/estatica.tsx?raw';
import Contador from '../../examples/sidebar/contador';
import contadorHtml from '../../examples/sidebar/contador.html?raw';
import contadorSource from '../../examples/sidebar/contador.tsx?raw';
import colapsavelSource from '../../examples/sidebar/colapsavel.tsx?raw';

export default function SidebarPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Navegação principal da aplicação, em coluna, com seções e um item atual. Responde à largura
        do app shell: expandida, compacta (só ícones) ou off-canvas em telas estreitas.
      </p>

      <UseCases
        use={[
          'Para a navegação principal de uma aplicação com várias áreas (ERP, CRM, painéis).',
          'Dentro do app shell, onde ela se adapta sozinha à largura.',
        ]}
        avoid={[
          'Em portais e sites com poucas seções: use a Navbar.',
          'Para alternar visões do mesmo conteúdo: use Tabs.',
          'Para filtros e ações da tela: use Drawer ou a própria página.',
        ]}
      />

      <Section title="Exemplos">
        <p>
          A Sidebar vive dentro do app shell, que ocupa a tela inteira. Veja-a funcionando aqui no
          próprio site de documentação (o menu à esquerda é uma Sidebar; reduza a janela para vê-la
          virar off-canvas abaixo de 768px) e nas telas de referência do playground (
          <code>#/dashboard</code>, <code>#/listagem</code> e <code>#/formulario</code>). O exemplo
          abaixo mostra a sidebar isolada, fora do app shell, onde fica sempre expandida. O menu
          deste site usa <code>.eds-sidebar-full</code>, que o mantém expandido entre 768 e 1023px
          (seus itens são só texto e não caberiam compactos); no React, passe-o em{' '}
          <code>className</code>.
        </p>
        <Example
          title="Sidebar isolada"
          description="Marca, seções, item atual e rodapé. Fora de .eds-app não há faixas responsivas nem off-canvas."
          html={estaticaHtml}
          react={{ Component: Estatica, source: estaticaSource }}
        />
        <Example
          title="Item com contador"
          description={
            <>
              Contador ao fim do item (&quot;3 vencidas&quot;), com aparência de Badge discreto. Na
              sidebar compacta vira um ponto sobre o ícone; o número continua no nome acessível do
              link (&quot;Contas a pagar 3 vencidas&quot;), pelo texto oculto. No React, use{' '}
              <code>badge</code> e <code>badgeLabel</code>.
            </>
          }
          html={contadorHtml}
          react={{ Component: Contador, source: contadorSource }}
        />
        <h3 className="eds-text-h4">Colapso controlado, dentro do app shell</h3>
        <p className="docs-muted">
          Código para o React: o botão de colapsar (rótulo fixo, <code>aria-expanded</code> e{' '}
          <code>aria-controls</code>) já vem na sidebar. Controle <code>collapsed</code> para
          persistir a escolha. No HTML, o{' '}
          <a href={toHref('/comecar/comportamento')}>@efds-ui/behavior</a> liga um botão com{' '}
          <code>data-eds-sidebar-collapse</code> dentro da <code>.eds-sidebar</code>: ele alterna{' '}
          <code>data-collapsed</code> e <code>aria-expanded</code> (o exemplo HTML acima tem esse
          botão; sem o pacote, ponha <code>data-collapsed</code> você mesmo). Dentro do app shell, o
          mesmo pacote cuida do off-canvas: <code>inert</code> no resto da tela, foco e fechar ao
          navegar.
        </p>
        <CodeBlock code={colapsavelSource} label="Código React: colapso controlado" />
      </Section>

      <Section title="API React">
        <p>
          <code>Sidebar</code> renderiza <code>&lt;nav popover&gt;</code>, aceita os atributos
          nativos, <code>ref</code> e <code>className</code>. Dentro de <code>AppShell</code>{' '}
          sincroniza o gatilho, põe o resto da tela em <code>inert</code> quando aberta como
          off-canvas e cuida do foco. Fora do shell funciona como sidebar estática.
        </p>
        <PropsTable
          caption="Props de Sidebar"
          rows={[
            {
              name: 'aria-label',
              type: 'string',
              default: "'Principal'",
              description: 'Nome do landmark de navegação.',
            },
            {
              name: 'brandIcon',
              type: 'ReactNode',
              description: 'Ícone da marca, no cabeçalho.',
            },
            {
              name: 'brandLabel',
              type: 'ReactNode',
              description: 'Nome da marca; some na sidebar compacta, por CSS.',
            },
            {
              name: 'children',
              type: 'ReactNode',
              description: (
                <>
                  <code>SidebarSection</code> e <code>SidebarItem</code>.
                </>
              ),
            },
            {
              name: 'footer',
              type: 'ReactNode',
              description: 'Itens do rodapé, antes do botão de colapsar.',
            },
            {
              name: 'collapsible',
              type: 'boolean',
              default: 'true',
              description: 'Mostra o botão de colapsar no rodapé.',
            },
            {
              name: 'collapsed / defaultCollapsed',
              type: 'boolean',
              default: 'false',
              description: 'Estado colapsado, controlado ou não.',
            },
            {
              name: 'onCollapsedChange',
              type: '(collapsed: boolean) => void',
              description: 'Chamado ao acionar o botão de colapsar.',
            },
            {
              name: 'texts',
              type: 'Partial<SidebarTexts>',
              description: (
                <>
                  Textos internos: <code>label</code> (&quot;Principal&quot;), o nome do landmark
                  quando não há <code>aria-label</code>; <code>collapse</code> (&quot;Menu
                  lateral&quot;), o rótulo fixo do botão de colapsar, que não muda com o estado.
                </>
              ),
            },
            {
              name: 'collapseIcon',
              type: 'ReactNode',
              description: 'Ícone do botão de colapsar.',
            },
          ]}
        />
        <PropsTable
          caption="Props de SidebarSection"
          rows={[
            {
              name: 'title',
              type: 'ReactNode',
              description: 'Título do grupo de itens.',
            },
          ]}
        />
        <PropsTable
          caption="Props de SidebarItem"
          rows={[
            {
              name: 'href',
              type: 'string',
              description: (
                <>
                  Com <code>href</code> renderiza <code>&lt;a&gt;</code> (e fecha o off-canvas ao
                  navegar); sem, <code>&lt;button type=&quot;button&quot;&gt;</code>.
                </>
              ),
            },
            {
              name: 'icon',
              type: 'ReactNode',
              description: 'Ícone decorativo.',
            },
            {
              name: 'current',
              type: 'boolean',
              default: 'false',
              description: 'Página atual: aria-current="page".',
            },
            {
              name: 'badge',
              type: 'ReactNode',
              description:
                'Contador ao fim do item (ex.: 3). Na sidebar compacta vira um ponto sobre o ícone. Ausente (ou false/null), não renderiza; 0 aparece.',
            },
            {
              name: 'badgeLabel',
              type: 'ReactNode',
              description:
                'Complemento do contador no nome acessível, oculto na tela (ex.: "vencidas"), para o link ler "Contas a pagar 3 vencidas".',
            },
          ]}
        />
      </Section>

      <Section title="Classes CSS">
        <p>
          O estado vem do HTML: <code>aria-current</code>, <code>data-collapsed</code> e{' '}
          <code>popover</code>. As faixas compacta e off-canvas valem só para a sidebar filha direta
          de <code>.eds-app</code> e leem a largura desse contêiner, nunca a viewport.
        </p>
        <ClassTable
          caption="Classes e atributos de Sidebar"
          rows={[
            {
              name: '.eds-sidebar',
              effect:
                'O <nav>: coluna com a largura do layout. Fora de .eds-app fica expandida; no shell, ≥1024px expandida, 768 a 1023px compacta (expandida com .eds-sidebar-full), abaixo de 768px off-canvas.',
            },
            {
              name: '.eds-sidebar-full',
              effect:
                'Só na sidebar do shell: mantém-na expandida entre 768 e 1023px, em vez de compacta. Abaixo de 768px continua off-canvas. Use quando os itens são só texto.',
            },
            { name: '.eds-sidebar-header', effect: 'Marca: ícone e nome.' },
            {
              name: '.eds-sidebar-close',
              effect:
                'Botão de fechar do off-canvas (com .eds-button-ghost.eds-button-icon, popovertarget e popovertargetaction="hide", aria-label "Fechar menu"): no fim do cabeçalho, só aparece com o menu aberto no mobile. Funciona sem JS. O React o põe sozinho (texts.close).',
            },
            { name: '.eds-sidebar-section', effect: 'Grupo de itens.' },
            { name: '.eds-sidebar-section-title', effect: 'Título do grupo; some na compacta.' },
            {
              name: '.eds-sidebar-item',
              effect: 'Link ou botão de navegação, com ícone e rótulo.',
            },
            {
              name: '.eds-sidebar-label',
              effect:
                'Rótulo. Na compacta fica transparente e recortado, mas continua sendo o nome acessível; no hover e no foco vira um tooltip em CSS.',
            },
            {
              name: '.eds-sidebar-badge',
              effect:
                'Contador dentro do .eds-sidebar-item, depois do .eds-sidebar-label. Expandida: pílula discreta no fim do item. Compacta: ponto sobre o ícone. Ponha o complemento do nome em <span class="eds-visually-hidden"> dentro dele.',
            },
            { name: '.eds-sidebar-footer', effect: 'Itens do rodapé e botão de colapsar.' },
            {
              name: '.eds-sidebar-item[aria-current="page"]',
              effect: 'Item atual: fundo e texto na cor de ação.',
            },
            {
              name: '[data-collapsed]',
              effect: 'Compacta à mão: 72px, só ícones.',
            },
            {
              name: '[popover]',
              effect:
                'Abaixo de 768px (no shell), vira off-canvas no top layer, sempre expandido, com backdrop.',
            },
          ]}
        />
      </Section>

      <Section title="Acessibilidade">
        <Stack gap={3}>
          <ul className="docs-list">
            <li>
              <strong>Landmark:</strong> <code>&lt;nav&gt;</code> com <code>aria-label</code>{' '}
              (padrão &quot;Principal&quot;); item atual com{' '}
              <code>aria-current=&quot;page&quot;</code>.
            </li>
            <li>
              <strong>Off-canvas:</strong> o popover não é modal. Ao abrir, o React marca header,
              main e skip link com <code>inert</code>, sincroniza <code>aria-expanded</code> do
              gatilho e leva o foco ao item atual. Ao fechar, devolve o foco ao gatilho (ou ao
              conteúdo, se houve navegação), porque o retorno nativo falha com o gatilho inerte. Em
              SPA, <code>SidebarItem</code> com <code>href</code> fecha o painel ao navegar.
            </li>
            <li>
              <strong>Colapsar:</strong> botão de rótulo fixo, com <code>aria-expanded</code> e{' '}
              <code>aria-controls</code> (aponta para a sidebar); sem <code>title</code> no modo
              expandido. Abaixo de 1024px o botão some, porque o contêiner já compacta.
            </li>
            <li>
              <strong>Compacta:</strong> o rótulo continua o nome acessível do link; o tooltip é CSS
              puro e aparece também no foco por teclado.
            </li>
            <li>
              <strong>Contador:</strong> o número entra no nome acessível do link (texto visível ou{' '}
              <code>.eds-visually-hidden</code>); na compacta o ponto é só pista visual, com a fonte
              zerada, e o valor continua sendo lido. Não use <code>display: none</code> nele.
            </li>
            <li>
              <strong>Tooltip e rolagem do trilho:</strong> o rótulo-tooltip é ancorado ao item (CSS
              anchor positioning) e acompanha o trilho quando ele rola. Sem{' '}
              <code>anchor-scope</code> (Firefox), o rótulo fica na posição estática e o CSS o
              compensa pelo <code>scrollTop</code>, publicado em <code>--_sidebar-scroll</code> pelo
              JS (behavior ou React); sem JS, o tooltip desloca na vertical se o trilho rolar (telas
              curtas, 768 a 1023px).
            </li>
            <li>
              <strong>O consumidor deve garantir:</strong> ícones decorativos (o item já os marca) e
              rótulos claros; um único <code>&lt;main&gt;</code> por página.
            </li>
          </ul>
        </Stack>
      </Section>
    </>
  );
}
