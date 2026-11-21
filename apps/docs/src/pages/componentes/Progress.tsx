import { Alert } from '@efds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import Basico from '../../examples/progress/basico';
import basicoHtml from '../../examples/progress/basico.html?raw';
import basicoSource from '../../examples/progress/basico.tsx?raw';

export default function ProgressPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Barra de progresso para trabalho em andamento: importação, envio, processamento. Usa o
        elemento nativo <code>&lt;progress&gt;</code>, estilizado pelo core; o valor aparece também
        em texto.
      </p>

      <UseCases
        use={[
          'Para operações com início e fim conhecidos (porcentagem) ou de duração desconhecida (indeterminada).',
          'Para cotas e limites (use o tom para sinalizar que está acabando).',
        ]}
        avoid={[
          'Para esperas curtas (menos de 1 segundo): use Spinner ou nada.',
          'Para bloquear a tela inteira: use o PageLoader.',
          'Para etapas de um fluxo (passo 2 de 4): use Stepper.',
        ]}
      />

      <Section title="Exemplos">
        <Example
          title="Determinada, por tom e indeterminada"
          description="O valor também aparece em texto (a cor nunca informa sozinha). Sem value a barra é indeterminada e a animação respeita prefers-reduced-motion."
          html={basicoHtml}
          react={{ Component: Basico, source: basicoSource }}
        />
      </Section>

      <Section title="HTML puro">
        <Alert variant="info" title="Só CSS">
          <p>
            Não há JavaScript no componente: atualize <code>value</code> (e o texto do valor) pelo
            seu código. Para o envio de arquivos, o FileUpload já mostra o andamento de cada
            arquivo.
          </p>
        </Alert>
      </Section>

      <Section title="API React">
        <PropsTable
          caption="Props de Progress"
          rows={[
            {
              name: 'label / aria-label',
              type: 'ReactNode / string',
              required: true,
              description:
                'Nome da barra: um rótulo visível (ligado por htmlFor) ou um aria-label. O tipo exige um dos dois.',
            },
            {
              name: 'value / max',
              type: 'number',
              default: 'max = 100',
              description: 'Sem value a barra é indeterminada. O valor é limitado entre 0 e max.',
            },
            {
              name: 'valueText',
              type: 'ReactNode | false',
              description:
                'Texto do valor ao lado do rótulo. Padrão: a porcentagem (determinada). false oculta.',
            },
            { name: 'size', type: "'sm' | 'md'", default: "'md'", description: 'Espessura.' },
            {
              name: 'tone',
              type: "'info' | 'success' | 'warning' | 'danger'",
              description: 'Tom semântico; o padrão é a cor de ação.',
            },
          ]}
        />
      </Section>

      <Section title="Classes CSS">
        <ClassTable
          caption="Classes e atributos do Progress"
          rows={[
            { name: '.eds-progress', effect: 'O <progress> nativo estilizado.' },
            { name: '.eds-progress-sm', effect: 'Barra mais fina.' },
            {
              name: '[data-tone]',
              effect: 'info, success, warning ou danger: cor do preenchimento.',
            },
            {
              name: '.eds-progress-field',
              effect: 'Envoltório opcional: cabeçalho (rótulo e valor) mais a barra.',
            },
            { name: '.eds-progress-header', effect: 'Linha do rótulo e do valor.' },
            {
              name: '.eds-progress-label / .eds-progress-value',
              effect: 'Rótulo e valor em texto.',
            },
          ]}
        />
      </Section>

      <Section title="Acessibilidade">
        <ul className="docs-list">
          <li>
            <strong>Semântica:</strong> o elemento nativo tem papel <code>progressbar</code>, com
            valor e máximo expostos; o rótulo vem de <code>label</code> ou de{' '}
            <code>aria-label</code>.
          </li>
          <li>
            <strong>Cor nunca sozinha:</strong> o valor em texto acompanha a barra; o tom só
            reforça.
          </li>
          <li>
            <strong>Movimento:</strong> a animação da barra indeterminada é desligada com{' '}
            <code>prefers-reduced-motion</code>.
          </li>
          <li>
            <strong>O consumidor deve garantir:</strong> avisar a conclusão (por exemplo com um
            Toast) em vez de depender de o usuário olhar a barra.
          </li>
        </ul>
      </Section>
    </>
  );
}
