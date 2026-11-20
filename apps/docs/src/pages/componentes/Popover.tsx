import { Alert } from '@eds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import { toHref } from '../../router';
import Basico from '../../examples/popover/basico';
import basicoHtml from '../../examples/popover/basico.html?raw';
import basicoSource from '../../examples/popover/basico.tsx?raw';

export default function PopoverPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Painel pequeno que se abre junto de um botão, com título, texto e até ações. Usa a Popover
        API nativa: clique fora e Esc fecham sem JavaScript.
      </p>

      <UseCases
        use={[
          'Para detalhes de um item sem sair da tela (resumo de pedido, explicação de uma regra).',
          'Para conteúdo curto com um ou dois botões.',
        ]}
        avoid={[
          'Para dica de uma linha sem ação: use Tooltip.',
          'Para uma lista de comandos: use Dropdown.',
          'Para decisões que bloqueiam o fluxo ou formulários longos: use Modal.',
        ]}
      />

      <Section title="Exemplos">
        <Example
          title="Detalhes com ações"
          description="Clique no botão. Esc ou clique fora fecham e o foco volta ao botão; Tab percorre o conteúdo na sequência natural. No React, actions como função recebe o id do painel para o botão Fechar nativo."
          html={basicoHtml}
          react={{ Component: Basico, source: basicoSource }}
        />
      </Section>

      <Section title="HTML puro">
        <Alert variant="info" title="Nativo, com o behavior para posição e foco">
          <p>
            O botão usa <code>popovertarget</code> e o painel <code>popover</code> (modo{' '}
            <code>auto</code>). Com <code>data-eds-popover</code> no botão, o{' '}
            <a href={toHref('/comecar/comportamento')}>@eds-ui/behavior</a> posiciona o painel (
            <code>--_popover-x</code> e <code>--_popover-y</code>, já com folga e dentro da
            viewport), sincroniza <code>aria-expanded</code> e devolve o foco ao botão ao fechar. O
            valor do atributo pede o lado (<code>data-eds-popover=&quot;top&quot;</code>;{' '}
            <code>bottom</code> por padrão). Eventos no painel: <code>eds:popover-open</code> e{' '}
            <code>eds:popover-close</code>, com <code>detail.trigger</code>.
          </p>
        </Alert>
      </Section>

      <Section title="API React">
        <PropsTable
          caption="Props de Popover"
          rows={[
            {
              name: 'trigger',
              type: 'ReactElement',
              required: true,
              description: (
                <>
                  O botão que abre (Button). Recebe <code>popoverTarget</code>,{' '}
                  <code>aria-expanded</code> e <code>data-eds-popover</code>.
                </>
              ),
            },
            {
              name: 'title / aria-label',
              type: 'ReactNode / string',
              required: true,
              description: (
                <>
                  O painel precisa de nome: <code>title</code> visível (um <code>&lt;h2&gt;</code>{' '}
                  que rotula o painel) ou <code>aria-label</code>. O tipo exige um dos dois.
                </>
              ),
            },
            {
              name: 'placement',
              type: "'top' | 'bottom' | 'start' | 'end'",
              default: "'bottom'",
              description: 'Lado preferido; vira quando não cabe.',
            },
            {
              name: 'open / onOpenChange',
              type: 'boolean / (open: boolean) => void',
              description:
                'Abertura controlada por código (showPopover/hidePopover). onOpenChange avisa também Esc e clique fora.',
            },
            {
              name: 'actions',
              type: 'ReactNode | ({ popoverId }) => ReactNode',
              description: 'Botões do rodapé (.eds-popover-actions).',
            },
          ]}
        />
      </Section>

      <Section title="Classes CSS">
        <ClassTable
          caption="Classes e atributos do Popover"
          rows={[
            { name: '.eds-popover', effect: 'O painel (popover="auto"), com superfície elevada.' },
            { name: '.eds-popover-title', effect: 'Título (h2) que nomeia o painel.' },
            { name: '.eds-popover-actions', effect: 'Linha de botões no rodapé.' },
            {
              name: '--_popover-x, --_popover-y',
              effect: 'Canto superior esquerdo final do painel, calculado pelo JS.',
            },
            { name: '[data-placement]', effect: 'Lado em uso; só escolhe a direção da animação.' },
          ]}
        />
      </Section>

      <Section title="Acessibilidade">
        <ul className="docs-list">
          <li>
            <strong>Teclado:</strong> Enter ou Espaço no botão abrem; Esc fecha e o foco volta ao
            botão; Tab segue pelo conteúdo do painel, que vem logo depois do botão na ordem natural.
          </li>
          <li>
            <strong>ARIA:</strong> <code>aria-expanded</code> no botão (mantido pelo behavior);
            painel com <code>role="dialog"</code> (não modal), nomeado por{' '}
            <code>aria-labelledby</code> (o título) ou <code>aria-label</code>; o nome só vale com o
            papel.
          </li>
          <li>
            <strong>Não é modal:</strong> o resto da página continua acessível. Quando a tarefa
            exige atenção total, use Modal.
          </li>
          <li>
            <strong>O consumidor deve garantir:</strong> nada essencial só no painel; o conteúdo
            deve caber sem rolagem (mantenha curto).
          </li>
        </ul>
      </Section>
    </>
  );
}
