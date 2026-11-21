import { Alert, Stack } from '@efds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import { toHref } from '../../router';
import Confirmacao from '../../examples/modal/confirmacao';
import confirmacaoHtml from '../../examples/modal/confirmacao.html?raw';
import confirmacaoSource from '../../examples/modal/confirmacao.tsx?raw';
import Formulario from '../../examples/modal/formulario';
import formularioHtml from '../../examples/modal/formulario.html?raw';
import formularioSource from '../../examples/modal/formulario.tsx?raw';
import Rolavel from '../../examples/modal/rolavel';
import rolavelSource from '../../examples/modal/rolavel.tsx?raw';

export default function ModalPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Janela que interrompe o fluxo para pedir uma confirmação ou uma entrada curta. Usa o{' '}
        <code>&lt;dialog&gt;</code> nativo: foco preso, fundo inerte, Esc e retorno do foco vêm do
        navegador.
      </p>

      <UseCases
        use={[
          'Para confirmar uma ação destrutiva ou irreversível.',
          'Para um formulário curto que não justifica uma página própria.',
          'Quando o usuário precisa decidir antes de seguir com o resto da tela.',
        ]}
        avoid={[
          'Para mensagens que não exigem decisão: use Alert ou Toast.',
          'Para formulários longos ou com várias etapas: use uma página.',
          'Para filtros e detalhes que acompanham a tela: use Drawer.',
          'Para abrir outro modal por cima: reorganize o fluxo.',
        ]}
      />

      <Section title="Exemplos">
        <Alert variant="info" title="HTML: precisa do @efds-ui/behavior">
          <p>
            No HTML, o diálogo só é modal quando aberto com <code>showModal()</code>. O pacote{' '}
            <a href={toHref('/comecar/comportamento')}>@efds-ui/behavior</a> faz isso por atributos:{' '}
            <code>data-eds-open=&quot;ID&quot;</code> no botão que abre, <code>data-eds-close</code>{' '}
            em quem fecha e <code>data-eds-backdrop=&quot;static&quot;</code> para o clique fora não
            fechar. Sem ele, chame <code>showModal()</code> você mesmo. O preview HTML abaixo está
            ligado a ele; no React, <code>open</code> e <code>onClose</code> cuidam de tudo.
          </p>
        </Alert>
        <Example
          title="Confirmação"
          description="Modal pequeno, sem formulário. O foco inicial vai para Cancelar (ação segura)."
          html={confirmacaoHtml}
          react={{ Component: Confirmacao, source: confirmacaoSource }}
        />
        <Example
          title="Formulário"
          description="Os botões do rodapé usam form= para pertencer ao formulário do corpo. O primeiro campo recebe o foco inicial; o backdrop não fecha, para não perder dados."
          html={formularioHtml}
          react={{ Component: Formulario, source: formularioSource }}
        />
        <Example
          title="Grande, com corpo rolável"
          description="Cabeçalho e rodapé ficam visíveis enquanto o corpo rola. Quando há rolagem, o corpo vira uma região focável por teclado."
          react={{ Component: Rolavel, source: rolavelSource }}
        />
      </Section>

      <Section title="API React">
        <p>
          <code>Modal</code> é controlado: <code>open</code> abre (<code>showModal()</code>) e fecha
          (<code>close()</code>) o diálogo. Esc, o botão Fechar e o backdrop chamam{' '}
          <code>onClose</code>, que é um <em>pedido</em>: o componente não se fecha sozinho, quem
          controla passa <code>open={'{false}'}</code>. Aceita os atributos nativos de{' '}
          <code>&lt;dialog&gt;</code> (exceto <code>open</code>, <code>title</code>,{' '}
          <code>onClose</code>, <code>onCancel</code> e <code>aria-labelledby</code>),{' '}
          <code>ref</code> e <code>className</code>.
        </p>
        <PropsTable
          caption="Props de Modal"
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
                  Título do diálogo. Nomeia o diálogo via <code>aria-labelledby</code>.
                </>
              ),
            },
            {
              name: 'size',
              type: "'sm' | 'md' | 'lg' | 'full'",
              default: "'md'",
              description:
                'Largura. O padrão não emite classe; full ocupa a tela toda (.eds-modal-full).',
            },
            {
              name: 'footer',
              type: 'ReactNode',
              description: 'Ações do rodapé. Omitido, o rodapé não é renderizado.',
            },
            {
              name: 'texts',
              type: 'Partial<ModalTexts>',
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
                  <code>data-autofocus</code> e, na falta, o foco nativo (o botão Fechar).{' '}
                  <code>autoFocus</code> do React só age na montagem, por isso não serve.
                </>
              ),
            },
          ]}
        />
      </Section>

      <Section title="Classes CSS">
        <p>
          O HTML abre o diálogo com <code>showModal()</code> e fecha com{' '}
          <code>&lt;form method=&quot;dialog&quot;&gt;</code>. O estado vem do atributo{' '}
          <code>[open]</code>.
        </p>
        <ClassTable
          caption="Classes e atributos de Modal"
          rows={[
            {
              name: '.eds-modal',
              effect:
                'O <dialog>: centralizado, largura 35rem (limitada à tela), raio grande, sombra, entrada e saída com opacidade e deslocamento.',
            },
            { name: '.eds-modal-sm / .eds-modal-lg', effect: 'Largura 25rem ou 45rem.' },
            {
              name: '.eds-modal-full',
              effect:
                'Tela cheia: sem margem, raio nem borda abaixo de 768px; acima, com a margem do diálogo. Cabeçalho e rodapé fixos, só o corpo rola.',
            },
            { name: '.eds-modal-header', effect: 'Título à esquerda e botão Fechar à direita.' },
            { name: '.eds-modal-title', effect: 'Tipografia de título (h3).' },
            {
              name: '.eds-modal-body',
              effect: 'Conteúdo; rola sozinho quando o diálogo ultrapassa a altura da tela.',
            },
            {
              name: '.eds-modal-footer',
              effect: 'Ações alinhadas ao fim, com borda no topo (a única borda de divisão).',
            },
            { name: '[open]', effect: 'Diálogo aberto.' },
            {
              name: 'html:has(.eds-modal:modal)',
              effect: 'Trava a rolagem da página enquanto o modal está aberto.',
            },
          ]}
        />
      </Section>

      <Section title="Eventos (HTML)">
        <ClassTable
          caption="Eventos do @efds-ui/behavior"
          headers={['Evento', 'Quando']}
          rows={[
            {
              name: 'eds:modal-open',
              effect:
                'O diálogo abre (gatilho data-eds-open ou showModal() do código). detail: { trigger } (null quando aberto por código).',
            },
            {
              name: 'eds:modal-close',
              effect: 'O diálogo fecha (Esc, botão, fundo ou close()). detail: { returnValue }.',
            },
          ]}
        />
      </Section>

      <Section title="Acessibilidade">
        <Stack gap={3}>
          <ul className="docs-list">
            <li>
              <strong>Teclado:</strong> o navegador prende o foco no diálogo, deixa o fundo inerte,
              fecha com Esc e devolve o foco a quem abriu. No React, Esc vira <code>onClose</code>;
              se quem controla mantiver <code>open</code>, o diálogo permanece aberto.
            </li>
            <li>
              <strong>Nome:</strong> <code>aria-labelledby</code> aponta para o título. Um corpo
              informativo curto pode ser ligado com <code>aria-describedby</code>.
            </li>
            <li>
              <strong>Foco inicial:</strong> em formulário, no primeiro campo (
              <code>data-autofocus</code>); em confirmação destrutiva, em Cancelar (
              <code>initialFocus</code>); informativo: no Fechar.
            </li>
            <li>
              <strong>Backdrop (WCAG 2.5.2):</strong> só fecha se o ponteiro desceu <em>e</em> subiu
              no próprio diálogo; arrastar uma seleção de texto de dentro para fora não fecha.
            </li>
            <li>
              <strong>Corpo rolável:</strong> recebe <code>tabindex=&quot;0&quot;</code>,{' '}
              <code>role=&quot;region&quot;</code> e <code>aria-labelledby</code> somente quando
              rola de fato, para o teclado alcançar o conteúdo.
            </li>
            <li>
              <strong>Forçado pelo tipo:</strong> <code>title</code>, <code>open</code> e{' '}
              <code>onClose</code> são obrigatórios. O botão Fechar tem nome acessível substituível
              (<code>texts.close</code>).
            </li>
            <li>
              <strong>O consumidor deve garantir:</strong> confirmar antes de fechar um formulário
              alterado (ou usar <code>closeOnBackdrop=false</code>); botões com texto de ação claro;
              nunca empilhar modais.
            </li>
          </ul>
        </Stack>
      </Section>
    </>
  );
}
