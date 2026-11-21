import { Alert, Stack } from '@efds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import { toHref } from '../../router';
import Filtros from '../../examples/drawer/filtros';
import filtrosHtml from '../../examples/drawer/filtros.html?raw';
import filtrosSource from '../../examples/drawer/filtros.tsx?raw';
import Menu from '../../examples/drawer/menu';
import menuHtml from '../../examples/drawer/menu.html?raw';
import menuSource from '../../examples/drawer/menu.tsx?raw';

export default function DrawerPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Painel lateral que abre sobre a tela, para tarefas secundárias que não pedem uma página:
        filtros, detalhes, um menu. Tem o mesmo comportamento do Modal, ancorado na borda final
        (padrão) ou inicial.
      </p>

      <UseCases
        use={[
          'Para filtros e opções que acompanham uma listagem.',
          'Para ver ou editar detalhes de um item sem perder a lista de fundo.',
          'Para a navegação principal em telas estreitas (borda inicial).',
        ]}
        avoid={[
          'Para confirmar uma decisão rápida: use Modal.',
          'Para conteúdo que o usuário precisa ver o tempo todo: deixe na própria tela.',
          'Para a navegação do app shell: a Sidebar já vira off-canvas sozinha em telas estreitas.',
        ]}
      />

      <Section title="Exemplos">
        <Alert variant="info" title="HTML: precisa do @efds-ui/behavior">
          <p>
            No HTML, o diálogo só é modal quando aberto com <code>showModal()</code>. O pacote{' '}
            <a href={toHref('/comecar/comportamento')}>@efds-ui/behavior</a> faz isso por atributos:{' '}
            <code>data-eds-open=&quot;ID&quot;</code> no botão e <code>data-autofocus</code> no
            elemento que recebe o foco. Sem ele, chame <code>showModal()</code> você mesmo. O
            preview HTML abaixo está ligado a ele.
          </p>
        </Alert>
        <Example
          title="Filtros (borda final)"
          description="Os botões do rodapé usam form= para pertencer ao formulário do corpo. O primeiro campo recebe o foco inicial."
          html={filtrosHtml}
          react={{ Component: Filtros, source: filtrosSource }}
        />
        <Example
          title="Menu (borda inicial)"
          description="placement=start ancora o painel no início. Sem formulário, o foco inicial fica no botão Fechar."
          html={menuHtml}
          react={{ Component: Menu, source: menuSource }}
        />
      </Section>

      <Section title="API React">
        <p>
          <code>Drawer</code> é controlado, como o Modal: <code>open</code> abre e fecha o{' '}
          <code>&lt;dialog&gt;</code>, e Esc, o botão Fechar e o backdrop chamam{' '}
          <code>onClose</code>, um pedido que quem controla atende passando{' '}
          <code>open={'{false}'}</code>. Aceita os atributos nativos de <code>&lt;dialog&gt;</code>{' '}
          (exceto <code>open</code>, <code>title</code>, <code>onClose</code>, <code>onCancel</code>{' '}
          e <code>aria-labelledby</code>), <code>ref</code> e <code>className</code>.
        </p>
        <PropsTable
          caption="Props de Drawer"
          rows={[
            {
              name: 'open',
              type: 'boolean',
              required: true,
              description: 'Abertura controlada.',
            },
            {
              name: 'onClose',
              type: '() => void',
              required: true,
              description: 'Pedido de fechamento (Esc, botão Fechar, backdrop).',
            },
            {
              name: 'title',
              type: 'ReactNode',
              required: true,
              description: (
                <>
                  Título do painel. Nomeia o diálogo via <code>aria-labelledby</code>.
                </>
              ),
            },
            {
              name: 'placement',
              type: "'start' | 'end'",
              default: "'end'",
              description: 'Borda de ancoragem. No padrão, a borda final (direita em LTR).',
            },
            {
              name: 'footer',
              type: 'ReactNode',
              description: 'Ações do rodapé. Omitido, o rodapé não é renderizado.',
            },
            {
              name: 'texts',
              type: 'Partial<DrawerTexts>',
              description: (
                <>
                  Textos internos: <code>close</code> (&quot;Fechar&quot;), o nome acessível do
                  botão de fechar.
                </>
              ),
            },
            {
              name: 'closeOnBackdrop',
              type: 'boolean',
              default: 'true',
              description: (
                <>
                  Fecha ao clicar no backdrop, só se <code>pointerdown</code> e <code>click</code>{' '}
                  ocorreram no próprio diálogo. Em formulário com dados a perder, use{' '}
                  <code>false</code>.
                </>
              ),
            },
            {
              name: 'initialFocus',
              type: 'RefObject<HTMLElement | null>',
              description: (
                <>
                  Elemento que recebe o foco ao abrir. Sem a prop, vale o elemento com{' '}
                  <code>data-autofocus</code> e, na falta, o foco nativo (o botão Fechar).
                </>
              ),
            },
          ]}
        />
      </Section>

      <Section title="Classes CSS">
        <p>
          O HTML abre o painel com <code>showModal()</code> e fecha com{' '}
          <code>&lt;form method=&quot;dialog&quot;&gt;</code>. O estado vem do atributo{' '}
          <code>[open]</code>.
        </p>
        <ClassTable
          caption="Classes e atributos de Drawer"
          rows={[
            {
              name: '.eds-drawer',
              effect:
                'O <dialog>: altura total da tela, ancorado na borda final, sombra, entrada e saída deslizando. Largura de 100% abaixo de 640px e fluida entre 360 e 480px acima.',
            },
            { name: '.eds-drawer-start', effect: 'Ancora o painel na borda inicial.' },
            { name: '.eds-drawer-header', effect: 'Título à esquerda e botão Fechar à direita.' },
            { name: '.eds-drawer-title', effect: 'Tipografia de título.' },
            {
              name: '.eds-drawer-body',
              effect: 'Conteúdo; rola sozinho quando ultrapassa a altura da tela.',
            },
            {
              name: '.eds-drawer-footer',
              effect: 'Ações do rodapé, com borda no topo (a única borda de divisão).',
            },
            { name: '[open]', effect: 'Painel aberto.' },
          ]}
        />
      </Section>

      <Section title="Eventos (HTML)">
        <ClassTable
          caption="Eventos do @efds-ui/behavior"
          headers={['Evento', 'Quando']}
          rows={[
            {
              name: 'eds:drawer-open',
              effect:
                'O Drawer abre (gatilho data-eds-open ou showModal() do código). detail: { trigger } (null quando aberto por código).',
            },
            {
              name: 'eds:drawer-close',
              effect: 'O Drawer fecha (Esc, botão, fundo ou close()). detail: { returnValue }.',
            },
          ]}
        />
      </Section>

      <Section title="Acessibilidade">
        <Stack gap={3}>
          <ul className="docs-list">
            <li>
              <strong>Teclado:</strong> como no Modal, o navegador prende o foco, deixa o fundo
              inerte, fecha com Esc e devolve o foco a quem abriu. No React, Esc vira{' '}
              <code>onClose</code>.
            </li>
            <li>
              <strong>Nome:</strong> <code>aria-labelledby</code> aponta para o título.
            </li>
            <li>
              <strong>Backdrop (WCAG 2.5.2):</strong> só fecha se o ponteiro desceu <em>e</em> subiu
              no próprio diálogo.
            </li>
            <li>
              <strong>Corpo rolável:</strong> recebe <code>tabindex=&quot;0&quot;</code>,{' '}
              <code>role=&quot;region&quot;</code> e <code>aria-labelledby</code> somente quando
              rola de fato.
            </li>
            <li>
              <strong>Forçado pelo tipo:</strong> <code>title</code>, <code>open</code> e{' '}
              <code>onClose</code> são obrigatórios; o rótulo do botão Fechar é substituível.
            </li>
            <li>
              <strong>O consumidor deve garantir:</strong> foco inicial no primeiro campo quando há
              formulário (<code>data-autofocus</code>); confirmação ao fechar um formulário
              alterado; abaixo de 640px o painel ocupa a largura toda, então o botão Fechar deve
              continuar visível.
            </li>
          </ul>
        </Stack>
      </Section>
    </>
  );
}
