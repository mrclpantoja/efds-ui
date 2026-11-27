import { Alert } from '@efds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import Agrupada from '../../examples/timeline/agrupada';
import agrupadaHtml from '../../examples/timeline/agrupada.html?raw';
import agrupadaSource from '../../examples/timeline/agrupada.tsx?raw';
import Horizontal from '../../examples/timeline/horizontal';
import horizontalHtml from '../../examples/timeline/horizontal.html?raw';
import horizontalSource from '../../examples/timeline/horizontal.tsx?raw';
import Basico from '../../examples/timeline/basico';
import basicoHtml from '../../examples/timeline/basico.html?raw';
import basicoSource from '../../examples/timeline/basico.tsx?raw';

export default function TimelinePage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Histórico de eventos em ordem: o que aconteceu, quando e quem fez. Uma lista ordenada com
        marcador, hora e texto.
      </p>

      <UseCases
        use={[
          'Para o histórico de um pedido, processo ou cadastro (auditoria visível ao usuário).',
          'Para atividade recente, agrupada por dia.',
        ]}
        avoid={[
          'Para etapas de um fluxo que o usuário percorre: use Stepper.',
          'Para muitos eventos (centenas): pagine ou carregue por partes.',
        ]}
      />

      <Section title="Exemplos">
        <Example
          title="Histórico com tom, ícone e ator"
          description="O marcador é decorativo; o tom reforça. O título e a hora dizem o que houve."
          html={basicoHtml}
          react={{ Component: Basico, source: basicoSource }}
        />
        <Example
          title="Agrupada por dia, compacta"
          description="Cada grupo tem um cabeçalho e a sua própria lista."
          html={agrupadaHtml}
          react={{ Component: Agrupada, source: agrupadaSource }}
        />
        <Example
          title="Horizontal, com andamento"
          description="Itens lado a lado, com o fio entre os marcadores; rola no próprio contêiner e, abaixo de 30rem, volta a ser vertical. data-state (done, current, upcoming) mostra visto, anel ou tracejado e o estado vai também em texto oculto. Com muitos itens, a lista recebe tabindex e nome para rolar pelo teclado (o React já faz isso)."
          html={horizontalHtml}
          react={{ Component: Horizontal, source: horizontalSource }}
        />
      </Section>

      <Section title="HTML puro">
        <Alert tone="info" title="Só CSS">
          <p>
            Não há JavaScript. A ordem (recente primeiro ou o inverso) é a do seu HTML. Use{' '}
            <code>&lt;time datetime&gt;</code> para a data legível por máquina. Marcador sem filho
            vira um ponto.
          </p>
        </Alert>
      </Section>

      <Section title="API React">
        <PropsTable
          caption="Props de Timeline"
          rows={[
            {
              name: 'items',
              type: 'TimelineItem[]',
              description:
                'id, title, time, dateTime, text, actor, tone, icon, state (done, current, upcoming).',
            },
            {
              name: 'groups',
              type: '{ title, items, id? }[]',
              description: 'No lugar de items: agrupa, com um cabeçalho por grupo.',
            },
            { name: 'compact', type: 'boolean', description: 'Variante compacta.' },
            {
              name: 'orientation',
              type: "'vertical' | 'horizontal'",
              default: "'vertical'",
              description:
                'Horizontal: itens lado a lado. O <ol> ganha tabIndex 0 e aria-label (texts.label ou o seu) para rolar pelo teclado.',
            },
            {
              name: 'narrow',
              type: "'stack' | 'scroll'",
              default: "'stack'",
              description:
                'Só na horizontal: em largura estreita, stack volta a ser vertical e scroll mantém a linha e rola.',
            },
            {
              name: 'texts',
              type: 'Partial<TimelineTexts>',
              description: 'label: nome da lista horizontal quando não há aria-label.',
            },
            {
              name: 'headingLevel',
              type: '2 | 3 | 4 | 5 | 6',
              default: '3',
              description: 'Nível dos cabeçalhos dos grupos.',
            },
          ]}
        />
      </Section>

      <Section title="Classes CSS">
        <ClassTable
          caption="Classes da Timeline"
          rows={[
            { name: '.eds-timeline', effect: 'A lista ordenada.' },
            { name: '.eds-timeline-compact', effect: 'Menos respiro.' },
            {
              name: '.eds-timeline-horizontal',
              effect: 'Itens lado a lado; rola no contêiner e vira vertical em largura estreita.',
            },
            {
              name: '.eds-timeline-scroll',
              effect:
                'Com a horizontal: mantém a linha em largura estreita e rola (parcelas, meses).',
            },
            {
              name: '.eds-timeline-item[data-state]',
              effect: 'done, current ou upcoming: visto, anel ou tracejado (também na vertical).',
            },
            {
              name: '.eds-timeline-item-accent / -info / -success / -warning / -danger',
              effect: 'Tom do evento (neutral é o padrão).',
            },
            { name: '.eds-timeline-marker', effect: 'Ponto ou ícone (aria-hidden).' },
            {
              name: '.eds-timeline-content / -header',
              effect: 'Corpo e linha do título com a hora.',
            },
            {
              name: '.eds-timeline-title / -time / -text / -actor',
              effect: 'Título, hora, texto e autor.',
            },
            {
              name: '.eds-timeline-groups / -group / -group-title',
              effect: 'Agrupamento com cabeçalho.',
            },
          ]}
        />
      </Section>

      <Section title="Acessibilidade">
        <ul className="docs-list">
          <li>
            <strong>Semântica:</strong> lista ordenada (<code>ol</code>), com <code>time</code> para
            datas; os leitores anunciam &quot;lista com N itens&quot;.
          </li>
          <li>
            <strong>Cor nunca sozinha:</strong> o marcador é decorativo; o título e o texto dizem o
            que aconteceu.
          </li>
          <li>
            <strong>O consumidor deve garantir:</strong> um <code>aria-label</code> na lista quando
            o contexto não a nomear, e o cabeçalho de cada grupo no nível certo da página.
          </li>
        </ul>
      </Section>
    </>
  );
}
