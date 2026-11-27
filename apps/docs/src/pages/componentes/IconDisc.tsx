import { Alert } from '@efds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import Basico from '../../examples/icon-disc/basico';
import basicoHtml from '../../examples/icon-disc/basico.html?raw';
import basicoSource from '../../examples/icon-disc/basico.tsx?raw';

export default function IconDiscPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Disco com um ícone dentro, em um tom suave. É só enfeite: dá identidade a um título de
        página, a um indicador ou a um item de lista, sempre ao lado de um texto que diz o que é.
      </p>

      <UseCases
        use={[
          'Ao lado do título de uma página ou de um cartão, para reforçar o assunto.',
          'Em listas e indicadores, para separar tipos de item por tom (com o texto dizendo o tipo).',
        ]}
        avoid={[
          'Como único portador do significado: o disco é decorativo (aria-hidden).',
          'Como botão: para ações use Button com iconOnly.',
        ]}
      />

      <Section title="Exemplos">
        <Example
          title="Tons, tamanhos e título de página"
          description="Tons accent (padrão), neutral, info, success, warning e danger; tamanhos sm, md e lg; round deixa o disco circular. No título de página o texto vai num <span>."
          html={basicoHtml}
          react={{ Component: Basico, source: basicoSource }}
        />
      </Section>

      <Section title="HTML puro">
        <Alert variant="info" title="Só CSS">
          <p>
            Um <code>span.eds-icon-disc</code> com o{' '}
            <code>&lt;svg aria-hidden=&quot;true&quot;&gt;</code> dentro. O tom vem de{' '}
            <code>data-tone</code>.
          </p>
        </Alert>
      </Section>

      <Section title="API React">
        <PropsTable
          caption="Props de IconDisc"
          rows={[
            {
              name: 'children',
              type: 'ReactNode',
              required: true,
              description: 'O ícone (um svg).',
            },
            {
              name: 'tone',
              type: "'accent' | 'neutral' | 'info' | 'success' | 'warning' | 'danger'",
              default: "'accent'",
              description: 'Tom (data-tone).',
            },
            { name: 'size', type: "'sm' | 'md' | 'lg'", default: "'md'", description: 'Tamanho.' },
            { name: 'round', type: 'boolean', default: 'false', description: 'Disco circular.' },
          ]}
        />
      </Section>

      <Section title="Classes CSS">
        <ClassTable
          caption="Classes do disco de ícone"
          rows={[
            { name: '.eds-icon-disc', effect: 'O disco; tom por data-tone.' },
            { name: '.eds-icon-disc-sm / -lg', effect: 'Tamanhos.' },
            { name: '.eds-icon-disc-round', effect: 'Circular.' },
          ]}
        />
      </Section>

      <Section title="Acessibilidade">
        <ul className="docs-list">
          <li>
            <strong>Decorativo:</strong> <code>aria-hidden</code>; leitores de tela o ignoram.
          </li>
          <li>
            <strong>Cor nunca sozinha:</strong> o tom reforça; o significado vai no texto ao lado.
          </li>
        </ul>
      </Section>
    </>
  );
}
