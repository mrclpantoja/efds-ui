import { ClassTable } from '../../components/ClassTable';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import Basico from '../../examples/segmented/basico';
import basicoHtml from '../../examples/segmented/basico.html?raw';
import basicoSource from '../../examples/segmented/basico.tsx?raw';
import Desabilitado from '../../examples/segmented/desabilitado';
import desabilitadoHtml from '../../examples/segmented/desabilitado.html?raw';
import desabilitadoSource from '../../examples/segmented/desabilitado.tsx?raw';
import Icones from '../../examples/segmented/icones';
import iconesHtml from '../../examples/segmented/icones.html?raw';
import iconesSource from '../../examples/segmented/icones.tsx?raw';
import Tamanhos from '../../examples/segmented/tamanhos';
import tamanhosHtml from '../../examples/segmented/tamanhos.html?raw';
import tamanhosSource from '../../examples/segmented/tamanhos.tsx?raw';

export default function SegmentedPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Escolha única entre poucas opções, em faixa: Dia, Semana, Mês. São rádios nativos, então as
        setas, o Tab em grupo e o envio no formulário são do navegador, sem JS.
      </p>

      <UseCases
        use={[
          'Para trocar a visão ou o recorte de uma tela (período, lista ou grade, situação).',
          'Com 2 a 4 opções curtas, que cabem lado a lado.',
        ]}
        avoid={[
          'Para 5 opções ou mais, ou textos longos: use Select ou Tabs.',
          'Para navegar entre páginas ou painéis de conteúdo: use Tabs.',
          'Para várias escolhas ao mesmo tempo: use Checkbox ou MultiSelect.',
        ]}
      />

      <Section title="Exemplos">
        <Example
          title="Básico"
          description="Selecionada: fundo de ação, texto sobre a ação e peso semibold (não só cor). A legenda é o nome do grupo."
          html={basicoHtml}
          react={{ Component: Basico, source: basicoSource }}
        />
        <Example
          title="Tamanhos"
          description="Padrão e sm; fill ocupa a largura toda, com segmentos iguais."
          html={tamanhosHtml}
          react={{ Component: Tamanhos, source: tamanhosSource }}
        />
        <Example
          title="Com ícones"
          description="Ícone antes do texto. Só o ícone: o texto vai em texto oculto e é o nome do rádio."
          html={iconesHtml}
          react={{ Component: Icones, source: iconesSource }}
        />
        <Example
          title="Desabilitado"
          description="Uma opção (disabled no rádio) ou o grupo todo (fieldset disabled)."
          html={desabilitadoHtml}
          react={{ Component: Desabilitado, source: desabilitadoSource }}
        />
      </Section>

      <Section title="API React">
        <PropsTable
          caption="Props de SegmentedControl"
          rows={[
            {
              name: 'legend',
              type: 'ReactNode',
              required: true,
              description: 'Nome do grupo (a legend).',
            },
            {
              name: 'hideLegend',
              type: 'boolean',
              default: 'false',
              description: 'Esconde a legenda visualmente; ela segue lida.',
            },
            {
              name: 'options',
              type: '{ value, label, icon?, iconOnly?, disabled? }[]',
              required: true,
              description: 'As opções.',
            },
            { name: 'value / defaultValue', type: 'string', description: 'Controlado ou inicial.' },
            {
              name: 'onChange',
              type: '(value: string) => void',
              description: 'Escolha de uma opção.',
            },
            {
              name: 'name',
              type: 'string',
              description: 'Nome dos rádios (envio em formulário). Padrão: gerado.',
            },
            { name: 'size', type: "'sm' | 'md'", default: "'md'", description: 'Altura.' },
            { name: 'fill', type: 'boolean', default: 'false', description: 'Largura toda.' },
          ]}
        />
      </Section>

      <Section title="Classes CSS">
        <ClassTable
          caption="Classes do SegmentedControl"
          rows={[
            {
              name: 'fieldset.eds-segmented',
              effect: 'A faixa; filhos: legend e label > input[type=radio].',
            },
            { name: '.eds-segmented-sm', effect: 'Altura pequena.' },
            { name: '.eds-segmented-fill', effect: 'Segmentos iguais, largura toda.' },
          ]}
        />
      </Section>

      <Section title="Acessibilidade">
        <ul className="docs-list">
          <li>
            <strong>Teclado:</strong> Tab entra no grupo, as setas movem e marcam (comportamento
            nativo dos rádios).
          </li>
          <li>
            <strong>Foco:</strong> o rádio é transparente sobre o segmento inteiro; o anel aparece
            no segmento.
          </li>
          <li>
            <strong>Cor nunca sozinha:</strong> a opção marcada muda de peso além do fundo.
          </li>
        </ul>
      </Section>
    </>
  );
}
